import BalanceWidget from '@/components/dashboard/BalanceWidget'
import TransactionTable from '@/components/dashboard/TransactionTable'

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
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent transactions</h2>
        <TransactionTable />
      </div>
    </div>
  )
}
