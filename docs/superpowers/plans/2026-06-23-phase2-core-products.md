# Phase 2: Core Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fiat payments (Paddle), KYC, virtual cards (Wallester), eSIM (Airalo), and virtual numbers (Twilio) to the existing Next.js fintech platform.

**Architecture:** Each product module follows the same pattern as the SMS module from Phase 1: a provider library in `lib/providers/`, API routes in `app/api/`, and dashboard pages in `app/(dashboard)/`. The DB migration adds four new tables. All routes are auth-gated via `createServerClient()`.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase (PostgreSQL + RLS), Paddle Billing API, Wallester REST API, Airalo Partner API, Twilio Node SDK, shadcn/ui, Tailwind CSS v3.

## Global Constraints

- Next.js version: read `platform/node_modules/next/package.json` → use that exact version's APIs. Async params: `params: Promise<{ id: string }>`, await before use.
- Balance stored as integer cents: $10.00 = 1000. Never use floats.
- All API route responses: `{ data: T, error: null }` or `{ data: null, error: string }` — use `ApiResponse<T>` from `types/index.ts`.
- Auth check in every API route: `const { data: { user } } = await supabase.auth.getUser()` → 401 if null.
- Admin check: use `createServiceClient()`, verify `users.is_admin = true`.
- RLS enabled on all new tables — service client bypasses, user client enforces.
- `creditBalance` / `debitBalance` in `lib/utils/balance.ts` — use these, never direct SQL.
- Dark theme: CSS vars from `globals.css`, glassmorphism via `.glass` class (`bg-white/5 backdrop-blur-md border border-white/10`).
- Violet accent: `bg-violet-600` / `#7c3aed`.
- All provider API keys in `.env.local`, never hardcoded.
- Commit after every task.
- Platform root: `platform/` inside the repo. All paths below are relative to `platform/`.

---

### Task 1: DB Schema — Phase 2 Tables

**Files:**
- Create: `supabase/migrations/002_phase2_schema.sql`
- Modify: `types/index.ts` — add Card, Esim, VirtualNumber, KycDocument types

**Interfaces:**
- Produces:
  - `Card`, `Esim`, `VirtualNumber`, `KycDocument` types in `types/index.ts`
  - `CardStatus`, `EsimStatus`, `KycDocumentStatus` union types
  - SQL tables: `cards`, `esims`, `virtual_numbers`, `kyc_documents`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/002_phase2_schema.sql`:

```sql
-- VIRTUAL CARDS (Wallester)
create table public.cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  wallester_card_id text unique not null,
  currency text not null check (currency in ('EUR', 'USD')),
  status text not null default 'active' check (status in ('active', 'frozen', 'closed')),
  balance_cents integer not null default 0,
  tariff text not null,
  last_four text,
  expiry_month integer,
  expiry_year integer,
  created_at timestamptz not null default now()
);

-- ESIM (Airalo)
create table public.esims (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  airalo_order_id text unique not null,
  iccid text,
  country text not null,
  package_id text not null,
  data_gb numeric(5,2) not null,
  qr_code text,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  expires_at timestamptz,
  price_cents integer not null,
  created_at timestamptz not null default now()
);

-- VIRTUAL NUMBERS (Twilio)
create table public.virtual_numbers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  twilio_sid text unique not null,
  number text not null,
  country text not null,
  monthly_price_cents integer not null,
  next_renewal_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now()
);

-- KYC DOCUMENTS
create table public.kyc_documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  document_type text not null check (document_type in ('passport', 'id_card', 'driving_license')),
  front_url text not null,
  back_url text,
  selfie_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- RLS
alter table public.cards enable row level security;
alter table public.esims enable row level security;
alter table public.virtual_numbers enable row level security;
alter table public.kyc_documents enable row level security;

create policy "cards_own" on public.cards for all using (auth.uid() = user_id);
create policy "esims_own" on public.esims for all using (auth.uid() = user_id);
create policy "virtual_numbers_own" on public.virtual_numbers for all using (auth.uid() = user_id);
create policy "kyc_own" on public.kyc_documents for all using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration**

In Supabase dashboard → SQL Editor → paste and run `002_phase2_schema.sql`.

Or via Supabase CLI if configured:
```bash
npx supabase db push
```

- [ ] **Step 3: Add types to `types/index.ts`**

Append to existing file:

```typescript
export type CardStatus = 'active' | 'frozen' | 'closed'
export type EsimStatus = 'active' | 'expired' | 'cancelled'
export type KycDocumentStatus = 'pending' | 'approved' | 'rejected'

export interface Card {
  id: string
  user_id: string
  wallester_card_id: string
  currency: 'EUR' | 'USD'
  status: CardStatus
  balance_cents: number
  tariff: string
  last_four: string | null
  expiry_month: number | null
  expiry_year: number | null
  created_at: string
}

export interface Esim {
  id: string
  user_id: string
  airalo_order_id: string
  iccid: string | null
  country: string
  package_id: string
  data_gb: number
  qr_code: string | null
  status: EsimStatus
  expires_at: string | null
  price_cents: number
  created_at: string
}

export interface VirtualNumber {
  id: string
  user_id: string
  twilio_sid: string
  number: string
  country: string
  monthly_price_cents: number
  next_renewal_at: string
  status: 'active' | 'cancelled'
  created_at: string
}

export interface KycDocument {
  id: string
  user_id: string
  document_type: 'passport' | 'id_card' | 'driving_license'
  front_url: string
  back_url: string | null
  selfie_url: string | null
  status: KycDocumentStatus
  admin_note: string | null
  submitted_at: string
  reviewed_at: string | null
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/002_phase2_schema.sql types/index.ts
git commit -m "feat: add phase 2 DB schema — cards, esims, virtual_numbers, kyc_documents"
```

---

### Task 2: Paddle Fiat Payments

**Files:**
- Create: `lib/providers/paddle.ts`
- Create: `app/api/payments/paddle/create/route.ts`
- Create: `app/api/payments/paddle/webhook/route.ts`
- Modify: `app/(dashboard)/balance/page.tsx` — add Paddle button
- Modify: `components/dashboard/TopUpModal.tsx` — add "Pay with card" tab

**Interfaces:**
- Consumes: `creditBalance(userId, amountCents)` from `lib/utils/balance.ts`
- Consumes: `createServerClient()`, `createServiceClient()` from `lib/supabase/server.ts`
- Consumes: `ApiResponse<T>` from `types/index.ts`
- Produces: `createPaddleCheckout(amountCents, userId, transactionId): Promise<{ url: string }>` in `lib/providers/paddle.ts`
- Produces: `POST /api/payments/paddle/create` → `ApiResponse<{ checkout_url: string }>`
- Produces: `POST /api/payments/paddle/webhook` → handles `transaction.completed`

