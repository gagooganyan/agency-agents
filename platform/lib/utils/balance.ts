import { createServiceClient } from '@/lib/supabase/server'

export async function creditBalance(userId: string, amountCents: number): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await (supabase as any).rpc('increment_balance', {
    user_id: userId,
    amount: amountCents,
  })
  if (error) throw new Error(`Balance credit failed: ${error.message}`)
}

export async function debitBalance(userId: string, amountCents: number): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await (supabase as any).rpc('decrement_balance', {
    user_id: userId,
    amount: amountCents,
  })
  if (error) throw new Error(`Balance debit failed: ${error.message}`)
}
