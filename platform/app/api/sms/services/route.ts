import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServices } from '@/lib/providers/fivesim'
import type { ApiResponse } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Unauthorized' }, { status: 401 })

  const country = req.nextUrl.searchParams.get('country')
  if (!country) return NextResponse.json<ApiResponse<null>>({ data: null, error: 'country required' }, { status: 400 })

  const raw = await getServices(country)
  // Apply 100% markup: multiply price by 2
  const MARKUP = 2
  const services = Object.entries(raw).map(([key, v]) => ({
    key,
    count: v.Count,
    price_cents: Math.ceil(v.Price * MARKUP * 100),
  }))

  return NextResponse.json<ApiResponse<typeof services>>({ data: services, error: null })
}
