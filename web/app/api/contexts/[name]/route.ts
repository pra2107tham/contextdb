import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabaseServer'

type Params = {
  name: string
}

export async function GET(_req: Request, { params }: { params: Params }) {
  const session = await getSession()
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  const decodedName = decodeURIComponent(params.name)

  const { data, error } = await supabaseServer
    .from('contexts')
    .select('id, name, summary, tags, version, created_at, updated_at, content')
    .eq('user_id', userId)
    .eq('name', decodedName)
    .maybeSingle()

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to load context' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ context: data })
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const session = await getSession()
  if (!session?.user || !(session.user as any).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  const decodedName = decodeURIComponent(params.name)

  const { error } = await supabaseServer
    .from('contexts')
    .delete()
    .eq('user_id', userId)
    .eq('name', decodedName)

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete context' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}


