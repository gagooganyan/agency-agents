import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-indigo-600" />
          <span className="text-sm font-medium text-white">PayGlobal</span>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/support" className="hover:text-white transition-colors">Support</Link>
        </div>
        <p className="text-sm text-muted-foreground">© 2026 PayGlobal. All rights reserved.</p>
      </div>
    </footer>
  )
}