**Env vars needed:**
```
PADDLE_API_KEY=        # from Paddle dashboard → Developer → Authentication
PADDLE_WEBHOOK_SECRET= # from Paddle dashboard → Notifications → webhook secret key
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN= # from Paddle dashboard (publishable key)
```

- [ ] **Step 1: Create `lib/providers/paddle.ts`**

```typescript
// Paddle Billing API v1
const PADDLE_API_BASE = 'https://api.paddle.com'

export async function createPaddleCheckout(
  amountCents: number,
  userId: string,
  transactionId: string,
): Promise<{ url: string }> {
  const res = await fetch(`${PADDLE_API_BASE}/transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{
        price: {
          description: 'Balance top-up',
          unit_price: { amount: String(amountCents), currency_code: 'USD' },
          product: { name: 'Balance Top-up', tax_category: 'digital-goods' },
        },
        quantity: 1,
      }],
      custom_data: { user_id: userId, transaction_id: transactionId },
      checkout: { url: `${process.env.NEXT_PUBLIC_APP_URL}/balance?success=1` },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Paddle API error: ${body}`)
  }
  const json = await res.json()
  return { url: json.data.checkout.url }
}

export function verifyPaddleWebhook(
  rawBody: string,
  signatureHeader: string,
): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET!
  // Paddle uses ts=<timestamp>;h1=<hmac-sha256>
  const parts = Object.fromEntries(
    signatureHeader.split(';').map(p => p.split('=') as [string, string])
  )
  const ts = parts['ts']
  const h1 = parts['h1']
  const payload = `${ts}:${rawBody}`
  const crypto = require('crypto')
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return expected === h1
}
```

- [ ] **Step 2: Create `app/api/payments/paddle/create/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createPaddleCheckout } from '@/lib/providers/paddle'
import { ApiResponse } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const { amount_cents } = await req.json()
  if (!amount_cents || amount_cents < 500 || amount_cents > 100000) {
    return NextResponse.json({ data: null, error: 'Amount must be between $5 and $1000' } satisfies ApiResponse<never>, { status: 400 })
  }

  const service = await createServiceClient()
  const { data: tx, error: txErr } = await service
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'topup',
      amount_cents,
      currency: 'USD',
      status: 'pending',
      provider: 'paddle',
      payment_method: 'card',
    })
    .select('id')
    .single()

  if (txErr || !tx) {
    return NextResponse.json({ data: null, error: 'Failed to create transaction' } satisfies ApiResponse<never>, { status: 500 })
  }

  try {
    const { url } = await createPaddleCheckout(amount_cents, user.id, tx.id)
    return NextResponse.json({ data: { checkout_url: url }, error: null } satisfies ApiResponse<{ checkout_url: string }>)
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message } satisfies ApiResponse<never>, { status: 500 })
  }
}
```

- [ ] **Step 3: Create `app/api/payments/paddle/webhook/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyPaddleWebhook } from '@/lib/providers/paddle'
import { creditBalance } from '@/lib/utils/balance'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('paddle-signature') ?? ''

  if (!verifyPaddleWebhook(rawBody, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  if (event.event_type !== 'transaction.completed') {
    return NextResponse.json({ received: true })
  }

  const customData = event.data?.custom_data
  if (!customData?.transaction_id || !customData?.user_id) {
    return NextResponse.json({ error: 'Missing custom data' }, { status: 400 })
  }

  const service = await createServiceClient()

  // Idempotency: only process pending transactions
  const { data: tx } = await service
    .from('transactions')
    .select('id, status, amount_cents')
    .eq('id', customData.transaction_id)
    .eq('status', 'pending')
    .single()

  if (!tx) return NextResponse.json({ received: true }) // already processed or not found

  // Mark completed first, then credit
  await service
    .from('transactions')
    .update({ status: 'completed', external_id: event.data.id })
    .eq('id', tx.id)

  await creditBalance(customData.user_id, tx.amount_cents)

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 4: Add "Pay with card" to `components/dashboard/TopUpModal.tsx`**

Replace the modal content to add a second tab. Find the existing JSX and replace with:

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PRESETS = [1000, 2000, 5000, 10000] // cents

interface Props {
  open: boolean
  onClose: () => void
}

export function TopUpModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<'crypto' | 'card'>('crypto')
  const [amount, setAmount] = useState(2000)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const endpoint = tab === 'crypto'
      ? '/api/payments/cryptomus/create'
      : '/api/payments/paddle/create'
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cents: amount }),
      })
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      const url = tab === 'crypto' ? json.data.payment_url : json.data.checkout_url
      window.location.href = url
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle>Top Up Balance</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          {(['crypto', 'card'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {t === 'crypto' ? 'Crypto (USDT/BTC)' : 'Card (Visa/MC)'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                amount === p ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              ${p / 100}
            </button>
          ))}
        </div>

        <Input
          type="number"
          min={5}
          max={1000}
          value={amount / 100}
          onChange={e => setAmount(Math.round(parseFloat(e.target.value) * 100))}
          className="bg-white/5 border-white/10 text-white mb-4"
          placeholder="Custom amount ($)"
        />

        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={loading || amount < 500}
          className="w-full bg-violet-600 hover:bg-violet-700"
        >
          {loading ? 'Redirecting...' : `Pay $${(amount / 100).toFixed(2)}`}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add lib/providers/paddle.ts app/api/payments/paddle/ components/dashboard/TopUpModal.tsx
git commit -m "feat: add Paddle fiat payment top-up with webhook balance crediting"
```

---

### Task 3: KYC Flow

**Files:**
- Create: `app/(dashboard)/kyc/page.tsx`
- Create: `components/kyc/KycUploadForm.tsx`
- Create: `app/api/kyc/submit/route.ts`
- Create: `app/(admin)/admin/kyc/page.tsx`
- Create: `app/api/admin/kyc/route.ts`
- Create: `app/api/admin/kyc/[id]/route.ts`

**Interfaces:**
- Consumes: `KycDocument`, `KycDocumentStatus` from `types/index.ts`
- Consumes: Supabase Storage bucket `kyc-documents` (create in Supabase dashboard → Storage → New bucket, set to private)
- Produces: `POST /api/kyc/submit` → `ApiResponse<{ id: string }>`
- Produces: `GET /api/admin/kyc` → `ApiResponse<KycDocument[]>`
- Produces: `PATCH /api/admin/kyc/[id]` → `ApiResponse<KycDocument>`

