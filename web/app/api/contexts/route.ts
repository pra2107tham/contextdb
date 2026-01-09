import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabaseServer'

export async function GET() {
  const session = await getSession()
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id as string

  const { data, error } = await supabaseServer
    .from('contexts')
    .select('id, name, summary, tags, version, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load contexts' }, { status: 500 })
  }

  return NextResponse.json({ contexts: data ?? [] })
}


