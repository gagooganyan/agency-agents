import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApiResponse, BundlePurchase } from '@/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const { data, error } = await supabase
    .from('bundle_purchases')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ data: null, error: error.message } satisfies ApiResponse<never>, { status: 500 })

  return NextResponse.json({ data: (data ?? []) as BundlePurchase[], error: null } satisfies ApiResponse<BundlePurchase[]>)
}
