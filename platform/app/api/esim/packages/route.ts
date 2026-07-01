import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPackages, AiraloPackage } from '@/lib/providers/airalo'
import { ApiResponse } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const country = req.nextUrl.searchParams.get('country') ?? undefined

  try {
    const packages = await getPackages(country)
    const priced = packages.map(p => ({ ...p, price: Math.ceil(p.price * 1.35 * 100) }))
    return NextResponse.json({ data: priced, error: null } satisfies ApiResponse<(AiraloPackage & { price: number })[]>)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: message } satisfies ApiResponse<never>, { status: 500 })
  }
}
