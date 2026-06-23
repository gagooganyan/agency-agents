import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KycDocument } from '@/types'
import { KycReviewButtons } from '@/components/admin/KycReviewButtons'

export default async function AdminKycPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = await createServiceClient()
  const { data: profile } = await service.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const { data: docs } = await service
    .from('kyc_documents')
    .select('*, users(email)')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })
    .limit(100) as { data: (KycDocument & { users: { email: string } })[] | null }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">KYC Queue ({docs?.length ?? 0})</h1>
      <div className="space-y-4">
        {docs?.map(doc => (
          <div key={doc.id} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{doc.users?.email}</p>
                <p className="text-white/40 text-sm">{doc.document_type} · submitted {new Date(doc.submitted_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <KycReviewButtons docId={doc.id} />
              </div>
            </div>
          </div>
        ))}
        {!docs?.length && <p className="text-white/40">No pending KYC submissions.</p>}
      </div>
    </div>
  )
}
