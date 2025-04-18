"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function LocationStats() {
  const locationData = [
    {
      name: "Bangkok",
      housing: 500,
      food: 300,
      transport: 100,
      entertainment: 200,
      total: 1100,
      days: 30,
      dailyAvg: 37,
    },
    {
      name: "Lisbon",
      housing: 800,
      food: 400,
      transport: 150,
      entertainment: 250,
      total: 1600,
      days: 25,
      dailyAvg: 64,
    },
    {
      name: "Medellín",
      housing: 600,
      food: 250,
      transport: 80,
      entertainment: 180,
      total: 1110,
      days: 45,
      dailyAvg: 25,
    },
    {
      name: "Bali",
      housing: 450,
      food: 200,
      transport: 70,
      entertainment: 150,
      total: 870,
      days: 35,
      dailyAvg: 25,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Location Comparison</CardTitle>
          <CardDescription>Compare your spending across different cities</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="expenses" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="daily">Daily Average</TabsTrigger>
              <TabsTrigger value="duration">Duration</TabsTrigger>
            </TabsList>
            <TabsContent value="expenses" className="pt-4">
              <div className="h-[350px] w-full">
                <ChartContainer
                  config={{
                    housing: {
                      label: "Housing",
                      color: "hsl(var(--chart-1))",
                    },
                    food: {
                      label: "Food",
                      color: "hsl(var(--chart-2))",
                    },
                    transport: {
                      label: "Transport",
                      color: "hsl(var(--chart-3))",
                    },
                    entertainment: {
                      label: "Entertainment",
                      color: "hsl(var(--chart-4))",
                    },
                  }}
                >
                  <BarChart
                    accessibilityLayer
                    data={locationData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 24 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(value) => `$${value}`} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                    <Bar dataKey="housing" fill="var(--color-housing)" radius={4} />
                    <Bar dataKey="food" fill="var(--color-food)" radius={4} />
                    <Bar dataKey="transport" fill="var(--color-transport)" radius={4} />
                    <Bar dataKey="entertainment" fill="var(--color-entertainment)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            </TabsContent>
            <TabsContent value="daily" className="pt-4">
              <div className="h-[350px] w-full">
                <ChartContainer
                  config={{
                    dailyAvg: {
                      label: "Daily Average",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                >
                  <BarChart
                    accessibilityLayer
                    data={locationData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 24 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(value) => `$${value}`} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                    <Bar dataKey="dailyAvg" fill="var(--color-dailyAvg)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            </TabsContent>
            <TabsContent value="duration" className="pt-4">
              <div className="h-[350px] w-full">
                <ChartContainer
                  config={{
                    days: {
                      label: "Days",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                >
                  <BarChart
                    accessibilityLayer
                    data={locationData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 24 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                    <Bar dataKey="days" fill="var(--color-days)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
