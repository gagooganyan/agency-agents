import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchNumbers, AvailableNumber } from '@/lib/providers/twilio'
import { ApiResponse } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const country = req.nextUrl.searchParams.get('country') ?? 'US'
  const areaCode = req.nextUrl.searchParams.get('area_code') ?? undefined

  try {
    const numbers = await searchNumbers(country, areaCode)
    return NextResponse.json({ data: numbers, error: null } satisfies ApiResponse<AvailableNumber[]>)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: message } satisfies ApiResponse<never>, { status: 500 })
  }
}
