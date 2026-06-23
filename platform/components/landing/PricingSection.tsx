import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple pricing</h2>
          <p className="text-muted-foreground text-lg">No hidden fees. Pay only for what you use.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: 'SMS Activation',
              price: 'from $0.15',
              period: 'per number',
              features: ['150+ countries', 'Any service', 'Instant number', 'Auto-cancel if no SMS'],
              cta: 'Buy number',
              highlight: false,
            },
            {
              name: 'Virtual Card',
              price: '$35',
              period: 'per year',
              features: ['EUR or USD currency', '2% FX markup', 'All global services', 'Instant top-up'],
              cta: 'Get card',
              highlight: true,
            },
            {
              name: 'eSIM',
              price: 'from $4.50',
              period: 'per package',
              features: ['200+ countries', 'Instant QR code', 'Data packages 1–50 GB', 'No expiry on purchase'],
              cta: 'Browse plans',
              highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 ${plan.highlight ? 'bg-violet-600/20 border border-violet-500/40' : 'glass'}`}
            >
              <h3 className="font-semibold text-white mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{plan.period}</p>
              <ul className="space-y-3 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check size={14} className="text-violet-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${plan.highlight ? 'bg-violet-600 hover:bg-violet-700' : 'border-white/10 hover:bg-white/5'}`}
                variant={plan.highlight ? 'default' : 'outline'}
                asChild
              >
                <Link href="/register">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
