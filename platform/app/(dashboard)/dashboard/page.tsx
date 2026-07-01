import Link from 'next/link'
import BalanceWidget from '@/components/dashboard/BalanceWidget'
import TransactionTable from '@/components/dashboard/TransactionTable'

const PRODUCTS = [
  { href: '/cards',   label: 'Virtual Cards',   desc: 'EUR/USD Visa & Mastercard' },
  { href: '/sms',     label: 'SMS Activations', desc: 'One-time verification codes' },
  { href: '/esim',    label: 'eSIM',            desc: 'Global mobile data' },
  { href: '/numbers', label: 'Virtual Numbers', desc: 'Rent local phone numbers' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Manage your products and balance</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BalanceWidget />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PRODUCTS.map(p => (
          <Link key={p.href} href={p.href} className="glass rounded-xl p-4 hover:bg-white/10 transition-colors">
            <p className="text-white font-medium text-sm mb-1">{p.label}</p>
            <p className="text-white/40 text-xs">{p.desc}</p>
          </Link>
        ))}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent transactions</h2>
        <TransactionTable />
      </div>
    </div>
  )
}
