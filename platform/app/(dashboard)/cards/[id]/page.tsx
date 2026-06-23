import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CardDetail } from '@/components/dashboard/cards/CardDetail'

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: card } = await supabase.from('cards').select('*').eq('id', id).single()
  if (!card) notFound()

  return (
    <div className="p-8 max-w-2xl">
      <a href="/cards" className="text-white/40 text-sm mb-6 inline-block hover:text-white">← Back to Cards</a>
      <CardDetail card={card} />
    </div>
  )
}
