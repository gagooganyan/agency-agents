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

  const { data: transactions } = await serviceSupabase
    .from('transactions')
    .select('id, user_id, type, amount_cents, currency, status, provider, payment_method, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  return NextResponse.json({ data: transactions, error: null })
}
