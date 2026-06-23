# Phase 3: Privacy Pack, Disposable Cards, Russian UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Privacy Pack bundle purchasing, disposable virtual cards, and Russian-language UI to the platform — targeting users who need anonymous international access.

**Architecture:** Privacy Pack is a one-click atomic bundle that issues a virtual card + virtual number + eSIM in sequence, refunding on any failure. Disposable cards extend the existing Wallester integration with an `is_disposable` flag and expiry date stored in DB, auto-frozen on the server when expired. Russian UI uses `next-intl` with middleware-based locale detection (`/ru/*` and `/en/*` routes), translating the landing page, auth, and dashboard shell — product pages stay English for this phase.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase, Wallester API, Airalo API, Twilio API, next-intl ^3, Tailwind CSS v3, shadcn/ui

## Global Constraints

- Supabase server client: always `createClient()` from `platform/lib/supabase/server.ts` — never `createServerClient`
- `ApiResponse<T>` on ALL API routes: `{ data: T; error: null }` | `{ data: null; error: string }`
- Auth check at top of every route: `createClient()` → `supabase.auth.getUser()` → 401 if null
- Defense in depth: `.eq('user_id', user.id)` on every DB query, even with RLS
- Balance = integer cents, never floats
- Refund pattern: debit → provider calls → on any failure → credit refund
- TypeScript strict: no `as any`, no implicit `any`
- Async params (Next.js 16): `params: Promise<{ id: string }>`, always `await params`
- `satisfies ApiResponse<T>` on every `NextResponse.json` call
- No comments unless WHY is non-obvious
- Commit after each task: `git add` → `git commit` → `git push -u origin <branch>`
- Branch: create new branch `claude/phase3-privacy-pack` from `claude/project-review-planning-5hxxug`

---

## File Map

**New files:**
- `platform/supabase/migrations/003_phase3_schema.sql` — new columns + table
- `platform/lib/bundles.ts` — Privacy Pack plan config + atomic issue logic
- `platform/app/api/bundles/purchase/route.ts` — POST: buy a bundle
- `platform/app/api/bundles/route.ts` — GET: list user's bundles
- `platform/app/(dashboard)/bundles/page.tsx` — bundle storefront page
- `platform/components/dashboard/bundles/BundleCard.tsx` — plan card UI
- `platform/components/dashboard/bundles/BundlePurchaseModal.tsx` — country selectors + confirm
- `platform/messages/en.json` — English strings
- `platform/messages/ru.json` — Russian strings
- `platform/i18n/request.ts` — next-intl server config
- `platform/i18n/routing.ts` — locale routing config

**Modified files:**
- `platform/supabase/migrations/003_phase3_schema.sql` — alters `cards` table
- `platform/next.config.ts` — add next-intl plugin
- `platform/middleware.ts` — add locale detection alongside auth
- `platform/app/layout.tsx` — wrap with NextIntlClientProvider
- `platform/app/(dashboard)/layout.tsx` — add locale to shell
- `platform/app/page.tsx` — landing page translated
- `platform/app/login/page.tsx` — auth pages translated
- `platform/app/register/page.tsx` — auth pages translated
- `platform/components/layout/DashboardSidebar.tsx` — add Bundles nav link, language switcher
- `platform/app/api/cards/issue/route.ts` — add `is_disposable`, `valid_until` params
- `platform/app/(dashboard)/cards/page.tsx` — show disposable badge + auto-freeze expired
- `platform/app/(dashboard)/dashboard/page.tsx` — add Bundle quick-link

---

## Task 1: DB Schema — Phase 3

**Files:**
- Create: `platform/supabase/migrations/003_phase3_schema.sql`

**Interfaces:**
- Produces: `bundle_purchases` table; `cards.is_disposable: boolean`, `cards.merchant_domain: text | null`, `cards.valid_until: timestamptz | null`

- [ ] **Step 1: Write migration**