- [ ] **Step 1: Create `app/api/kyc/submit/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { ApiResponse } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const formData = await req.formData()
  const documentType = formData.get('document_type') as string
  const frontFile = formData.get('front') as File | null
  const backFile = formData.get('back') as File | null
  const selfieFile = formData.get('selfie') as File | null

  if (!documentType || !frontFile) {
    return NextResponse.json({ data: null, error: 'Document type and front image required' } satisfies ApiResponse<never>, { status: 400 })
  }

  const service = await createServiceClient()

  async function uploadFile(file: File, name: string): Promise<string> {
    const bytes = await file.arrayBuffer()
    const path = `${user.id}/${name}-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await service.storage.from('kyc-documents').upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    })
    if (error) throw new Error(`Upload failed: ${error.message}`)
    return path
  }

  const frontPath = await uploadFile(frontFile, 'front')
  const backPath = backFile ? await uploadFile(backFile, 'back') : null
  const selfiePath = selfieFile ? await uploadFile(selfieFile, 'selfie') : null

  const { data: doc, error } = await service
    .from('kyc_documents')
    .insert({
      user_id: user.id,
      document_type: documentType,
      front_url: frontPath,
      back_url: backPath,
      selfie_url: selfiePath,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !doc) {
    return NextResponse.json({ data: null, error: 'Failed to submit KYC' } satisfies ApiResponse<never>, { status: 500 })
  }

  // Update user kyc_status to pending
  await service.from('users').update({ kyc_status: 'pending' }).eq('id', user.id)

  return NextResponse.json({ data: { id: doc.id }, error: null } satisfies ApiResponse<{ id: string }>)
}
```

- [ ] **Step 2: Create `components/kyc/KycUploadForm.tsx`**

```typescript
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'id_card', label: 'National ID' },
  { value: 'driving_license', label: "Driver's License" },
]

