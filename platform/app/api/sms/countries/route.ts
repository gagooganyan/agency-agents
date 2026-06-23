import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCountries } from '@/lib/providers/fivesim'
import type { ApiResponse } from '@/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Unauthorized' }, { status: 401 })

  const countries = await getCountries()
  const list = Object.entries(countries).map(([key, v]) => ({
    key,
    name: v.name,
    iso: v.iso,
    prefix: v.prefix,
  }))

  return NextResponse.json<ApiResponse<typeof list>>({ data: list, error: null })
}
