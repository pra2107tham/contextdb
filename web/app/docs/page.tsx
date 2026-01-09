export default function DocsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 pb-16 pt-10">
      <section>
        <h1 className="text-2xl font-semibold">What is ContextDB?</h1>
        <p className="mt-3 text-sm text-gray-700">
          ContextDB is a small companion service for Claude. It gives you a durable place to store
          long-lived project context – background, assumptions, decisions, and open items – so you
          can load that context into any new conversation without rewriting it.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Why do I need it?</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>
            Long Claude chats eventually hit token limits or drift away from the original problem.
          </li>
          <li>
            Re-explaining the same project background across multiple chats is slow and error-prone.
          </li>
          <li>
            Important decisions and constraints are easy to lose as conversations branch and reset.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">How it works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
          <li>
            You connect ContextDB to Claude as a custom connector (via the MCP server running on
            Railway).
          </li>
          <li>
            In a Claude chat, you ask it to create a context for your project. Claude calls
            ContextDB tools under the hood to store the structured context.
          </li>
          <li>
            In future chats, you ask Claude to load that context by name. Claude fetches it from
            ContextDB and uses it as grounding for the new conversation.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold">What gets stored?</h2>
        <p className="mt-3 text-sm text-gray-700">
          Each context is a structured JSON document with fields like:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>
            <span className="font-medium">background</span> – high-level description of the project
          </li>
          <li>
            <span className="font-medium">assumptions</span> – bullets of things Claude should treat
            as true
          </li>
          <li>
            <span className="font-medium">decisions</span> – key decisions already made
          </li>
          <li>
            <span className="font-medium">open_items</span> – questions or tasks still unresolved
          </li>
          <li>
            <span className="font-medium">notes</span> – any extra free-form notes
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Security & isolation</h2>
        <p className="mt-3 text-sm text-gray-700">
          ContextDB is backed by Supabase (PostgreSQL) with row-level security. Each context is
          associated with a single user, and MCP tool calls are authenticated via Auth0 so Claude
          can only see contexts that belong to your account.
        </p>
      </section>
    </main>
  )
}


