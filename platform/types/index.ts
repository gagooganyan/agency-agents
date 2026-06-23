export type KycStatus = 'pending' | 'verified' | 'rejected'
export type SimStatus = 'waiting' | 'received' | 'cancelled' | 'expired'
export type TransactionType = 'topup' | 'purchase' | 'refund'
export type TransactionStatus = 'pending' | 'completed' | 'failed'
export type PaymentMethod = 'crypto' | 'card'
export type ProductType = 'sms' | 'card' | 'esim' | 'number'

export interface User {
  id: string
  email: string
  name: string | null
  kyc_status: KycStatus
  balance_cents: number
  country: string | null
  referral_code: string
  two_fa_enabled: boolean
  is_admin: boolean
  created_at: string
}

export interface Sim {
  id: string
  user_id: string
  phone_number: string
  service: string
  country: string
  status: SimStatus
  sms_code: string | null
  fivesim_order_id: number | null
  price_cents: number
  expires_at: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount_cents: number
  currency: string
  status: TransactionStatus
  provider: string | null
  product_type: ProductType | null
  product_id: string | null
  payment_method: PaymentMethod | null
  external_id: string | null
  created_at: string
}

export interface FiveSimCountry {
  name: string
  iso: string
  prefix: string
}

export interface FiveSimService {
  name: string
  count: number
  price: number
}

export type ApiResponse<T> = { data: T; error: null } | { data: null; error: string }
