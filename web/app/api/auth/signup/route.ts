import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)

  if (!body || !body.email || !body.password) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const email = String(body.email).toLowerCase().trim()
  const name = body.name ? String(body.name).trim() : null
  const password = String(body.password)

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Email and password (min 8 chars) are required' },
      { status: 400 },
    )
  }

  const passwordHash = await hash(password, 10)

  // Check if user already exists
  const { data: existing, error: existingError } = await supabaseServer
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingError) {
    console.error(existingError)
    return NextResponse.json({ error: 'Failed to check user' }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('users').insert({
    email,
    name,
    password_hash: passwordHash,
  })

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}


