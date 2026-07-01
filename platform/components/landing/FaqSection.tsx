const FAQS = [
  { q: 'Which countries are supported?', a: 'SMS activations cover 150+ countries. eSIM works in 200+ countries. Virtual cards can be used worldwide wherever Visa/Mastercard is accepted.' },
  { q: 'How do I top up my balance?', a: 'You can top up via cryptocurrency (USDT, BTC, ETH) or by card (Visa/Mastercard) via Stripe. Minimum top-up is $5.' },
  { q: 'How fast is delivery?', a: 'SMS numbers are issued instantly. eSIM QR codes are delivered within 30 seconds. Virtual card issuance takes up to 1 minute after KYC verification.' },
  { q: 'Is KYC required?', a: 'KYC is required only for virtual card issuance. SMS activations, eSIM, and virtual numbers do not require identity verification.' },
  { q: 'Can I get a refund?', a: 'Balance is refundable if no products were purchased. Individual SMS activations are refunded automatically if no SMS is received within 20 minutes.' },
]

export default function FaqSection() {
  return (
    <section id="faq" className="py-24 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Frequently asked questions</h2>
        </div>
        <div className="space-y-4">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="glass rounded-xl p-6">
              <h3 className="font-medium text-white mb-2">{q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