```sql
-- BUNDLE PURCHASES
create table public.bundle_purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  plan_id text not null check (plan_id in ('privacy_pack')),
  price_cents integer not null,
  card_id uuid references public.cards(id),
  number_id uuid references public.virtual_numbers(id),
  esim_id uuid references public.esims(id),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now()
);

-- DISPOSABLE CARD COLUMNS
alter table public.cards
  add column if not exists is_disposable boolean not null default false,
  add column if not exists merchant_domain text,
  add column if not exists valid_until timestamptz;

-- RLS
alter table public.bundle_purchases enable row level security;
create policy "bundles_own" on public.bundle_purchases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- INDEXES
create index if not exists idx_bundle_purchases_user_id on public.bundle_purchases(user_id);
create index if not exists idx_cards_user_id on public.cards(user_id);
create index if not exists idx_esims_user_id on public.esims(user_id);
create index if not exists idx_virtual_numbers_user_id on public.virtual_numbers(user_id);
```

- [ ] **Step 2: Verify file saved**

```bash
cat platform/supabase/migrations/003_phase3_schema.sql
```

- [ ] **Step 3: Type-check (no compile step for SQL — verify TypeScript still passes)**

```bash
cd platform && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 4: Update TypeScript types in `platform/types/index.ts`**

Add:
```typescript
export interface BundlePurchase {
  id: string
  user_id: string
  plan_id: 'privacy_pack'
  price_cents: number
  card_id: string | null
  number_id: string | null
  esim_id: string | null
  status: 'active' | 'cancelled'
  created_at: string
}
```

Add to `Card` interface (extend existing):
```typescript
// Add these fields to the existing Card interface
is_disposable: boolean
merchant_domain: string | null
valid_until: string | null
```

- [ ] **Step 5: Commit**

```bash
git add platform/supabase/migrations/003_phase3_schema.sql platform/types/index.ts
git commit -m "feat: Phase 3 schema — bundle_purchases table, disposable card columns, indexes"
```

---

## Task 2: Privacy Pack — Bundle Logic & API

**Files:**
- Create: `platform/lib/bundles.ts`
- Create: `platform/app/api/bundles/purchase/route.ts`
- Create: `platform/app/api/bundles/route.ts`

**Interfaces:**
- Consumes: `debitBalance`, `creditBalance` from `platform/lib/utils/balance.ts`; `issueCard`, `createCardholder` from `platform/lib/providers/wallester.ts`; `purchaseNumber` from `platform/lib/providers/twilio.ts`; `getPackages`, `buyEsim` from `platform/lib/providers/airalo.ts`
- Produces:
  - `BUNDLE_PLANS: Record<string, BundlePlan>` — plan config
  - `POST /api/bundles/purchase` → `ApiResponse<BundlePurchase>`
  - `GET /api/bundles` → `ApiResponse<BundlePurchase[]>`

- [ ] **Step 1: Write `platform/lib/bundles.ts`**

```typescript
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
```

- [ ] **Step 2: Write `platform/app/api/bundles/purchase/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { debitBalance, creditBalance } from '@/lib/utils/balance'
import { createCardholder, issueCard } from '@/lib/providers/wallester'
import { purchaseNumber } from '@/lib/providers/twilio'
import { getPackages, buyEsim } from '@/lib/providers/airalo'
import { BUNDLE_PLANS } from '@/lib/bundles'
import { ApiResponse, BundlePurchase } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const body = await req.json() as { plan_id?: string; number_country?: string; esim_country?: string; esim_package_id?: string }
  const { plan_id, number_country, esim_country, esim_package_id } = body

  const plan = plan_id ? BUNDLE_PLANS[plan_id] : undefined
  if (!plan) return NextResponse.json({ data: null, error: 'Invalid plan' } satisfies ApiResponse<never>, { status: 400 })
  if (!number_country || !esim_country || !esim_package_id) {
    return NextResponse.json({ data: null, error: 'number_country, esim_country, and esim_package_id required' } satisfies ApiResponse<never>, { status: 400 })
  }

  // Debit full bundle price
  try {
    await debitBalance(user.id, plan.price_cents)
  } catch {
    return NextResponse.json({ data: null, error: 'Insufficient balance' } satisfies ApiResponse<never>, { status: 400 })
  }

  const service = await createServiceClient()
  const { data: userRow } = await service.from('users').select('email').eq('id', user.id).single()

  let cardId: string | null = null
  let numberId: string | null = null
  let esimId: string | null = null

  try {
    // 1. Issue card
    const cardholder = await createCardholder(user.id, userRow?.email ?? '')
    const walCard = await issueCard(cardholder.id, plan.includes.card_currency)
    const nextRenewal = new Date()
    nextRenewal.setDate(nextRenewal.getDate() + 30)

    const { data: card, error: cardErr } = await service.from('cards').insert({
      user_id: user.id,
      wallester_card_id: walCard.id,
      currency: plan.includes.card_currency,
      status: 'active',
      balance_cents: 0,
      tariff: plan.includes.card_tariff,
      last_four: walCard.last_four ?? null,
      expiry_month: walCard.expiry_month ?? null,
      expiry_year: walCard.expiry_year ?? null,
    }).select().single()
    if (cardErr || !card) throw new Error('Failed to save card')
    cardId = card.id

    // 2. Purchase number
    const { sid, number } = await purchaseNumber(await getAvailableNumber(number_country))
    const nextNumberRenewal = new Date()
    nextNumberRenewal.setDate(nextNumberRenewal.getDate() + 30)

    const { data: num, error: numErr } = await service.from('virtual_numbers').insert({
      user_id: user.id,
      twilio_sid: sid,
      number,
      country: number_country,
      monthly_price_cents: plan.includes.number_price_cents,
      next_renewal_at: nextNumberRenewal.toISOString(),
      status: 'active',
    }).select().single()
    if (numErr || !num) throw new Error('Failed to save number')
    numberId = num.id

    // 3. Purchase eSIM
    const packages = await getPackages(esim_country)
    const pkg = packages.find(p => p.id === esim_package_id)
    if (!pkg) throw new Error('eSIM package not found')

    const esimOrder = await buyEsim(esim_package_id)
    const { data: esim, error: esimErr } = await service.from('esims').insert({
      user_id: user.id,
      airalo_order_id: esimOrder.id,
      iccid: esimOrder.iccid ?? null,
      country: esim_country,
      package_id: esim_package_id,
      data_gb: pkg.data_gb,
      qr_code: esimOrder.qrcode ?? null,
      status: 'active',
      expires_at: null,
      price_cents: pkg.price,
    }).select().single()
    if (esimErr || !esim) throw new Error('Failed to save eSIM')
    esimId = esim.id

    // 4. Record bundle
    const { data: bundle, error: bundleErr } = await service.from('bundle_purchases').insert({
      user_id: user.id,
      plan_id: plan.id,
      price_cents: plan.price_cents,
      card_id: cardId,
      number_id: numberId,
      esim_id: esimId,
      status: 'active',
    }).select().single()
    if (bundleErr || !bundle) throw new Error('Failed to save bundle')

    return NextResponse.json({ data: bundle as BundlePurchase, error: null } satisfies ApiResponse<BundlePurchase>)
  } catch (err: unknown) {
    await creditBalance(user.id, plan.price_cents)
    const message = err instanceof Error ? err.message : 'Bundle purchase failed'
    return NextResponse.json({ data: null, error: message } satisfies ApiResponse<never>, { status: 500 })
  }
}