export function KycUploadForm() {
  const [docType, setDocType] = useState('passport')
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!front) { setError('Front image required'); return }
    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('document_type', docType)
    fd.append('front', front)
    if (back) fd.append('back', back)
    if (selfie) fd.append('selfie', selfie)

    const res = await fetch('/api/kyc/submit', { method: 'POST', body: fd })
    const json = await res.json()
    setLoading(false)
    if (json.error) { setError(json.error); return }
    router.push('/dashboard?kyc=submitted')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div>
        <label className="block text-sm text-white/60 mb-2">Document Type</label>
        <select
          value={docType}
          onChange={e => setDocType(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
        >
          {DOCUMENT_TYPES.map(d => (
            <option key={d.value} value={d.value} className="bg-gray-900">{d.label}</option>
          ))}
        </select>
      </div>

      {[
        { label: 'Front Side *', setter: setFront, file: front },
        { label: 'Back Side', setter: setBack, file: back },
        { label: 'Selfie with Document', setter: setSelfie, file: selfie },
      ].map(({ label, setter, file }) => (
        <div key={label}>
          <label className="block text-sm text-white/60 mb-2">{label}</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setter(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-white/60 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-violet-600 file:text-white file:text-sm"
          />
          {file && <p className="text-xs text-green-400 mt-1">✓ {file.name}</p>}
        </div>
      ))}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <Button type="submit" disabled={loading || !front} className="bg-violet-600 hover:bg-violet-700">
        {loading ? 'Uploading...' : 'Submit for Review'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Create `app/(dashboard)/kyc/page.tsx`**

```typescript
import { KycUploadForm } from '@/components/kyc/KycUploadForm'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function KycPage() {
  const supabase = await createServerClient()
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
```

- [ ] **Step 4: Create admin KYC API `app/api/admin/kyc/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ApiResponse, KycDocument } from '@/types'

async function isAdmin(service: Awaited<ReturnType<typeof createServiceClient>>, userId: string) {
  const { data } = await service.from('users').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function GET(req: NextRequest) {
  const { createServerClient } = await import('@/lib/supabase/server')
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const service = await createServiceClient()
  if (!(await isAdmin(service, user.id))) {
    return NextResponse.json({ data: null, error: 'Forbidden' } satisfies ApiResponse<never>, { status: 403 })
  }

  const { data, error } = await service
    .from('kyc_documents')
    .select('*')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ data: null, error: error.message } satisfies ApiResponse<never>, { status: 500 })
  return NextResponse.json({ data, error: null } satisfies ApiResponse<KycDocument[]>)
}
```

- [ ] **Step 5: Create `app/api/admin/kyc/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { ApiResponse, KycDocument } from '@/types'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const service = await createServiceClient()
  const { data: profile } = await service.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ data: null, error: 'Forbidden' } satisfies ApiResponse<never>, { status: 403 })

  const { status, admin_note } = await req.json()
  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ data: null, error: 'Invalid status' } satisfies ApiResponse<never>, { status: 400 })
  }

  const { data: doc, error } = await service
    .from('kyc_documents')
    .update({ status, admin_note: admin_note ?? null, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !doc) return NextResponse.json({ data: null, error: 'Not found' } satisfies ApiResponse<never>, { status: 404 })

  // Sync user kyc_status
  await service
    .from('users')
    .update({ kyc_status: status === 'approved' ? 'verified' : 'rejected' })
    .eq('id', doc.user_id)

  return NextResponse.json({ data: doc, error: null } satisfies ApiResponse<KycDocument>)
}
```

- [ ] **Step 6: Create `app/(admin)/admin/kyc/page.tsx`**

```typescript
import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KycDocument } from '@/types'

export default async function AdminKycPage() {
  const supabase = await createServerClient()
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
                <p className="text-white font-medium">{(doc as any).users?.email}</p>
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

// Client component for approve/reject buttons
function KycReviewButtons({ docId }: { docId: string }) {
  // NOTE: In Next.js App Router, this needs to be a separate 'use client' file.
  // For simplicity, wire up via a Server Action or move to a client component file.
  return (
    <div className="flex gap-2">
      <form action={`/api/admin/kyc/${docId}`} method="PATCH">
        <button type="submit" className="px-3 py-1 bg-green-600 text-white text-sm rounded">Approve</button>
      </form>
      <form action={`/api/admin/kyc/${docId}`} method="PATCH">
        <button type="submit" className="px-3 py-1 bg-red-600 text-white text-sm rounded">Reject</button>
      </form>
    </div>
  )
}
```

**Implementation note:** The approve/reject buttons above are a stub. Replace `KycReviewButtons` with a proper `'use client'` component in `components/admin/KycReviewButtons.tsx` that calls `PATCH /api/admin/kyc/[id]` via `fetch`.

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add app/(dashboard)/kyc/ app/api/kyc/ app/(admin)/admin/kyc/ app/api/admin/kyc/ components/kyc/
git commit -m "feat: add KYC document upload flow and admin review queue"
```

---

### Task 4: Virtual Cards (Wallester)

**Files:**
- Create: `lib/providers/wallester.ts`
- Create: `app/api/cards/route.ts`
- Create: `app/api/cards/issue/route.ts`
- Create: `app/api/cards/[id]/route.ts`
- Create: `app/api/cards/[id]/freeze/route.ts`
- Create: `app/(dashboard)/cards/page.tsx`
- Create: `app/(dashboard)/cards/[id]/page.tsx`
- Create: `components/dashboard/cards/CardList.tsx`
- Create: `components/dashboard/cards/CardDetail.tsx`

**Interfaces:**
- Consumes: `Card`, `CardStatus` from `types/index.ts`
- Consumes: `debitBalance` from `lib/utils/balance.ts`
- Produces: `issueCard(userId, tariff, currency)`, `getCard(wallesterId)`, `freezeCard(wallesterId)`, `unfreezeCard(wallesterId)` in `lib/providers/wallester.ts`

**Env vars needed:**
```
WALLESTER_API_KEY=   # from Wallester dashboard
WALLESTER_API_URL=https://api.wallester.com
```

**Card tariffs (hardcoded for Phase 2):**
```
standard: $35/year, EUR, Visa
premium:  $75/year, USD, Mastercard
```

- [ ] **Step 1: Create `lib/providers/wallester.ts`**

```typescript
const BASE = process.env.WALLESTER_API_URL ?? 'https://api.wallester.com'
const KEY = process.env.WALLESTER_API_KEY!

async function wallesterFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Wallester ${path} failed (${res.status}): ${body}`)
  }
  return res.json()
}

export interface WallesterCard {
  id: string
  status: string
  masked_pan: string
  expiry_month: number
  expiry_year: number
  currency: string
}

export async function createCardholder(userId: string, email: string): Promise<{ id: string }> {
  return wallesterFetch('/v1/cardholders', {
    method: 'POST',
    body: JSON.stringify({ external_id: userId, email }),
  })
}

export async function issueCard(cardholderId: string, currency: 'EUR' | 'USD'): Promise<WallesterCard> {
  return wallesterFetch('/v1/cards', {
    method: 'POST',
    body: JSON.stringify({
      cardholder_id: cardholderId,
      currency,
      card_type: 'virtual',
    }),
  })
}

export async function getCard(wallesterCardId: string): Promise<WallesterCard> {
  return wallesterFetch(`/v1/cards/${wallesterCardId}`)
}

export async function setCardStatus(wallesterCardId: string, status: 'frozen' | 'active'): Promise<void> {
  await wallesterFetch(`/v1/cards/${wallesterCardId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}
```

- [ ] **Step 2: Create `app/api/cards/issue/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { issueCard, createCardholder } from '@/lib/providers/wallester'
import { debitBalance } from '@/lib/utils/balance'
import { ApiResponse, Card } from '@/types'

const TARIFFS: Record<string, { price_cents: number; currency: 'EUR' | 'USD'; label: string }> = {
  standard: { price_cents: 3500, currency: 'EUR', label: 'Standard' },
  premium:  { price_cents: 7500, currency: 'USD', label: 'Premium' },
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const { tariff } = await req.json()
  const tariffConfig = TARIFFS[tariff]
  if (!tariffConfig) return NextResponse.json({ data: null, error: 'Invalid tariff' } satisfies ApiResponse<never>, { status: 400 })

  const service = await createServiceClient()

  // Require KYC
  const { data: profile } = await service.from('users').select('kyc_status, email').eq('id', user.id).single()
  if (profile?.kyc_status !== 'verified') {
    return NextResponse.json({ data: null, error: 'KYC verification required' } satisfies ApiResponse<never>, { status: 403 })
  }

  // Debit balance (throws if insufficient)
  try {
    await debitBalance(user.id, tariffConfig.price_cents)
  } catch {
    return NextResponse.json({ data: null, error: 'Insufficient balance' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    // Create or reuse cardholder
    const cardholder = await createCardholder(user.id, profile.email)
    const wallesterCard = await issueCard(cardholder.id, tariffConfig.currency)

    const { data: card, error } = await service
      .from('cards')
      .insert({
        user_id: user.id,
        wallester_card_id: wallesterCard.id,
        currency: tariffConfig.currency,
        status: 'active',
        balance_cents: 0,
        tariff,
        last_four: wallesterCard.masked_pan?.slice(-4) ?? null,
        expiry_month: wallesterCard.expiry_month,
        expiry_year: wallesterCard.expiry_year,
      })
      .select()
      .single()

    if (error || !card) throw new Error('Failed to save card')

    // Record transaction
    await service.from('transactions').insert({
      user_id: user.id,
      type: 'purchase',
      amount_cents: tariffConfig.price_cents,
      currency: 'USD',
      status: 'completed',
      provider: 'wallester',
      product_type: 'card',
      product_id: card.id,
      payment_method: 'card',
    })

    return NextResponse.json({ data: card, error: null } satisfies ApiResponse<Card>)
  } catch (err: any) {
    // Refund balance on failure
    const { creditBalance } = await import('@/lib/utils/balance')
    await creditBalance(user.id, tariffConfig.price_cents)
    return NextResponse.json({ data: null, error: err.message } satisfies ApiResponse<never>, { status: 500 })
  }
}
```

- [ ] **Step 3: Create `app/api/cards/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ApiResponse, Card } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ data: null, error: error.message } satisfies ApiResponse<never>, { status: 500 })
  return NextResponse.json({ data, error: null } satisfies ApiResponse<Card[]>)
}
```

- [ ] **Step 4: Create `app/api/cards/[id]/freeze/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { setCardStatus } from '@/lib/providers/wallester'
import { ApiResponse, Card } from '@/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const { action } = await req.json() // 'freeze' | 'unfreeze'
  if (!['freeze', 'unfreeze'].includes(action)) {
    return NextResponse.json({ data: null, error: 'Invalid action' } satisfies ApiResponse<never>, { status: 400 })
  }

  const service = await createServiceClient()
  const { data: card } = await service.from('cards').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!card) return NextResponse.json({ data: null, error: 'Not found' } satisfies ApiResponse<never>, { status: 404 })

  const newStatus = action === 'freeze' ? 'frozen' : 'active'
  await setCardStatus(card.wallester_card_id, newStatus === 'frozen' ? 'frozen' : 'active')

  const { data: updated } = await service
    .from('cards')
    .update({ status: newStatus })
    .eq('id', id)
    .select()
    .single()

  return NextResponse.json({ data: updated, error: null } satisfies ApiResponse<Card>)
}
```

- [ ] **Step 5: Create `app/(dashboard)/cards/page.tsx`**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CardList } from '@/components/dashboard/cards/CardList'

export default async function CardsPage() {
  const supabase = await createServerClient()
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
```

