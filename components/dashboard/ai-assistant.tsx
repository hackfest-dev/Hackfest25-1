"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Brain, Send, Sparkles, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

export function AiAssistant() {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState([
    {
      type: 'suggestion',
      content: 'Based on your spending patterns, you could save approximately $320 per month by reducing dining out expenses and optimizing your subscription services.'
    }
  ])

  const suggestions = [
    "How much did I spend on food last month?",
    "What can I cut to save $500/month?",
    "Do I need to file taxes in Portugal?",
    "Show my biggest expenses this year"
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    // Add user message
    setMessages(prev => [...prev, { type: 'user', content: query }])
    
    // Simulate API call
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: "I'll analyze your spending patterns and provide a detailed breakdown shortly." 
      }])
      setIsLoading(false)
      setQuery("")
    }, 1500)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
  }

  return (
    <Card className="bg-gradient-to-b from-white to-blue-50/20 border shadow-lg hover:shadow-xl transition-all duration-300 h-full">
      <CardHeader className="border-b bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <Sparkles className="h-4 w-4 text-yellow-400 absolute -top-1 -right-1" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Assistant
            </CardTitle>
            <CardDescription className="text-slate-600">
              Your personal financial advisor
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 p-4 h-[300px] overflow-y-auto">
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            Quick Questions
          </p>
          <div className="grid grid-cols-1 gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-left text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <MessageSquare className="h-3 w-3" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "p-4 rounded-xl animate-fade-in",
                message.type === 'user' 
                  ? "bg-blue-600 text-white ml-8" 
                  : message.type === 'assistant'
                  ? "bg-slate-100 mr-8"
                  : "bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"
              )}
            >
              <div className="flex items-start gap-3">
                {message.type === 'assistant' && (
                  <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
                )}
                <div className="text-sm">
                  {message.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 border-t bg-white/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            placeholder="Ask me anything about your finances..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-white border-slate-200 focus-visible:ring-blue-500"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading}
            className={cn(
              "bg-blue-600 hover:bg-blue-700 transition-all duration-200",
              isLoading && "animate-pulse"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
