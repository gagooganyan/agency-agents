import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-background to-indigo-950/20" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm mb-8">
          <Zap size={14} />
          Global digital products in seconds
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
          Pay for anything.{' '}
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Anywhere.
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Virtual cards, SMS activations, eSIM, and virtual numbers — all in one dashboard. Instant delivery, global coverage.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-base h-12 px-8" asChild>
            <Link href="/register">
              Get started free <ArrowRight size={18} className="ml-2" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="border-white/10 text-base h-12 px-8 hover:bg-white/5" asChild>
            <Link href="#products">View products</Link>
          </Button>
        </div>
        <div className="flex items-center justify-center gap-8 mt-16 text-sm text-muted-foreground">
          {[
            { icon: Globe, text: '200+ countries' },
            { icon: Zap, text: 'Instant delivery' },
            { icon: Shield, text: 'Secure & encrypted' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon size={16} className="text-violet-400" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