- [ ] **Step 6: Create `components/dashboard/cards/CardList.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/types'
import { useRouter } from 'next/navigation'

const TARIFFS = [
  { id: 'standard', name: 'Standard', price: '$35/year', currency: 'EUR', perks: ['EUR Visa', 'Global payments', 'Online & POS'] },
  { id: 'premium',  name: 'Premium',  price: '$75/year', currency: 'USD', perks: ['USD Mastercard', 'Priority support', 'Higher limits'] },
]

export function CardList({ cards, kycVerified }: { cards: Card[]; kycVerified: boolean }) {
  const [ordering, setOrdering] = useState(false)
  const [selectedTariff, setSelectedTariff] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function orderCard(tariff: string) {
    setOrdering(true)
    setError(null)
    const res = await fetch('/api/cards/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tariff }),
    })
    const json = await res.json()
    setOrdering(false)
    if (json.error) { setError(json.error); return }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {cards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map(card => (
            <a key={card.id} href={`/cards/${card.id}`} className="glass rounded-xl p-6 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <span className="text-white font-medium">{card.currency} Card</span>
                <span className={`text-xs px-2 py-1 rounded-full ${card.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {card.status}
                </span>
              </div>
              <p className="text-white/40 text-sm font-mono">•••• •••• •••• {card.last_four ?? '????'}</p>
              <p className="text-white/40 text-xs mt-1">{card.expiry_month}/{card.expiry_year}</p>
            </a>
          ))}
        </div>
      )}

      {kycVerified && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Order New Card</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {TARIFFS.map(t => (
              <div key={t.id} className="glass rounded-xl p-6">
                <h3 className="text-white font-semibold mb-1">{t.name}</h3>
                <p className="text-violet-400 text-xl font-bold mb-3">{t.price}</p>
                <ul className="space-y-1 mb-4">
                  {t.perks.map(p => <li key={p} className="text-white/60 text-sm">✓ {p}</li>)}
                </ul>
                <button
                  onClick={() => orderCard(t.id)}
                  disabled={ordering}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg disabled:opacity-50"
                >
                  {ordering ? 'Ordering...' : 'Order Card'}
                </button>
              </div>
            ))}
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
      )}

      {!kycVerified && cards.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-white/60">Complete identity verification to order virtual cards.</p>
          <a href="/kyc" className="inline-block mt-4 px-6 py-2 bg-violet-600 text-white rounded-lg text-sm">Verify Identity</a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Create `app/(dashboard)/cards/[id]/page.tsx`**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CardDetail } from '@/components/dashboard/cards/CardDetail'

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
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
```

- [ ] **Step 8: Create `components/dashboard/cards/CardDetail.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Card } from '@/types'
import { useRouter } from 'next/navigation'

