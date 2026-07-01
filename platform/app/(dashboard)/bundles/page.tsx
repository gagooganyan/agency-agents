import { BundleStorefront } from '@/components/dashboard/bundles/BundleStorefront'
import { BUNDLE_PLANS } from '@/lib/bundles'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BundlePurchase } from '@/types'

export default async function BundlesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bundles } = await supabase
    .from('bundle_purchases')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <BundleStorefront
      plans={Object.values(BUNDLE_PLANS)}
      initialBundles={(bundles ?? []) as BundlePurchase[]}
    />
  )
}
