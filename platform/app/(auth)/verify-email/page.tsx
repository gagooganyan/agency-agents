import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <div className="glass rounded-2xl p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-6">
        <Mail size={32} className="text-violet-400" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
      <p className="text-muted-foreground mb-6">
        We sent a verification link to your email address. Click the link to activate your account.
      </p>
      <Button variant="outline" className="border-white/10 hover:bg-white/5" asChild>
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  )
}