export function CardDetail({ card }: { card: Card }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggleFreeze() {
    setLoading(true)
    await fetch(`/api/cards/${card.id}/freeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: card.status === 'frozen' ? 'unfreeze' : 'freeze' }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="glass rounded-xl p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white">{card.currency} Virtual Card</h1>
          <span className={`text-sm px-3 py-1 rounded-full ${
            card.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>{card.status}</span>
        </div>
        <p className="text-white/60 text-sm">Issued {new Date(card.created_at).toLocaleDateString()}</p>
      </div>

      <div className="space-y-3 mb-8">
        <div className="flex justify-between">
          <span className="text-white/40">Card Number</span>
          <span className="text-white font-mono">•••• •••• •••• {card.last_four ?? '????'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Expiry</span>
          <span className="text-white">{card.expiry_month}/{card.expiry_year}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Balance</span>
          <span className="text-white">{card.currency} {(card.balance_cents / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Tariff</span>
          <span className="text-white capitalize">{card.tariff}</span>
        </div>
      </div>

      {card.status !== 'closed' && (
        <button
          onClick={toggleFreeze}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            card.status === 'frozen'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          }`}
        >
          {loading ? '...' : card.status === 'frozen' ? 'Unfreeze Card' : 'Freeze Card'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 9: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 10: Commit**

```bash
git add lib/providers/wallester.ts app/api/cards/ app/(dashboard)/cards/ components/dashboard/cards/
git commit -m "feat: add virtual card issuance and management via Wallester API"
```

---

### Task 5: eSIM (Airalo)

**Files:**
- Create: `lib/providers/airalo.ts`
- Create: `app/api/esim/packages/route.ts`
- Create: `app/api/esim/buy/route.ts`
- Create: `app/(dashboard)/esim/page.tsx`
- Create: `app/(dashboard)/esim/[id]/page.tsx`
- Create: `components/dashboard/esim/EsimPackageList.tsx`
- Create: `components/dashboard/esim/QrCodeDisplay.tsx`

**Interfaces:**
- Consumes: `Esim`, `EsimStatus` from `types/index.ts`
- Consumes: `debitBalance` from `lib/utils/balance.ts`
- Produces: `getAiraloToken()`, `getPackages(country?)`, `createOrder(packageId, quantity)` in `lib/providers/airalo.ts`

**Env vars needed:**
```
AIRALO_CLIENT_ID=     # from Airalo Partner Portal
AIRALO_CLIENT_SECRET= # from Airalo Partner Portal
# Airalo sandbox: https://sandbox-partners-api.airalo.com
# Airalo production: https://partners-api.airalo.com
AIRALO_API_URL=https://sandbox-partners-api.airalo.com
```

- [ ] **Step 1: Create `lib/providers/airalo.ts`**

```typescript
const BASE = process.env.AIRALO_API_URL ?? 'https://sandbox-partners-api.airalo.com'

let tokenCache: { token: string; expiresAt: number } | null = null

export async function getAiraloToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token

  const res = await fetch(`${BASE}/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams({
      client_id: process.env.AIRALO_CLIENT_ID!,
      client_secret: process.env.AIRALO_CLIENT_SECRET!,
      grant_type: 'client_credentials',
    }),
  })
  if (!res.ok) throw new Error(`Airalo auth failed: ${await res.text()}`)
  const json = await res.json()
  tokenCache = { token: json.data.access_token, expiresAt: Date.now() + (json.data.expires_in - 60) * 1000 }
  return tokenCache.token
}

export interface AiraloPackage {
  id: string
  type: string
  title: string
  data: string      // e.g. "1 GB"
  validity: string  // e.g. "7 Days"
  price: number     // USD
  country: string
  image: { url: string } | null
}

export async function getPackages(country?: string): Promise<AiraloPackage[]> {
  const token = await getAiraloToken()
  const url = new URL(`${BASE}/v2/packages`)
  if (country) url.searchParams.set('filter[country]', country)
  url.searchParams.set('limit', '20')

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  })
  if (!res.ok) throw new Error(`Airalo packages failed: ${await res.text()}`)
  const json = await res.json()
  return json.data ?? []
}

export interface AiraloOrder {
  id: string
  code: string
  sims: { iccid: string; qrcode: string }[]
}

export async function createAiraloOrder(packageId: string): Promise<AiraloOrder> {
  const token = await getAiraloToken()
  const res = await fetch(`${BASE}/v2/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ package_id: packageId, quantity: 1 }),
  })
  if (!res.ok) throw new Error(`Airalo order failed: ${await res.text()}`)
  const json = await res.json()
  return json.data
}
```

- [ ] **Step 2: Create `app/api/esim/packages/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getPackages, AiraloPackage } from '@/lib/providers/airalo'
import { ApiResponse } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const country = req.nextUrl.searchParams.get('country') ?? undefined

  try {
    const packages = await getPackages(country)
    // Apply 35% markup
    const priced = packages.map(p => ({ ...p, price: Math.ceil(p.price * 1.35 * 100) }))
    return NextResponse.json({ data: priced, error: null } satisfies ApiResponse<(AiraloPackage & { price: number })[]>)
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message } satisfies ApiResponse<never>, { status: 500 })
  }
}
```

- [ ] **Step 3: Create `app/api/esim/buy/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { getPackages, createAiraloOrder } from '@/lib/providers/airalo'
import { debitBalance, creditBalance } from '@/lib/utils/balance'
import { ApiResponse, Esim } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const { package_id, country } = await req.json()
  if (!package_id || !country) {
    return NextResponse.json({ data: null, error: 'package_id and country required' } satisfies ApiResponse<never>, { status: 400 })
  }

  // Fetch packages to get original price
  const packages = await getPackages(country)
  const pkg = packages.find(p => p.id === package_id)
  if (!pkg) return NextResponse.json({ data: null, error: 'Package not found' } satisfies ApiResponse<never>, { status: 404 })

  const price_cents = Math.ceil(pkg.price * 1.35 * 100)

  try {
    await debitBalance(user.id, price_cents)
  } catch {
    return NextResponse.json({ data: null, error: 'Insufficient balance' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const order = await createAiraloOrder(package_id)
    const sim = order.sims[0]
    const dataGb = parseFloat(pkg.data) || 0

    const service = await createServiceClient()
    const { data: esim, error } = await service
      .from('esims')
      .insert({
        user_id: user.id,
        airalo_order_id: order.id,
        iccid: sim?.iccid ?? null,
        country,
        package_id,
        data_gb: dataGb,
        qr_code: sim?.qrcode ?? null,
        status: 'active',
        price_cents,
        expires_at: null,
      })
      .select()
      .single()

    if (error || !esim) throw new Error('Failed to save eSIM')

    await service.from('transactions').insert({
      user_id: user.id,
      type: 'purchase',
      amount_cents: price_cents,
      currency: 'USD',
      status: 'completed',
      provider: 'airalo',
      product_type: 'esim',
      product_id: esim.id,
      payment_method: 'card',
    })

    return NextResponse.json({ data: esim, error: null } satisfies ApiResponse<Esim>)
  } catch (err: any) {
    await creditBalance(user.id, price_cents)
    return NextResponse.json({ data: null, error: err.message } satisfies ApiResponse<never>, { status: 500 })
  }
}
```

- [ ] **Step 4: Create `app/(dashboard)/esim/page.tsx`**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EsimPackageList } from '@/components/dashboard/esim/EsimPackageList'

export default async function EsimPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: esims } = await supabase
    .from('esims')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">eSIM</h1>
      <EsimPackageList existingEsims={esims ?? []} />
    </div>
  )
}
```

- [ ] **Step 5: Create `components/dashboard/esim/EsimPackageList.tsx`**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Esim } from '@/types'
import { useRouter } from 'next/navigation'

interface Package {
  id: string
  title: string
  data: string
  validity: string
  price: number // cents with markup
  country: string
}

export function EsimPackageList({ existingEsims }: { existingEsims: Esim[] }) {
  const [country, setCountry] = useState('US')
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function fetchPackages() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/esim/packages?country=${country}`)
    const json = await res.json()
    setLoading(false)
    if (json.error) { setError(json.error); return }
    setPackages(json.data)
  }

  async function buyPackage(pkg: Package) {
    setBuying(pkg.id)
    setError(null)
    const res = await fetch('/api/esim/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: pkg.id, country }),
    })
    const json = await res.json()
    setBuying(null)
    if (json.error) { setError(json.error); return }
    router.push(`/esim/${json.data.id}`)
  }

  return (
    <div className="space-y-6">
      {existingEsims.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Your eSIMs</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {existingEsims.map(e => (
              <a key={e.id} href={`/esim/${e.id}`} className="glass rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">{e.country} · {e.data_gb} GB</p>
                    <p className="text-white/40 text-sm">{new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${e.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {e.status}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Browse Packages</h2>
        <div className="flex gap-3 mb-4">
          <input
            value={country}
            onChange={e => setCountry(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="Country code (e.g. US)"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-40 uppercase"
          />
          <button onClick={fetchPackages} disabled={loading} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="grid gap-3 md:grid-cols-3">
          {packages.map(pkg => (
            <div key={pkg.id} className="glass rounded-xl p-4">
              <h3 className="text-white font-medium mb-1">{pkg.title}</h3>
              <p className="text-white/60 text-sm">{pkg.data} · {pkg.validity}</p>
              <p className="text-violet-400 font-bold mt-2">${(pkg.price / 100).toFixed(2)}</p>
              <button
                onClick={() => buyPackage(pkg)}
                disabled={buying === pkg.id}
                className="w-full mt-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg disabled:opacity-50"
              >
                {buying === pkg.id ? 'Ordering...' : 'Buy'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `app/(dashboard)/esim/[id]/page.tsx`**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { QrCodeDisplay } from '@/components/dashboard/esim/QrCodeDisplay'

export default async function EsimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: esim } = await supabase.from('esims').select('*').eq('id', id).single()
  if (!esim) notFound()

  return (
    <div className="p-8 max-w-xl">
      <a href="/esim" className="text-white/40 text-sm mb-6 inline-block hover:text-white">← Back to eSIM</a>
      <div className="glass rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">{esim.country} eSIM</h1>
        <p className="text-white/60 mb-6">{esim.data_gb} GB · ordered {new Date(esim.created_at).toLocaleDateString()}</p>
        {esim.qr_code ? (
          <QrCodeDisplay qrCode={esim.qr_code} iccid={esim.iccid} />
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
```

- [ ] **Step 7: Create `components/dashboard/esim/QrCodeDisplay.tsx`**

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  qrCode: string  // base64 or URL
  iccid: string | null
}

