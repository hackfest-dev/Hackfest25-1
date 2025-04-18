"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Brain, Send } from "lucide-react"

export function AiAssistant() {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      setQuery("")
    }, 1500)
  }

  return (
    <Card className="bg-white border shadow-sm hover:shadow-md transition-all h-full">
      <CardHeader className="bg-gradient-to-r from-blue-500/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/10 rounded-full">
            <Brain className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <CardTitle>AI Assistant</CardTitle>
            <CardDescription>Ask me anything about your finances</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-slate-50 p-3 rounded-lg">
          <p className="text-sm font-medium text-slate-700">Try asking:</p>
          <ul className="mt-2 space-y-1">
            <li className="text-xs text-slate-600 cursor-pointer hover:text-blue-600 transition-colors">
              "How much did I spend on food last month?"
            </li>
            <li className="text-xs text-slate-600 cursor-pointer hover:text-blue-600 transition-colors">
              "What can I cut to save $500/month?"
            </li>
            <li className="text-xs text-slate-600 cursor-pointer hover:text-blue-600 transition-colors">
              "Do I need to file taxes in Portugal?"
            </li>
          </ul>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
          <div className="flex items-start gap-2">
            <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-slate-700">
                Based on your spending patterns, you could save approximately $320 per month by reducing dining out
                expenses and optimizing your subscription services.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            placeholder="Ask a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
