import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { QrCodeDisplay } from '@/components/dashboard/esim/QrCodeDisplay'
import { Esim } from '@/types'

export default async function EsimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: esim } = await supabase
    .from('esims')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!esim) notFound()

  const typed = esim as Esim

  return (
    <div className="p-8 max-w-xl">
      <a href="/esim" className="text-white/40 text-sm mb-6 inline-block hover:text-white">← Back to eSIM</a>
      <div className="glass rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">{typed.country} eSIM</h1>
        <p className="text-white/60 mb-6">{typed.data_gb} GB · ordered {new Date(typed.created_at).toLocaleDateString()}</p>
        {typed.qr_code ? (
          <QrCodeDisplay qrCode={typed.qr_code} iccid={typed.iccid} />
        ) : (
          <p className="text-white/40 text-sm">QR code is being generated. Refresh in a moment.</p>
        )}
        <div className="mt-6 p-4 bg-white/5 rounded-lg text-sm text-white/60">
          <p className="font-medium text-white mb-2">Installation</p>
          <p><strong>iPhone:</strong> Settings → Cellular → Add eSIM → Use QR Code</p>
          <p className="mt-1"><strong>Android:</strong> Settings → Network → Mobile network → Add eSIM</p>
        </div>
      </div>
    </div>
  )
}