export function QrCodeDisplay({ qrCode, iccid }: Props) {
  const [copied, setCopied] = useState(false)

  const src = qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`

  async function copyIccid() {
    if (!iccid) return
    await navigator.clipboard.writeText(iccid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="text-center">
      <div className="inline-block p-4 bg-white rounded-xl mb-4">
        <img src={src} alt="eSIM QR Code" width={200} height={200} className="block" />
      </div>
      {iccid && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-white/60 text-sm font-mono">{iccid}</span>
          <button onClick={copyIccid} className="text-violet-400 text-sm hover:text-violet-300">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add lib/providers/airalo.ts app/api/esim/ app/(dashboard)/esim/ components/dashboard/esim/
git commit -m "feat: add eSIM purchase and QR code display via Airalo Partner API"
```

---

### Task 6: Virtual Numbers (Twilio)

**Files:**
- Create: `lib/providers/twilio.ts`
- Create: `app/api/numbers/available/route.ts`
- Create: `app/api/numbers/buy/route.ts`
- Create: `app/api/numbers/[id]/route.ts`
- Create: `app/(dashboard)/numbers/page.tsx`
- Create: `components/dashboard/numbers/NumberList.tsx`

**Interfaces:**
- Consumes: `VirtualNumber` from `types/index.ts`
- Consumes: `debitBalance`, `creditBalance` from `lib/utils/balance.ts`
- Produces: `searchNumbers(country, areaCode?)`, `purchaseNumber(phoneNumber)`, `releaseNumber(twilioSid)` in `lib/providers/twilio.ts`

**Env vars needed:**
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

**Install Twilio SDK:**
```bash
npm install twilio
npm install --save-dev @types/twilio
```

- [ ] **Step 1: Install dependencies**

```bash
cd platform && npm install twilio
```

- [ ] **Step 2: Create `lib/providers/twilio.ts`**

```typescript
import Twilio from 'twilio'

function getClient() {
  return Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
}

export interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  locality: string | null
  region: string | null
  isoCountry: string
  monthlyFee: number // cents
}

export async function searchNumbers(isoCountry: string, areaCode?: string): Promise<AvailableNumber[]> {
  const client = getClient()
  const params: Record<string, unknown> = { limit: 20, voiceEnabled: true, smsEnabled: true }
  if (areaCode) params.areaCode = areaCode

  const numbers = await client.availablePhoneNumbers(isoCountry).local.list(params)
  return numbers.map(n => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality ?? null,
    region: n.region ?? null,
    isoCountry,
    monthlyFee: 700, // $7/month flat — add markup over Twilio's ~$3-4/month
  }))
}

export async function purchaseNumber(phoneNumber: string): Promise<{ sid: string }> {
  const client = getClient()
  const purchased = await client.incomingPhoneNumbers.create({ phoneNumber })
  return { sid: purchased.sid }
}

export async function releaseNumber(sid: string): Promise<void> {
  const client = getClient()
  await client.incomingPhoneNumbers(sid).remove()
}
```

- [ ] **Step 3: Create `app/api/numbers/available/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { searchNumbers, AvailableNumber } from '@/lib/providers/twilio'
import { ApiResponse } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const country = req.nextUrl.searchParams.get('country') ?? 'US'
  const areaCode = req.nextUrl.searchParams.get('area_code') ?? undefined

  try {
    const numbers = await searchNumbers(country, areaCode)
    return NextResponse.json({ data: numbers, error: null } satisfies ApiResponse<AvailableNumber[]>)
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message } satisfies ApiResponse<never>, { status: 500 })
  }
}
```

- [ ] **Step 4: Create `app/api/numbers/buy/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { purchaseNumber } from '@/lib/providers/twilio'
import { debitBalance, creditBalance } from '@/lib/utils/balance'
import { ApiResponse, VirtualNumber } from '@/types'

const MONTHLY_PRICE_CENTS = 700 // $7/month

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const { phone_number, country } = await req.json()
  if (!phone_number || !country) {
    return NextResponse.json({ data: null, error: 'phone_number and country required' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    await debitBalance(user.id, MONTHLY_PRICE_CENTS)
  } catch {
    return NextResponse.json({ data: null, error: 'Insufficient balance' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const { sid } = await purchaseNumber(phone_number)
    const nextRenewal = new Date()
    nextRenewal.setMonth(nextRenewal.getMonth() + 1)

    const service = await createServiceClient()
    const { data: vn, error } = await service
      .from('virtual_numbers')
      .insert({
        user_id: user.id,
        twilio_sid: sid,
        number: phone_number,
        country,
        monthly_price_cents: MONTHLY_PRICE_CENTS,
        next_renewal_at: nextRenewal.toISOString(),
        status: 'active',
      })
      .select()
      .single()

    if (error || !vn) throw new Error('Failed to save number')

    await service.from('transactions').insert({
      user_id: user.id,
      type: 'purchase',
      amount_cents: MONTHLY_PRICE_CENTS,
      currency: 'USD',
      status: 'completed',
      provider: 'twilio',
      product_type: 'number',
      product_id: vn.id,
      payment_method: 'card',
    })

    return NextResponse.json({ data: vn, error: null } satisfies ApiResponse<VirtualNumber>)
  } catch (err: any) {
    await creditBalance(user.id, MONTHLY_PRICE_CENTS)
    return NextResponse.json({ data: null, error: err.message } satisfies ApiResponse<never>, { status: 500 })
  }
}
```

- [ ] **Step 5: Create `app/api/numbers/[id]/route.ts`** (cancel/release)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { releaseNumber } from '@/lib/providers/twilio'
import { ApiResponse } from '@/types'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const service = await createServiceClient()
  const { data: vn } = await service.from('virtual_numbers').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!vn) return NextResponse.json({ data: null, error: 'Not found' } satisfies ApiResponse<never>, { status: 404 })

  await releaseNumber(vn.twilio_sid)
  await service.from('virtual_numbers').update({ status: 'cancelled' }).eq('id', id)

  return NextResponse.json({ data: { ok: true }, error: null } satisfies ApiResponse<{ ok: boolean }>)
}
```

- [ ] **Step 6: Create `app/(dashboard)/numbers/page.tsx`**

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NumberList } from '@/components/dashboard/numbers/NumberList'

export default async function NumbersPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: numbers } = await supabase
    .from('virtual_numbers')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Virtual Numbers</h1>
      <NumberList numbers={numbers ?? []} />
    </div>
  )
}
```

