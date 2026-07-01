import { CreditCard, MessageSquare, Wifi, Phone } from 'lucide-react'

const PRODUCTS = [
  {
    icon: CreditCard,
    title: 'Virtual Cards',
    description: 'EUR/USD cards for subscriptions, marketplaces, and AI tools. Works with Netflix, ChatGPT, Amazon, and 1000+ services.',
    badge: 'Most popular',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: MessageSquare,
    title: 'SMS Activations',
    description: 'One-time phone numbers for verifying accounts in any service. 150+ countries, instant delivery.',
    badge: null,
    color: 'from-blue-500 to-cyan-600',
  },
  {
    icon: Wifi,
    title: 'eSIM',
    description: 'Mobile internet in 200+ countries. Buy online, install in 1 minute. No physical SIM required.',
    badge: null,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Phone,
    title: 'Virtual Numbers',
    description: 'Permanent virtual phone numbers for calls and SMS. Monthly rental, cancel anytime.',
    badge: null,
    color: 'from-orange-500 to-amber-600',
  },
]

export default function ProductCards() {
  return (
    <section id="products" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything you need</h2>
          <p className="text-muted-foreground text-lg">Four products, one dashboard, instant access worldwide</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRODUCTS.map((product) => (
            <div key={product.title} className="glass rounded-2xl p-6 hover:bg-white/8 transition-colors group">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center mb-4`}>
                <product.icon size={22} className="text-white" />
              </div>
              {product.badge && (
                <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 mb-3">
                  {product.badge}
                </span>
              )}
              <h3 className="font-semibold text-white mb-2">{product.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
