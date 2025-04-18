"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, Euro, PoundSterling } from "lucide-react"

export function CurrencyOverview() {
  return (
    <Card className="col-span-1 bg-white border shadow-sm hover:shadow-md transition-all overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle>Currency Overview</CardTitle>
        <CardDescription>Your balances across currencies</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="usd" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usd">USD</TabsTrigger>
            <TabsTrigger value="eur">EUR</TabsTrigger>
            <TabsTrigger value="gbp">GBP</TabsTrigger>
          </TabsList>
          <TabsContent value="usd" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-full">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">US Dollar</p>
                  <p className="text-xs text-muted-foreground">Primary</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">$4,285.00</p>
                <p className="text-xs text-green-500">+$250 this month</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Income</span>
                <span>$6,500.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expenses</span>
                <span>$2,215.00</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">Savings</span>
                <span>$1,850.00</span>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="eur" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Euro className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">Euro</p>
                  <p className="text-xs text-muted-foreground">Secondary</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">€1,250.00</p>
                <p className="text-xs text-green-500">+€120 this month</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Income</span>
                <span>€1,500.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expenses</span>
                <span>€250.00</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">Savings</span>
                <span>€500.00</span>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="gbp" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-full">
                  <PoundSterling className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">British Pound</p>
                  <p className="text-xs text-muted-foreground">Secondary</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">£850.00</p>
                <p className="text-xs text-red-500">-£75 this month</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Income</span>
                <span>£0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expenses</span>
                <span>£75.00</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">Savings</span>
                <span>£0.00</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
