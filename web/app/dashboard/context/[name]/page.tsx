import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabaseServer'

type Params = {
  name: string
}

async function deleteContext(userId: string, name: string) {
  'use server'

  const { error } = await supabaseServer
    .from('contexts')
    .delete()
    .eq('user_id', userId)
    .eq('name', name)

  if (error) {
    console.error(error)
    // We could surface an error via redirect search params if needed.
  }

  redirect('/dashboard')
}

export default async function ContextDetailPage({ params }: { params: Params }) {
  const session = await getSession()
  if (!session?.user || !(session.user as any).id) {
    redirect('/login?error=unauthorized')
  }

  const userId = (session.user as any).id as string
  const decodedName = decodeURIComponent(params.name)

  const { data: ctx, error } = await supabaseServer
    .from('contexts')
    .select('id, name, summary, tags, version, created_at, updated_at, content')
    .eq('user_id', userId)
    .eq('name', decodedName)
    .maybeSingle()

  if (error) {
    console.error(error)
  }

  if (!ctx) {
    notFound()
  }

  const content = (ctx as any).content || {}

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-16 pt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-xs text-gray-600 hover:text-black">
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 text-xl font-semibold">{ctx.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
            <span>Version v{ctx.version}</span>
            {ctx.created_at && (
              <span>
                Created:{' '}
                {new Date(ctx.created_at as string).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            )}
            {ctx.updated_at && (
              <span>
                Updated:{' '}
                {new Date(ctx.updated_at as string).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            )}
          </div>
        </div>
        <form action={deleteContext.bind(null, userId, ctx.name)}>
          <button
            type="submit"
            className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Delete context
          </button>
        </form>
      </div>

      {ctx.summary && (
        <section className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
          <h2 className="text-sm font-semibold">Summary</h2>
          <p className="mt-1 text-xs text-gray-800">{ctx.summary}</p>
        </section>
      )}

      {Array.isArray(ctx.tags) && ctx.tags.length > 0 && (
        <section className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
          <h2 className="text-sm font-semibold">Tags</h2>
          <div className="mt-2 flex flex-wrap gap-1">
            {ctx.tags.map((t: string) => (
              <span
                key={t}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-2">
        {content.background && (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <h2 className="text-sm font-semibold">Background</h2>
            <p className="mt-1 text-xs whitespace-pre-wrap text-gray-800">
              {content.background}
            </p>
          </div>
        )}

        {Array.isArray(content.assumptions) && content.assumptions.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <h2 className="text-sm font-semibold">Assumptions</h2>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-gray-800">
              {content.assumptions.map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(content.decisions) && content.decisions.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <h2 className="text-sm font-semibold">Decisions</h2>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-gray-800">
              {content.decisions.map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(content.open_items) && content.open_items.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <h2 className="text-sm font-semibold">Open items</h2>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-gray-800">
              {content.open_items.map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {content.notes && (
          <div className="rounded-lg border border-gray-200 bg-white p-3 md:col-span-2">
            <h2 className="text-sm font-semibold">Notes</h2>
            <p className="mt-1 text-xs whitespace-pre-wrap text-gray-800">{content.notes}</p>
          </div>
        )}
      </section>
    </main>
  )
}