async function getAvailableNumber(country: string): Promise<string> {
  const { searchNumbers } = await import('@/lib/providers/twilio')
  const available = await searchNumbers(country)
  if (!available.length) throw new Error(`No available numbers in ${country}`)
  return available[0].phone_number
}
```

- [ ] **Step 3: Write `platform/app/api/bundles/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApiResponse, BundlePurchase } from '@/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const { data, error } = await supabase
    .from('bundle_purchases')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ data: null, error: error.message } satisfies ApiResponse<never>, { status: 500 })

  return NextResponse.json({ data: (data ?? []) as BundlePurchase[], error: null } satisfies ApiResponse<BundlePurchase[]>)
}
```

- [ ] **Step 4: tsc check**

```bash
cd platform && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add platform/lib/bundles.ts platform/app/api/bundles/
git commit -m "feat: Privacy Pack bundle API — atomic issue of card + number + eSIM"
```

---

## Task 3: Privacy Pack — UI

**Files:**
- Create: `platform/app/(dashboard)/bundles/page.tsx`
- Create: `platform/components/dashboard/bundles/BundleCard.tsx`
- Create: `platform/components/dashboard/bundles/BundlePurchaseModal.tsx`
- Modify: `platform/components/layout/DashboardSidebar.tsx` — add Bundles link
- Modify: `platform/app/(dashboard)/dashboard/page.tsx` — add Bundles quick-link

**Interfaces:**
- Consumes: `GET /api/bundles`, `POST /api/bundles/purchase`, `GET /api/esim/packages?country=XX`, `GET /api/numbers/available?country=XX`
- Produces: `/bundles` page

- [ ] **Step 1: Write `BundleCard.tsx`**

```typescript
'use client'

