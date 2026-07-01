import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceSupabase = await createServiceClient()
  const { data: userData } = await serviceSupabase
    .from('users').select('is_admin').eq('id', user.id).single()
  if (!userData?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: users } = await serviceSupabase
    .from('users')
    .select('id, email, name, balance_cents, kyc_status, created_at, is_admin')
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json({ data: users, error: null })
}
