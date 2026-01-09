import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import * as z from 'zod'
import { supabase } from './db/client'

type GetUserIdForSession = (sessionId?: string) => string | undefined

export function createContextDbServer(getUserIdForSession: GetUserIdForSession) {
  const server = new McpServer(
    {
      name: 'ContextDB',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        logging: {},
      },
    },
  )

  const contextContentSchema = z.object({
    background: z.string().optional(),
    assumptions: z.array(z.string()).optional(),
    decisions: z.array(z.string()).optional(),
    open_items: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })

  // Helper to resolve user id from session
  function requireUserId(extra: { sessionId?: string }) {
    const userId = getUserIdForSession(extra.sessionId)
    if (!userId) {
      throw new Error('Unauthorized: missing user id for session')
    }
    return userId
  }

  // create_context
  server.registerTool(
    'create_context',
    {
      title: 'Create context',
      description: 'Create a new named context for this user',
      inputSchema: z.object({
        name: z.string().min(1),
        summary: z.string().optional(),
        tags: z.array(z.string()).optional(),
        content: contextContentSchema,
      }),
    },
    async (args: any, extra: any) => {
      const userId = requireUserId(extra)
      const { name, summary, tags, content } = args

      const startTime = Date.now()

      const { data: existing, error: existingError } = await supabase
        .from('contexts')
        .select('id')
        .eq('user_id', userId)
        .eq('name', name)
        .maybeSingle()

      if (existingError) {
        console.error(existingError)
        return {
          content: [
            {
              type: 'text',
              text: `Error checking existing context: ${existingError.message}`,
            },
          ],
        }
      }

      if (existing) {
        return {
          content: [{ type: 'text', text: `Context '${name}' already exists.` }],
        }
      }

      const { error } = await supabase
        .from('contexts')
        .insert({
          user_id: userId,
          name,
          summary: summary ?? null,
          tags: tags ?? [],
          content: content ?? {},
          version: 1,
        })
        .select('id, name, version')
        .maybeSingle()

      const duration = Date.now() - startTime
      if (error) {
        console.error(error)
        return {
          content: [
            {
              type: 'text',
              text: `Failed to create context (took ${duration}ms): ${error.message}`,
            },
          ],
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Created context '${name}' (v1) in ${duration}ms`,
          },
        ],
      }
    },
  )

  // get_context
  server.registerTool(
    'get_context',
    {
      title: 'Get context',
      description: 'Load a context by name for this user',
      inputSchema: z.object({
        name: z.string().min(1),
      }),
    },
    async (args: any, extra: any) => {
      const userId = requireUserId(extra)
      const { name } = args

      const { data, error } = await supabase
        .from('contexts')
        .select('*')
        .eq('user_id', userId)
        .eq('name', name)
        .maybeSingle()

      if (error) {
        console.error(error)
        return {
          content: [{ type: 'text', text: `Failed to load context: ${error.message}` }],
        }
      }

      if (!data) {
        return {
          content: [{ type: 'text', text: `Context '${name}' not found.` }],
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      }
    },
  )

  // list_contexts
  server.registerTool(
    'list_contexts',
    {
      title: 'List contexts',
      description: 'List all contexts for this user, optionally filtered by tags',
      inputSchema: z
        .object({
          tags: z.array(z.string()).optional(),
        })
        .optional(),
    },
    async (args: any, extra: any) => {
      const userId = requireUserId(extra)
      const tags = args?.tags as string[] | undefined

      let query = supabase
        .from('contexts')
        .select('id, name, summary, tags, version, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (tags && tags.length > 0) {
        query = query.contains('tags', tags)
      }

      const { data, error } = await query

      if (error) {
        console.error(error)
        return {
          content: [{ type: 'text', text: `Failed to list contexts: ${error.message}` }],
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ contexts: data ?? [] }, null, 2),
          },
        ],
      }
    },
  )

  async function snapshotHistory(context: any) {
    const { error } = await supabase.from('context_history').insert({
      context_id: context.id,
      version: context.version,
      content: context.content,
    })
    if (error) {
      console.error('Failed to snapshot context history', error)
    }
  }

  // append_context
  server.registerTool(
    'append_context',
    {
      title: 'Append to context',
      description: 'Append new information to an existing context',
      inputSchema: z.object({
        name: z.string().min(1),
        content: contextContentSchema,
      }),
    },
    async (args: any, extra: any) => {
      const userId = requireUserId(extra)
      const { name, content } = args

      const { data: context, error } = await supabase
        .from('contexts')
        .select('*')
        .eq('user_id', userId)
        .eq('name', name)
        .maybeSingle()

      if (error || !context) {
        console.error(error)
        return {
          content: [{ type: 'text', text: `Context '${name}' not found.` }],
        }
      }

      await snapshotHistory(context)

      const updated = { ...(context.content || {}) }

      if (content.background) {
        updated.background = (updated.background || '') + '\n\n' + content.background
      }
      if (content.assumptions) {
        updated.assumptions = [...(updated.assumptions || []), ...content.assumptions]
      }
      if (content.decisions) {
        updated.decisions = [...(updated.decisions || []), ...content.decisions]
      }
      if (content.open_items) {
        updated.open_items = [...(updated.open_items || []), ...content.open_items]
      }
      if (content.notes) {
        updated.notes = (updated.notes || '') + '\n\n' + content.notes
      }

      const newVersion = (context.version || 1) + 1

      const { error: updateError } = await supabase
        .from('contexts')
        .update({
          content: updated,
          version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', context.id)

      if (updateError) {
        console.error(updateError)
        return {
          content: [{ type: 'text', text: `Failed to append to context: ${updateError.message}` }],
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Appended to context '${name}' (v${newVersion}).`,
          },
        ],
      }
    },
  )

  // update_context
  server.registerTool(
    'update_context',
    {
      title: 'Update context',
      description: 'Replace specified fields in an existing context',
      inputSchema: z.object({
        name: z.string().min(1),
        content: contextContentSchema,
      }),
    },
    async (args: any, extra: any) => {
      const userId = requireUserId(extra)
      const { name, content } = args

      const { data: context, error } = await supabase
        .from('contexts')
        .select('*')
        .eq('user_id', userId)
        .eq('name', name)
        .maybeSingle()

      if (error || !context) {
        console.error(error)
        return {
          content: [{ type: 'text', text: `Context '${name}' not found.` }],
        }
      }

      await snapshotHistory(context)

      const updated = { ...(context.content || {}), ...(content || {}) }
      const newVersion = (context.version || 1) + 1

      const { error: updateError } = await supabase
        .from('contexts')
        .update({
          content: updated,
          version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', context.id)

      if (updateError) {
        console.error(updateError)
        return {
          content: [{ type: 'text', text: `Failed to update context: ${updateError.message}` }],
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `Updated context '${name}' (v${newVersion}).`,
          },
        ],
      }
    },
  )

  // delete_context
  server.registerTool(
    'delete_context',
    {
      title: 'Delete context',
      description: 'Delete a context by name for this user',
      inputSchema: z.object({
        name: z.string().min(1),
      }),
    },
    async (args: any, extra: any) => {
      const userId = requireUserId(extra)
      const { name } = args

      const { error } = await supabase
        .from('contexts')
        .delete()
        .eq('user_id', userId)
        .eq('name', name)

      if (error) {
        console.error(error)
        return {
          content: [{ type: 'text', text: `Failed to delete context: ${error.message}` }],
        }
      }

      return {
        content: [{ type: 'text', text: `Deleted context '${name}'.` }],
      }
    },
  )

  // Resources: contexts as context://<name>
  server.registerResource(
    'contexts',
    'context://',
    {
      title: 'ContextDB contexts',
      description: 'Saved contexts in ContextDB',
      mimeType: 'application/json',
    },
    async (uri: URL, extra: any) => {
      const userId = requireUserId(extra)
      // Expect URIs like context://<name>
      const raw = uri.hostname || uri.pathname.replace('/', '')
      const name = decodeURIComponent(raw)

      const { data, error } = await supabase
        .from('contexts')
        .select('*')
        .eq('user_id', userId)
        .eq('name', name)
        .maybeSingle()

      if (error || !data) {
        console.error(error)
        return {
          contents: [],
        }
      }

      return {
        contents: [
          {
            uri: `context://${encodeURIComponent(name)}`,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      }
    },
  )

  return server
}