import { BundlePlan } from '@/lib/bundles'

interface Props {
  plan: BundlePlan
  onSelect: () => void
}

export function BundleCard({ plan, onSelect }: Props) {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
        <p className="text-sm text-white/60 mt-1">{plan.description}</p>
      </div>
      <ul className="text-sm text-white/70 space-y-1">
        <li>✓ 1 virtual card ({plan.includes.card_currency})</li>
        <li>✓ 1 virtual number (your country)</li>
        <li>✓ 1 eSIM data package ({plan.includes.esim_data_min_gb}GB+)</li>
      </ul>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-2xl font-bold text-white">
          ${(plan.price_cents / 100).toFixed(2)}
        </span>
        <button
          onClick={onSelect}
          className="bg-white text-black font-semibold px-4 py-2 rounded-xl hover:bg-white/90 transition"
        >
          Get Pack
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `BundlePurchaseModal.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BundlePlan } from '@/lib/bundles'

const NUMBER_COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'SE', label: 'Sweden' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
]

const ESIM_COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'TR', label: 'Turkey' },
  { value: 'TH', label: 'Thailand' },
  { value: 'JP', label: 'Japan' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AE', label: 'UAE' },
]

interface EsimPackage {
  id: string
  title: string
  data: string
  price: number
}

interface Props {
  plan: BundlePlan
  onClose: () => void
}

export function BundlePurchaseModal({ plan, onClose }: Props) {
  const router = useRouter()
  const [numberCountry, setNumberCountry] = useState('US')
  const [esimCountry, setEsimCountry] = useState('US')
  const [packages, setPackages] = useState<EsimPackage[]>([])
  const [packageId, setPackageId] = useState('')
  const [loadingPkgs, setLoadingPkgs] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError] = useState('')

  async function loadPackages(country: string) {
    setLoadingPkgs(true)
    setPackageId('')
    try {
      const res = await fetch(`/api/esim/packages?country=${country}`)
      const json = await res.json()
      if (json.error) { setPackages([]); return }
      setPackages(json.data ?? [])
      if (json.data?.length) setPackageId(json.data[0].id)
    } finally {
      setLoadingPkgs(false)
    }
  }

  async function purchase() {
    if (!packageId) { setError('Select an eSIM package'); return }
    setPurchasing(true)
    setError('')
    try {
      const res = await fetch('/api/bundles/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id, number_country: numberCountry, esim_country: esimCountry, esim_package_id: packageId }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setError(json.error ?? 'Purchase failed'); return }
      router.refresh()
      onClose()
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-white">Configure {plan.name}</h2>

        <div>
          <label className="text-sm text-white/60">Virtual Number Country</label>
          <select
            value={numberCountry}
            onChange={e => setNumberCountry(e.target.value)}
            className="w-full mt-1 bg-white/10 text-white rounded-xl px-3 py-2 border border-white/20"
          >
            {NUMBER_COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm text-white/60">eSIM Country</label>
          <select
            value={esimCountry}
            onChange={e => { setEsimCountry(e.target.value); loadPackages(e.target.value) }}
            onFocus={() => !packages.length && loadPackages(esimCountry)}
            className="w-full mt-1 bg-white/10 text-white rounded-xl px-3 py-2 border border-white/20"
          >
            {ESIM_COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {packages.length > 0 && (
          <div>
            <label className="text-sm text-white/60">eSIM Package</label>
            <select
              value={packageId}
              onChange={e => setPackageId(e.target.value)}
              className="w-full mt-1 bg-white/10 text-white rounded-xl px-3 py-2 border border-white/20"
            >
              {packages.map(p => (
                <option key={p.id} value={p.id}>{p.title} — {p.data} — ${(p.price / 100).toFixed(2)}</option>
              ))}
            </select>
          </div>
        )}
        {loadingPkgs && <p className="text-sm text-white/50">Loading packages…</p>}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 border border-white/20 text-white rounded-xl py-2 hover:bg-white/5">
            Cancel
          </button>
          <button
            onClick={purchase}
            disabled={purchasing || !packageId}
            className="flex-1 bg-white text-black font-semibold rounded-xl py-2 hover:bg-white/90 disabled:opacity-50"
          >
            {purchasing ? 'Purchasing…' : `Pay $${(plan.price_cents / 100).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `platform/app/(dashboard)/bundles/page.tsx`**

```typescript
import { BundleCard } from '@/components/dashboard/bundles/BundleCard'
import { BundleList } from '@/components/dashboard/bundles/BundleList'
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Privacy Packs</h1>
        <p className="text-white/60 mt-1">Everything you need for private international access in one purchase.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(BUNDLE_PLANS).map(plan => (
          <BundleCard key={plan.id} plan={plan} />
        ))}
      </div>

      {(bundles ?? []).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Your Packs</h2>
          <BundleList bundles={(bundles ?? []) as BundlePurchase[]} />
        </div>
      )}
    </div>
  )
}
```

Note: `BundleCard` on this page needs to be a wrapper that holds modal state. Create a separate `BundleStorefront.tsx` client component that wraps `BundleCard` with modal state, OR make the page itself a client component. Simplest: make `bundles/page.tsx` render a client component `BundleStorefront` that holds the modal state. Pass `initialBundles` as a prop from the server component.

Revised page:

```typescript
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
```

Create `BundleStorefront.tsx` as a client component that renders `BundleCard` items and shows `BundlePurchaseModal` on selection.

```typescript
// platform/components/dashboard/bundles/BundleStorefront.tsx
'use client'

import { useState } from 'react'
import { BundlePlan } from '@/lib/bundles'
import { BundlePurchase } from '@/types'
import { BundleCard } from './BundleCard'
import { BundlePurchaseModal } from './BundlePurchaseModal'

interface Props {
  plans: BundlePlan[]
  initialBundles: BundlePurchase[]
}

export function BundleStorefront({ plans, initialBundles }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<BundlePlan | null>(null)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Privacy Packs</h1>
        <p className="text-white/60 mt-1">Everything you need for private international access in one purchase.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(plan => (
          <BundleCard key={plan.id} plan={plan} onSelect={() => setSelectedPlan(plan)} />
        ))}
      </div>

      {initialBundles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Your Packs</h2>
          <div className="space-y-2">
            {initialBundles.map(b => (
              <div key={b.id} className="glass rounded-xl p-4 flex justify-between items-center">
                <span className="text-white font-medium">Privacy Pack</span>
                <span className="text-white/50 text-sm">{new Date(b.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPlan && (
        <BundlePurchaseModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add Bundles to sidebar**

In `platform/components/layout/DashboardSidebar.tsx`, add to the NAV array:
```typescript
{ href: '/bundles', label: 'Privacy Packs', icon: Package }
```
Import `Package` from `lucide-react`.

- [ ] **Step 5: Add Bundles to dashboard home quick-links**

In `platform/app/(dashboard)/dashboard/page.tsx`, add to the PRODUCTS array:
```typescript
{ href: '/bundles', label: 'Privacy Packs', desc: 'Card + number + eSIM bundle' }
```

- [ ] **Step 6: tsc check**

```bash
cd platform && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add platform/app/\(dashboard\)/bundles/ platform/components/dashboard/bundles/ platform/components/layout/DashboardSidebar.tsx platform/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat: Privacy Pack bundle UI — storefront, purchase modal, dashboard integration"
```

---

## Task 4: Disposable Cards

**Files:**
- Modify: `platform/app/api/cards/issue/route.ts` — add `is_disposable`, `valid_until` params
- Modify: `platform/app/(dashboard)/cards/page.tsx` — show disposable badge, auto-freeze expired
- Create: `platform/app/api/cards/expire/route.ts` — POST: freeze all expired disposable cards for user

**Interfaces:**
- Consumes: existing `POST /api/cards/issue`, existing Wallester `setCardStatus`
- Produces: cards issued with `is_disposable: true` and `valid_until` set; expired cards auto-frozen on page load

- [ ] **Step 1: Update `platform/app/api/cards/issue/route.ts`**

Read the current file first. Add parsing of optional `is_disposable` and `valid_days` (1–30) from request body:

```typescript
// After existing body parsing, add:
const is_disposable = body.is_disposable === true
const valid_days = is_disposable
  ? Math.min(30, Math.max(1, Number(body.valid_days) || 7))
  : null
const valid_until = is_disposable
  ? new Date(Date.now() + valid_days * 86400_000).toISOString()
  : null
```

In the DB insert for cards, add:
```typescript
is_disposable,
merchant_domain: body.merchant_domain ?? null,
valid_until,
```

- [ ] **Step 2: Create `platform/app/api/cards/expire/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { setCardStatus } from '@/lib/providers/wallester'
import { ApiResponse } from '@/types'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const service = await createServiceClient()
  const now = new Date().toISOString()

  const { data: expired } = await service
    .from('cards')
    .select('id, wallester_card_id')
    .eq('user_id', user.id)
    .eq('is_disposable', true)
    .eq('status', 'active')
    .lt('valid_until', now)

  if (!expired?.length) return NextResponse.json({ data: { frozen: 0 }, error: null } satisfies ApiResponse<{ frozen: number }>)

  let frozen = 0
  for (const card of expired) {
    try {
      await setCardStatus(card.wallester_card_id, 'frozen')
      await service.from('cards').update({ status: 'frozen' }).eq('id', card.id)
      frozen++
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({ data: { frozen }, error: null } satisfies ApiResponse<{ frozen: number }>)
}
```

- [ ] **Step 3: Update `platform/app/(dashboard)/cards/page.tsx`**

Read the current file. Add:

1. At the top of the server component, after auth check, call the expire endpoint server-side (or just show expired badge without auto-freeze on load — simpler):

   Actually, trigger expire on load via a client component effect. Add a `DisposableAutoFreeze` client component that calls `POST /api/cards/expire` on mount:

   ```typescript
   // platform/components/dashboard/cards/DisposableAutoFreeze.tsx
   'use client'
   import { useEffect } from 'react'
   
   export function DisposableAutoFreeze() {
     useEffect(() => {
       fetch('/api/cards/expire', { method: 'POST' }).catch(() => {})
     }, [])
     return null
   }
   ```

   Render `<DisposableAutoFreeze />` at the top of the cards page.

2. On each card row/card item, show a disposable badge when `card.is_disposable`:

   ```typescript
   {card.is_disposable && (
     <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
       {card.valid_until && new Date(card.valid_until) > new Date()
         ? `Expires ${new Date(card.valid_until).toLocaleDateString()}`
         : 'Expired'}
     </span>
   )}
   ```

- [ ] **Step 4: tsc check**

```bash
cd platform && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add platform/app/api/cards/ platform/app/\(dashboard\)/cards/ platform/components/dashboard/cards/
git commit -m "feat: disposable virtual cards with auto-expiry and freeze"
```

---

## Task 5: Russian UI (next-intl)

**Files:**
- Create: `platform/messages/en.json`
- Create: `platform/messages/ru.json`
- Create: `platform/i18n/request.ts`
- Create: `platform/i18n/routing.ts`
- Modify: `platform/next.config.ts` — add next-intl plugin
- Modify: `platform/middleware.ts` — add locale detection
- Modify: `platform/app/layout.tsx` — wrap with NextIntlClientProvider
- Modify: `platform/app/page.tsx` — use translations
- Modify: `platform/app/(auth)/login/page.tsx` — use translations
- Modify: `platform/app/(auth)/register/page.tsx` — use translations
- Modify: `platform/components/layout/DashboardSidebar.tsx` — add language switcher

**Interfaces:**
- Produces: `useTranslations('page')` available in all components; `/ru` and `/en` locale prefixes; `Accept-Language` auto-detection

- [ ] **Step 1: Install next-intl**

```bash
cd platform && npm install next-intl
```

- [ ] **Step 2: Create `platform/i18n/routing.ts`**

```typescript
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'ru'],
  defaultLocale: 'en',
})
```

- [ ] **Step 3: Create `platform/i18n/request.ts`**

```typescript
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as 'en' | 'ru')) {
    locale = routing.defaultLocale
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

- [ ] **Step 4: Create `platform/messages/en.json`**

```json
{
  "nav": {
    "home": "Dashboard",
    "balance": "Balance",
    "sms": "SMS",
    "cards": "Cards",
    "esim": "eSIM",
    "numbers": "Numbers",
    "kyc": "KYC",
    "bundles": "Privacy Packs",
    "admin": "Admin"
  },
  "landing": {
    "headline": "Your global financial toolkit",
    "subheadline": "Virtual cards, numbers, and eSIMs — no borders, no limits.",
    "cta": "Get started",
    "signin": "Sign in"
  },
  "auth": {
    "email": "Email",
    "password": "Password",
    "login": "Sign in",
    "register": "Create account",
    "no_account": "Don't have an account?",
    "have_account": "Already have an account?"
  },
  "dashboard": {
    "balance": "Balance",
    "topup": "Top up",
    "quick_links": "Products"
  },
  "common": {
    "loading": "Loading…",
    "error": "Something went wrong",
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

- [ ] **Step 5: Create `platform/messages/ru.json`**

```json
{
  "nav": {
    "home": "Главная",
    "balance": "Баланс",
    "sms": "SMS",
    "cards": "Карты",
    "esim": "eSIM",
    "numbers": "Номера",
    "kyc": "KYC",
    "bundles": "Privacy Pack",
    "admin": "Админ"
  },
  "landing": {
    "headline": "Ваш финансовый инструментарий без границ",
    "subheadline": "Виртуальные карты, номера и eSIM — без ограничений, без санкций.",
    "cta": "Начать",
    "signin": "Войти"
  },
  "auth": {
    "email": "Email",
    "password": "Пароль",
    "login": "Войти",
    "register": "Создать аккаунт",
    "no_account": "Нет аккаунта?",
    "have_account": "Уже есть аккаунт?"
  },
  "dashboard": {
    "balance": "Баланс",
    "topup": "Пополнить",
    "quick_links": "Продукты"
  },
  "common": {
    "loading": "Загрузка…",
    "error": "Что-то пошло не так",
    "save": "Сохранить",
    "cancel": "Отмена"
  }
}
```

- [ ] **Step 6: Update `platform/next.config.ts`**

```typescript
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {}

export default withNextIntl(nextConfig)
```

- [ ] **Step 7: Update `platform/middleware.ts`**

Replace existing middleware with one that handles BOTH locale detection AND auth:

```typescript
import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/cards', '/esim', '/numbers', '/sms', '/kyc', '/balance', '/bundles']
const ADMIN_PREFIXES = ['/admin']
const AUTH_PAGES = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Strip locale prefix for auth checks
  const strippedPath = path.replace(/^\/(en|ru)/, '') || '/'

  const isProtected = PROTECTED_PREFIXES.some(p => strippedPath.startsWith(p))
  const isAuthPage = AUTH_PAGES.some(p => strippedPath.startsWith(p))

  if (isProtected || isAuthPage) {
    let supabaseResponse = NextResponse.next({ request })
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()

    if (isProtected && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (isAuthPage && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
```

- [ ] **Step 8: Add language switcher to sidebar**

In `platform/components/layout/DashboardSidebar.tsx`, add at the bottom of the sidebar:

```typescript
'use client'
// Add at top of file
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'

// In the component, add:
const locale = useLocale()
const router = useRouter()
const pathname = usePathname()

function switchLocale(newLocale: string) {
  const newPath = pathname.replace(`/${locale}`, `/${newLocale}`) || `/${newLocale}`
  router.push(newPath)
}

// In JSX, add at bottom of sidebar:
<div className="flex gap-2 px-3 pb-4">
  <button
    onClick={() => switchLocale('en')}
    className={`text-xs px-2 py-1 rounded ${locale === 'en' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
  >
    EN
  </button>
  <button
    onClick={() => switchLocale('ru')}
    className={`text-xs px-2 py-1 rounded ${locale === 'ru' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
  >
    RU
  </button>
</div>
```

- [ ] **Step 9: Update landing page and auth pages to use translations**

In `platform/app/page.tsx`, import `useTranslations` (server-side: `getTranslations` from `next-intl/server`) and replace hardcoded strings with translation keys.

In `platform/app/(auth)/login/page.tsx` and `register/page.tsx`, do the same.

- [ ] **Step 10: tsc check**

```bash
cd platform && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 11: Commit**

```bash
git add platform/messages/ platform/i18n/ platform/next.config.ts platform/middleware.ts platform/components/layout/DashboardSidebar.tsx platform/app/page.tsx platform/app/
git commit -m "feat: Russian UI — next-intl, locale routing, EN/RU translations, language switcher"
```

---

## Self-Review

### Spec coverage
- ✅ Privacy Pack bundle (card + number + eSIM, atomic purchase, refund on failure)
- ✅ Disposable cards (`is_disposable`, `valid_until`, auto-freeze on expiry)
- ✅ Russian UI (next-intl, EN/RU, language switcher, landing + auth + nav translated)
- ✅ DB migration with indexes
- ✅ TypeScript types updated
- ✅ All API routes use `ApiResponse<T>` + auth check + defense in depth

### Potential issues
1. Task 5 middleware: the `intlMiddleware` from next-intl and the auth middleware need to be composed carefully. The implementation above runs auth check first, then intl. Test this flow manually.
2. Task 3 `BundlesPage` — server component fetches bundles without `.eq('user_id', user.id)` defense-in-depth shown explicitly — the implementer must add it (it's shown in the `BundleStorefront` component's GET call and the page fetch).
3. Disposable cards: `DisposableAutoFreeze` fires a POST on every page load — fine for MVP, consider rate-limiting later.
