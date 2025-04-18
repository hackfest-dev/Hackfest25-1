"use client"

import { useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Plus, ZoomIn, ZoomOut } from "lucide-react"

export function LocationMap() {
  const [zoom, setZoom] = useState(1)

  const locations = [
    { id: 1, name: "Bangkok", country: "Thailand", x: 75, y: 40, amount: "$1,100" },
    { id: 2, name: "Lisbon", country: "Portugal", x: 45, y: 35, amount: "$1,600" },
    { id: 3, name: "Medellín", country: "Colombia", x: 25, y: 45, amount: "$1,110" },
    { id: 4, name: "Bali", country: "Indonesia", x: 80, y: 50, amount: "$870" },
  ]

  const handleZoomIn = () => {
    if (zoom < 1.5) setZoom(zoom + 0.1)
  }

  const handleZoomOut = () => {
    if (zoom > 0.8) setZoom(zoom - 0.1)
  }

  return (
    <div className="relative h-[500px] w-full overflow-hidden bg-muted/20">
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
        <Button size="icon" variant="outline" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div
        className="relative h-full w-full transition-transform duration-300 ease-in-out"
        style={{ transform: `scale(${zoom})` }}
      >
        <Image
          src="/placeholder.svg?height=800&width=1200"
          alt="World Map"
          width={1200}
          height={800}
          className="h-full w-full object-cover"
        />

        {locations.map((location) => (
          <div
            key={location.id}
            className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{ left: `${location.x}%`, top: `${location.y}%` }}
          >
            <div className="relative">
              <div className="absolute -top-1 -left-1 w-6 h-6 bg-primary/20 rounded-full animate-ping" />
              <div className="relative z-20 flex items-center justify-center w-4 h-4 bg-primary rounded-full">
                <MapPin className="h-3 w-3 text-primary-foreground" />
              </div>

              <Card className="absolute left-6 top-0 w-48 opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 z-30">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{location.name}</h4>
                        <p className="text-xs text-muted-foreground">{location.country}</p>
                      </div>
                      <Badge variant="outline">{location.amount}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
