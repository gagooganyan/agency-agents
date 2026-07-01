import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SmsCodeDisplay from '@/components/sms/SmsCodeDisplay'

export default async function SimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: sim } = await supabase
    .from('sims')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!sim) notFound()

  return <SmsCodeDisplay initialSim={sim} />
}
