"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function CitySearch() {
  const [searchTerm, setSearchTerm] = useState("")

  const popularCities = [
    "Bangkok, Thailand",
    "Lisbon, Portugal",
    "Medellín, Colombia",
    "Bali, Indonesia",
    "Chiang Mai, Thailand",
    "Mexico City, Mexico",
    "Berlin, Germany",
    "Prague, Czech Republic",
  ]

  const savedCities = ["Bangkok, Thailand", "Lisbon, Portugal", "Medellín, Colombia"]

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Find Cities</CardTitle>
        <CardDescription>Search and compare cities worldwide</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Search cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Your Cities</h3>
            <div className="flex flex-wrap gap-2">
              {savedCities.map((city) => (
                <Badge key={city} variant="secondary" className="cursor-pointer">
                  {city}
                </Badge>
              ))}
              <Badge variant="outline" className="cursor-pointer">
                <Plus className="mr-1 h-3 w-3" />
                Add City
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Popular for Digital Nomads</h3>
            <div className="grid grid-cols-1 gap-2">
              {popularCities.map((city) => (
                <Button key={city} variant="ghost" className="justify-start h-auto py-2 px-3">
                  <span className="text-left">{city}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
