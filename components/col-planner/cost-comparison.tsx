"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

export function CostComparison() {
  const costData = [
    {
      category: "Housing",
      Bangkok: 500,
      Lisbon: 800,
      Medellin: 600,
    },
    {
      category: "Food",
      Bangkok: 300,
      Lisbon: 400,
      Medellin: 250,
    },
    {
      category: "Transport",
      Bangkok: 100,
      Lisbon: 150,
      Medellin: 80,
    },
    {
      category: "Entertainment",
      Bangkok: 200,
      Lisbon: 250,
      Medellin: 180,
    },
    {
      category: "Coworking",
      Bangkok: 150,
      Lisbon: 180,
      Medellin: 120,
    },
    {
      category: "Healthcare",
      Bangkok: 80,
      Lisbon: 120,
      Medellin: 70,
    },
  ]

  const totalCostData = [
    {
      name: "Bangkok",
      cost: 1330,
    },
    {
      name: "Lisbon",
      cost: 1900,
    },
    {
      name: "Medellín",
      cost: 1300,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Comparison</CardTitle>
        <CardDescription>Compare living costs between cities</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="categories">By Category</TabsTrigger>
            <TabsTrigger value="total">Total Cost</TabsTrigger>
          </TabsList>
          <TabsContent value="categories" className="pt-4">
            <div className="h-[350px] w-full">
              <ChartContainer
                config={{
                  Bangkok: {
                    label: "Bangkok",
                    color: "hsl(var(--chart-1))",
                  },
                  Lisbon: {
                    label: "Lisbon",
                    color: "hsl(var(--chart-2))",
                  },
                  Medellin: {
                    label: "Medellín",
                    color: "hsl(var(--chart-3))",
                  },
                }}
              >
                <BarChart accessibilityLayer data={costData} margin={{ top: 10, right: 10, left: 10, bottom: 24 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(value) => `$${value}`} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                  <Bar dataKey="Bangkok" fill="var(--color-Bangkok)" radius={4} />
                  <Bar dataKey="Lisbon" fill="var(--color-Lisbon)" radius={4} />
                  <Bar dataKey="Medellin" fill="var(--color-Medellin)" radius={4} />
                </BarChart>
              </ChartContainer>
            </div>
          </TabsContent>
          <TabsContent value="total" className="pt-4">
            <div className="h-[350px] w-full">
              <ChartContainer
                config={{
                  cost: {
                    label: "Monthly Cost",
                    color: "hsl(var(--chart-1))",
                  },
                }}
              >
                <BarChart accessibilityLayer data={totalCostData} margin={{ top: 10, right: 10, left: 10, bottom: 24 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(value) => `$${value}`} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                  <Bar dataKey="cost" fill="var(--color-cost)" radius={4} />
                </BarChart>
              </ChartContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {totalCostData.map((city) => (
                <Card key={city.name} className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h3 className="font-medium">{city.name}</h3>
                      <p className="text-2xl font-bold">${city.cost}</p>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
