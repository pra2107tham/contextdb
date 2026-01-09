import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}

