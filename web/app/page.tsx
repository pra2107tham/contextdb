import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-16 px-4 pb-16 pt-12">
      <section className="mt-6 grid gap-10 md:grid-cols-[3fr,2fr] md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            Context Checkpointing for Claude
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
            Save your best prompts.
            <br />
            Resume any conversation instantly.
          </h1>
          <p className="mt-4 max-w-xl text-sm text-gray-700">
            ContextDB lets you checkpoint important project context for Claude. Instead of
            rewriting background, assumptions, and decisions in every new chat, save them once and
            load them on demand.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
            >
              Get started free
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-gray-800 underline underline-offset-4"
            >
              Read the docs
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Works alongside Claude on the web. No browser extensions or plugins required.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            How it works
          </p>
          <ol className="mt-3 space-y-3 text-sm text-gray-800">
            <li>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white">
                1
              </span>
              Connect ContextDB as a custom connector to Claude.
            </li>
            <li>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white">
                2
              </span>
              Ask Claude to create a context for your project or workflow.
            </li>
            <li>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white">
                3
              </span>
              Load that context into any future conversation with a single request.
            </li>
          </ol>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Stop repeating yourself</h2>
          <p className="mt-2 text-xs text-gray-700">
            Capture background, assumptions, and constraints once. ContextDB keeps them versioned
            so you&apos;re not rewriting the same prompt over and over.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Stay within token limits</h2>
          <p className="mt-2 text-xs text-gray-700">
            Instead of carrying full history into every chat, load only the pieces of context Claude
            actually needs for the current task.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Own your project memory</h2>
          <p className="mt-2 text-xs text-gray-700">
            All contexts are stored in your own database, isolated per user. You can inspect,
            search, and delete them anytime.
          </p>
        </div>
      </section>
    </main>
  )
}


