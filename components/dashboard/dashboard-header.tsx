import type React from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface DashboardHeaderProps {
  heading: string
  text?: string
  children?: React.ReactNode
}

export function DashboardHeader({ heading, text, children }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 mb-8">
      <div className="grid gap-1">
        <h1 className="font-heading text-3xl md:text-4xl font-bold">{heading}</h1>
        {text && <p className="text-lg text-muted-foreground">{text}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button className="bg-gradient-to-r from-primary to-primary/90 shadow-sm hover:shadow-md transition-all">
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>
      {children}
    </div>
  )
}
