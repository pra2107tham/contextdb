const CLAUDE_CONNECTOR_URL =
  process.env.NEXT_PUBLIC_MCP_SSE_URL || 'https://contextdb-production.up.railway.app/mcp'
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'https://contextdb-web.vercel.app'

export default function ConnectDocsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 pb-16 pt-10">
      <section>
        <h1 className="text-2xl font-semibold">Connect ContextDB to Claude</h1>
        <p className="mt-3 text-sm text-gray-700">
          This guide shows you how to add ContextDB as a custom connector in Claude so you can save
          and load contexts directly from your chats.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Prerequisites</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>An active Claude account.</li>
          <li>
            A ContextDB account (sign up at{' '}
            <a href={WEB_URL} className="text-sm font-medium text-black underline underline-offset-4">
              {WEB_URL}
            </a>
            ).
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Step 1 – Sign in to ContextDB</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
          <li>
            Go to{' '}
            <a href={WEB_URL} className="font-medium text-black underline underline-offset-4">
              {WEB_URL}
            </a>
            .
          </li>
          <li>Create an account or log in with an existing one.</li>
          <li>Keep this tab open – you&apos;ll use it to inspect contexts later.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Step 2 – Add a custom connector in Claude</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
          <li>Open Claude in your browser.</li>
          <li>Go to Settings → Connectors (or the custom connectors section).</li>
          <li>Choose the option to add a custom MCP connector.</li>
          <li>
            When asked for the MCP server URL, enter:
            <div className="mt-2 rounded-md bg-gray-100 px-3 py-2 text-xs font-mono">
              {CLAUDE_CONNECTOR_URL}
            </div>
            <p className="mt-1 text-xs text-gray-600">
              Note: Use the <code className="rounded bg-gray-100 px-1 py-0.5">/mcp</code> endpoint
              (not <code className="rounded bg-gray-100 px-1 py-0.5">/sse</code>) for better
              compatibility with Claude.
            </p>
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Step 3 – Complete the OAuth flow</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
          <li>Claude will redirect you to Auth0 (contextdb.us.auth0.com).</li>
          <li>Log in with the same email you used for ContextDB.</li>
          <li>Approve the requested permissions so Claude can access your contexts.</li>
          <li>
            When the flow completes, you should see ContextDB listed as a connected tool in Claude.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Step 4 – Use ContextDB inside Claude</h2>
        <p className="mt-3 text-sm text-gray-700">
          Once connected, you can start using ContextDB in any Claude conversation. Some example
          prompts:
        </p>
        <ul className="mt-3 space-y-2 rounded-md bg-gray-50 p-3 text-xs font-mono text-gray-800">
          <li>
            <span className="font-semibold">Create a context:</span> “Create a context called
            `SaaS Launch` with background about my product and target users.”
          </li>
          <li>
            <span className="font-semibold">List contexts:</span> “What contexts do I have saved in
            ContextDB?”
          </li>
          <li>
            <span className="font-semibold">Load a context:</span> “Load the `SaaS Launch` context
            and use it for this conversation.”
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Troubleshooting</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>
            If Claude cannot connect, double-check that the MCP server is running and reachable at{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
              {CLAUDE_CONNECTOR_URL}
            </code>
            .
          </li>
          <li>
            If you see authentication errors, try disconnecting and reconnecting the ContextDB
            connector in Claude.
          </li>
        </ul>
      </section>
    </main>
  )
}