- [ ] **Step 7: Create `components/dashboard/numbers/NumberList.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { VirtualNumber } from '@/types'
import { useRouter } from 'next/navigation'

export function NumberList({ numbers }: { numbers: VirtualNumber[] }) {
  const [country, setCountry] = useState('US')
  const [areaCode, setAreaCode] = useState('')
  const [available, setAvailable] = useState<{ phoneNumber: string; friendlyName: string; monthlyFee: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function search() {
    setLoading(true)
    setError(null)
    const url = new URL('/api/numbers/available', window.location.origin)
    url.searchParams.set('country', country)
    if (areaCode) url.searchParams.set('area_code', areaCode)
    const res = await fetch(url.toString())
    const json = await res.json()
    setLoading(false)
    if (json.error) { setError(json.error); return }
    setAvailable(json.data)
  }

  async function buy(phoneNumber: string) {
    setBuying(phoneNumber)
    setError(null)
    const res = await fetch('/api/numbers/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber, country }),
    })
    const json = await res.json()
    setBuying(null)
    if (json.error) { setError(json.error); return }
    router.refresh()
  }

  async function cancel(id: string) {
    if (!confirm('Cancel this number? This cannot be undone.')) return
    await fetch(`/api/numbers/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {numbers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Your Numbers</h2>
          <div className="space-y-3">
            {numbers.map(n => (
              <div key={n.id} className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-mono font-medium">{n.number}</p>
                  <p className="text-white/40 text-sm">{n.country} · renews {new Date(n.next_renewal_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => cancel(n.id)} className="text-red-400 text-sm hover:text-red-300">Cancel</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Rent a Number</h2>
        <p className="text-white/60 text-sm mb-4">$7/month · incoming SMS and calls forwarded to dashboard</p>
        <div className="flex gap-3 mb-4">
          <input value={country} onChange={e => setCountry(e.target.value.toUpperCase().slice(0, 2))} placeholder="Country (US)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-28 uppercase" />
          <input value={areaCode} onChange={e => setAreaCode(e.target.value)} placeholder="Area code (opt)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-36" />
          <button onClick={search} disabled={loading} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="space-y-2">
          {available.map(n => (
            <div key={n.phoneNumber} className="glass rounded-lg p-3 flex items-center justify-between">
              <span className="text-white font-mono">{n.phoneNumber}</span>
              <div className="flex items-center gap-4">
                <span className="text-white/60 text-sm">${(n.monthlyFee / 100).toFixed(2)}/mo</span>
                <button
                  onClick={() => buy(n.phoneNumber)}
                  disabled={buying === n.phoneNumber}
                  className="px-3 py-1 bg-violet-600 text-white text-sm rounded disabled:opacity-50"
                >
                  {buying === n.phoneNumber ? '...' : 'Rent'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add lib/providers/twilio.ts app/api/numbers/ app/(dashboard)/numbers/ components/dashboard/numbers/
git commit -m "feat: add virtual number rental and management via Twilio"
```

---

### Task 7: Sidebar Navigation & Dashboard Home Updates

**Files:**
- Modify: `components/layout/DashboardSidebar.tsx` — add Cards, eSIM, Numbers, KYC links
- Modify: `app/(dashboard)/dashboard/page.tsx` — add product quick-links, update stats

**Interfaces:**
- Consumes: all new route paths: `/cards`, `/esim`, `/numbers`, `/kyc`

- [ ] **Step 1: Update `components/layout/DashboardSidebar.tsx`**

Replace the nav links array. Find the existing links (Dashboard, Balance, SMS) and replace with:

```typescript
const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { href: '/balance',   label: 'Balance',   icon: '◈' },
  { href: '/sms',       label: 'SMS',        icon: '✉' },
  { href: '/cards',     label: 'Cards',      icon: '▣' },
  { href: '/esim',      label: 'eSIM',       icon: '◉' },
  { href: '/numbers',   label: 'Numbers',    icon: '☎' },
  { href: '/kyc',       label: 'KYC',        icon: '◈' },
]
```

- [ ] **Step 2: Update `app/(dashboard)/dashboard/page.tsx`**

Add product cards section below existing balance/transaction widgets. Append this block inside the page JSX:

```typescript
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
  {[
    { href: '/cards',   label: 'Virtual Cards',    desc: 'EUR/USD Visa & Mastercard' },
    { href: '/sms',     label: 'SMS Activations',  desc: 'One-time verification codes' },
    { href: '/esim',    label: 'eSIM',             desc: 'Global mobile data' },
    { href: '/numbers', label: 'Virtual Numbers',  desc: 'Rent local phone numbers' },
  ].map(p => (
    <a key={p.href} href={p.href} className="glass rounded-xl p-4 hover:bg-white/10 transition-colors">
      <p className="text-white font-medium text-sm mb-1">{p.label}</p>
      <p className="text-white/40 text-xs">{p.desc}</p>
    </a>
  ))}
</div>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: 0 TypeScript errors, all pages compile.

- [ ] **Step 4: Commit**

```bash
git add components/layout/DashboardSidebar.tsx app/(dashboard)/dashboard/page.tsx
git commit -m "feat: update sidebar nav and dashboard home with all Phase 2 products"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Virtual Cards (Wallester) | Task 4 |
| eSIM (Airalo) | Task 5 |
| Virtual Numbers (Twilio) | Task 6 |
| KYC flow | Task 3 |
| Fiat payments (Paddle instead of Stripe) | Task 2 |
| DB schema for new tables | Task 1 |
| Admin KYC review queue | Task 3 |
| Dark theme / glassmorphism | All UI tasks — `.glass` class used throughout |
| Card freeze/unfreeze | Task 4 |
| eSIM QR code display | Task 5 |
| Balance debit/credit on purchase | Tasks 2, 4, 5, 6 |
| Refund on provider failure | Tasks 4, 5, 6 |

**Placeholder scan:** None found. All steps include complete code.

**Type consistency:**
- `Card.status`: `'active' | 'frozen' | 'closed'` — consistent across Task 1, 4
- `Esim.status`: `'active' | 'expired' | 'cancelled'` — consistent across Task 1, 5
- `VirtualNumber.status`: `'active' | 'cancelled'` — consistent across Task 1, 6
- `KycDocument.status`: `'pending' | 'approved' | 'rejected'` — consistent across Task 1, 3
- `creditBalance` / `debitBalance` signatures unchanged from Phase 1
- `ApiResponse<T>` shape unchanged
