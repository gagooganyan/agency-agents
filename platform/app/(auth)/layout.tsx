export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/20 via-background to-indigo-950/10" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">P</div>
          <span className="text-lg font-semibold text-white">PayGlobal</span>
        </div>
        {children}
      </div>
    </div>
  )
}
