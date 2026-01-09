import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function NavBar() {
  const session = await getSession().catch(() => null)
  const user = session?.user

  async function handleLogout() {
    'use server'
    redirect('/api/auth/signout')
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-base font-semibold">
            ContextDB
          </Link>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/docs" className="text-gray-700 hover:text-black">
            Docs
          </Link>
          <Link href="/docs/connect" className="text-gray-700 hover:text-black">
            Connect Claude
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-gray-700 hover:text-black">
                Dashboard
              </Link>
              <form action={handleLogout}>
                <button
                  type="submit"
                  className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
                >
                  Logout
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-700 hover:text-black">
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white hover:bg-gray-900"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}


