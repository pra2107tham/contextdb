import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabaseServer'

type SearchParams = {
  q?: string
  tag?: string
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getSession()
  if (!session?.user || !(session.user as any).id) {
    redirect('/login?error=unauthorized')
  }

  const userId = (session.user as any).id as string
  const q = (searchParams.q || '').trim()
  const tag = (searchParams.tag || '').trim()

  let query = supabaseServer
    .from('contexts')
    .select('id, name, summary, tags, version, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (q) {
    query = query.ilike('name', `%${q}%`)
  }

  if (tag) {
    query = query.contains('tags', [tag])
  }

  const { data: contexts, error } = await query

  if (error) {
    console.error(error)
  }

  const allTags =
    contexts
      ?.flatMap((c) => c.tags || [])
      .filter((value, index, arr) => arr.indexOf(value) === index) ?? []

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-16 pt-8">
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Your contexts</h1>
          <p className="mt-1 text-xs text-gray-600">
            These contexts are created and updated via the ContextDB MCP tools inside Claude.
          </p>
        </div>
      </div>

      <form className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm sm:flex-row sm:items-center">
        <input
          name="q"
          placeholder="Search by name..."
          defaultValue={q}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
        <select
          name="tag"
          defaultValue={tag}
          className="rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-xs font-medium text-white hover:bg-gray-900"
        >
          Filter
        </button>
      </form>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          Failed to load contexts. Please try again.
        </div>
      )}

      {!error && (!contexts || contexts.length === 0) && (
        <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-700">
          <p className="font-medium">No contexts yet.</p>
          <p className="mt-1 text-xs text-gray-600">
            Connect ContextDB as a custom connector in Claude and ask it to create a context for
            your project. New contexts will appear here automatically.
          </p>
        </div>
      )}

      {contexts && contexts.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {contexts.map((ctx) => (
            <a
              key={ctx.id}
              href={`/dashboard/context/${encodeURIComponent(ctx.name)}`}
              className="block rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm hover:border-black"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate text-sm font-semibold">{ctx.name}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                  v{ctx.version}
                </span>
              </div>
              {ctx.summary && (
                <p className="mt-1 line-clamp-2 text-xs text-gray-700">{ctx.summary}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {Array.isArray(ctx.tags) &&
                  ctx.tags.map((t: string) => (
                    <span
                      key={t}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
                    >
                      {t}
                    </span>
                  ))}
                <span className="ml-auto text-[10px] text-gray-500">
                  {ctx.updated_at
                    ? new Date(ctx.updated_at as string).toLocaleDateString()
                    : ''}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  )
}


