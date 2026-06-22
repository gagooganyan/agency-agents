# Global Fintech Platform — Design Spec
**Date:** 2026-06-22  
**Status:** Approved  
**Budget:** up to $5,000  
**Jurisdiction:** UAE (Freezone — DMCC or IFZA)

---

## 1. Product Overview

A global platform selling four digital financial products to users worldwide. The primary audience is people who need access to foreign payment infrastructure, virtual phone numbers, and mobile internet abroad.

**Core products:**
1. Virtual Cards (EUR/USD) — via Wallester API
2. SMS Activations (one-time numbers) — via 5sim Reseller API
3. Long-term Virtual Numbers — via Twilio
4. eSIM packages — via Airalo Partner API

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js 14 (App Router) |
| UI Components | Tailwind CSS + shadcn/ui |
| Database + Auth | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Crypto Payments | Cryptomus (USDT / BTC / ETH) |
| Fiat Payments | Stripe |
| Automation | n8n (notifications, webhooks, Telegram bot) |
| UI/UX | ui-ux-pro-max skill (dark theme, glassmorphism) |
| Testing | Playwright |

---

## 3. Architecture

```
User
  └─► Next.js Frontend (Landing · Dashboard · Admin)
        └─► Next.js API Routes
              ├─► Supabase (DB + Auth)
              ├─► Cryptomus + Stripe (payments)
              └─► External Providers
                    ├─► Wallester (virtual cards)
                    ├─► 5sim (SMS activations)
                    ├─► Airalo (eSIM)
                    └─► Twilio (virtual numbers)
```

---

## 4. Database Schema

### users
```sql
id, email, name, password_hash,
kyc_status (pending | verified | rejected),
balance_usd, country, referral_code,
two_fa_enabled, created_at
```

### cards
```sql
id, user_id, wallester_card_id,
currency (EUR | USD), status (active | frozen | closed),
balance, tariff, card_number_encrypted,
expiry, cvv_encrypted, created_at
```

### sims
```sql
id, user_id, phone_number, service,
country, status (waiting | received | cancelled),
sms_code, expires_at, price_paid, created_at
```

### virtual_numbers
```sql
id, user_id, number, provider,
country, expires_at, monthly_price, created_at
```

### esims
```sql
id, user_id, airalo_order_id,
country, data_gb, qr_code,
status (active | expired), expires_at, created_at
```

### transactions
```sql
id, user_id, type (topup | purchase | refund),
amount, currency, status (pending | completed | failed),
provider, product_type, product_id,
payment_method (crypto | card), created_at
```

### referrals
```sql
id, referrer_id, referee_id,
bonus_amount, bonus_paid, created_at
```

---

## 5. User Flow

```
Landing Page
  → Register (email / Google / Telegram OAuth)
    → Email verification
      → Top up balance (Cryptomus or Stripe)
        → Choose product:
            ├── Card → select tariff → KYC upload → API issue → card dashboard
            ├── SMS → select country + service → get number → receive SMS → show code
            ├── eSIM → select country + package → pay → QR code → install instructions
            └── Number → select country → rent → incoming SMS/calls in dashboard
```

---

## 6. Monetization

| Product | Revenue Model | Margin |
|---|---|---|
| Virtual Cards | Annual subscription ~$35/year + 2–3% FX markup + $0.25/topup fee | High |
| SMS Activations | Buy at $0.05–0.3 via 5sim, sell at $0.15–0.8 | ~100% |
| eSIM | Buy via Airalo, sell with 25–40% markup | 25–40% |
| Virtual Numbers | Buy at $3–5/mo, sell at $7–12/mo | ~100% |
| Referral Program | 10% of each referred user's payments | Acquisition cost |

---

## 7. Product Modules

### 7.1 Virtual Cards
- Provider: Wallester (Estonia, Visa/Mastercard, white-label API)
- User selects tariff → pays → card issued via API → card details shown in dashboard
- Top-up: crypto or fiat → converted → card balance updated
- KYC required before card issuance

### 7.2 SMS Activations
- Provider: 5sim (reseller API)
- User selects country + service (Google, Telegram, WhatsApp, etc.)
- Platform calls 5sim API → returns number → polls for incoming SMS → shows code in real time
- One-time use, expires after 20 minutes if no SMS

### 7.3 eSIM
- Provider: Airalo Partner API
- User selects country + data package → pays → Airalo order created → QR code returned
- Dashboard shows QR + installation guide per device type (iPhone / Android)

### 7.4 Virtual Numbers
- Provider: Twilio
- Monthly rental, incoming SMS and calls forwarded to dashboard
- User can renew or release the number

---

## 8. Admin Panel (`/admin`)

- **Dashboard:** revenue, new users, active cards, conversion rate
- **Users:** list, balance, KYC status, block/unblock
- **Orders:** all transactions, statuses, manual refunds
- **Products:** manage tariffs and pricing
- **KYC Queue:** review passport photos, approve or reject
- **Broadcast:** send emails or push notifications to all users

---

## 9. Security

- Card data encrypted with AES-256, never stored in plaintext
- Mandatory 2FA (TOTP) for card management and withdrawals
- Rate limiting on all API endpoints (prevent brute force)
- Row-Level Security (RLS) on all Supabase tables
- KYC: manual passport verification on launch, Sumsub API integration later
- GDPR-compliant privacy policy (generated via privacy-legal plugin)
- All secrets in environment variables, never in code

---

## 10. Design Direction

- Style: dark theme, glassmorphism cards, smooth animations
- Reference aesthetic: Stripe / Linear / Vercel
- Component library: shadcn/ui
- Responsive: mobile-first
- Skill used: ui-ux-pro-max

---

## 11. Development Tooling

| Tool | Purpose |
|---|---|
| ruflo-swarm | Parallel agent development of separate modules |
| n8n | Automation: email notifications, Telegram support bot, provider webhooks |
| playwright | UI automated testing |
| writing-plans | Implementation plan per module |
| privacy-legal | GDPR policy, KYC compliance docs |
| verification-before-completion | Pre-deploy checks |

---

## 12. Legal & Business Setup

- Register UAE Freezone company (DMCC or IFZA): ~$1,500–$3,000
- Open business bank account: Wio Bank or Emirates NBD
- Sign API agreements with: Wallester, 5sim, Airalo, Twilio
- Generate: Privacy Policy, Terms of Service, AML Policy (via privacy-legal + commercial-legal)

---

## 13. Launch Phases

**Phase 1 — MVP (months 1–3):**
Landing + auth + balance top-up + SMS activations + basic admin panel

**Phase 2 — Core Products (months 3–5):**
Virtual cards + eSIM + virtual numbers + KYC flow

**Phase 3 — Growth (months 5–6):**
Referral program + Telegram bot + n8n automation + analytics dashboard
