import { KycUploadForm } from '@/components/kyc/KycUploadForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function KycPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('kyc_status').eq('id', user.id).single()

  if (profile?.kyc_status === 'verified') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-2">KYC Verified</h1>
        <p className="text-green-400">Your identity has been verified. You can now order virtual cards.</p>
      </div>
    )
  }

  if (profile?.kyc_status === 'pending') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Under Review</h1>
        <p className="text-white/60">Your documents are being reviewed. This usually takes 1–2 business days.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-1">Identity Verification</h1>
      <p className="text-white/60 mb-6">Required to issue virtual cards. Upload a government-issued ID.</p>
      <KycUploadForm />
    </div>
  )
}
