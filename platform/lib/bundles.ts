export interface BundlePlan {
  id: 'privacy_pack'
  name: string
  description: string
  price_cents: number
  includes: {
    card_currency: 'EUR' | 'USD'
    card_tariff: string
    number_price_cents: number
    esim_data_min_gb: number
  }
}

export const BUNDLE_PLANS: Record<string, BundlePlan> = {
  privacy_pack: {
    id: 'privacy_pack',
    name: 'Privacy Pack',
    description: '1 virtual card + 1 virtual number + 1 eSIM',
    price_cents: 3999,
    includes: {
      card_currency: 'EUR',
      card_tariff: 'standard',
      number_price_cents: 700,
      esim_data_min_gb: 1,
    },
  },
}
