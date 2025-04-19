import type React from "react"
interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50/50">
      <div className="flex-1 w-full space-y-4 p-4 md:p-8 pt-6">{children}</div>
    </div>
  )
}
