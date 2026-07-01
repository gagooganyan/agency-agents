'use client'
import * as React from "react"
import { cn } from "@/lib/utils"

const DropdownMenu = ({ children }: { children: React.ReactNode }) => <div className="relative inline-block">{children}</div>
const DropdownMenuTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>
const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { align?: string }>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("z-50 min-w-32 rounded-xl border border-white/10 bg-card p-1 shadow-xl", className)} {...props}>
      {children}
    </div>
  )
)
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-white transition-colors", className)} {...props} />
  )
)
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuSeparator = ({ className }: { className?: string }) => (
  <div className={cn("my-1 h-px bg-white/5", className)} />
)

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator }
