import type { Metadata } from 'next'
import './globals.css'
import { NavBar } from '@/components/NavBar'

export const metadata: Metadata = {
  title: 'ContextDB - Context Checkpointing for Claude',
  description: 'Save and load contexts for your Claude conversations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        {/* @ts-expect-error Async Server Component */}
        <NavBar />
        {children}
      </body>
    </html>
  )
}

