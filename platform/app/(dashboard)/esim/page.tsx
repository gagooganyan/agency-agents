import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EsimPackageList } from '@/components/dashboard/esim/EsimPackageList'
import { Esim } from '@/types'

export default async function EsimPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: esims } = await supabase
    .from('esims')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">eSIM</h1>
      <EsimPackageList existingEsims={(esims ?? []) as Esim[]} />
    </div>
  )
}
