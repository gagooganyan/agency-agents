import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CardList } from '@/components/dashboard/cards/CardList'

export default async function CardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('kyc_status').eq('id', user.id).single()
  const { data: cards } = await supabase.from('cards').select('*').order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Virtual Cards</h1>
        {profile?.kyc_status !== 'verified' && (
          <a href="/kyc" className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg">
            Verify Identity to Order
          </a>
        )}
      </div>
      <CardList cards={cards ?? []} kycVerified={profile?.kyc_status === 'verified'} />
    </div>
  )
}
