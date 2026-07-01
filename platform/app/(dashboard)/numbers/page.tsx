import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NumberList } from '@/components/dashboard/numbers/NumberList'
import { VirtualNumber } from '@/types'

export default async function NumbersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: numbers } = await supabase
    .from('virtual_numbers')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Virtual Numbers</h1>
      <NumberList numbers={(numbers ?? []) as VirtualNumber[]} />
    </div>
  )
}
