import Hero from '@/components/landing/Hero'
import ProductCards from '@/components/landing/ProductCards'
import PricingSection from '@/components/landing/PricingSection'
import FaqSection from '@/components/landing/FaqSection'

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ProductCards />
      <PricingSection />
      <FaqSection />
    </>
  )
}
