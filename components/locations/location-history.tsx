import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarRange, MapPin } from "lucide-react"

export function LocationHistory() {
  const locationHistory = [
    {
      id: 1,
      location: "Bangkok",
      country: "Thailand",
      dateRange: "Jan 5 - Feb 4, 2025",
      days: 30,
      totalSpent: "$1,100",
      status: "past",
    },
    {
      id: 2,
      location: "Lisbon",
      country: "Portugal",
      dateRange: "Feb 10 - Mar 7, 2025",
      days: 25,
      totalSpent: "$1,600",
      status: "past",
    },
    {
      id: 3,
      location: "Medellín",
      country: "Colombia",
      dateRange: "Mar 15 - Apr 29, 2025",
      days: 45,
      totalSpent: "$1,110",
      status: "current",
    },
    {
      id: 4,
      location: "Bali",
      country: "Indonesia",
      dateRange: "May 5 - Jun 10, 2025",
      days: 35,
      totalSpent: "Planned",
      status: "planned",
    },
  ]

  const getStatusBadge = (status) => {
    switch (status) {
      case "current":
        return <Badge className="bg-green-500">Current</Badge>
      case "planned":
        return <Badge variant="outline">Planned</Badge>
      default:
        return <Badge variant="secondary">Past</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location History</CardTitle>
        <CardDescription>Your travel history and future plans</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {locationHistory.map((item) => (
            <div
              key={item.id}
              className="relative pl-8 pb-8 border-l border-border last:border-l-transparent last:pb-0"
            >
              <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-primary"></div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h3 className="font-medium">
                    {item.location}, {item.country}
                  </h3>
                </div>
                {getStatusBadge(item.status)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <CalendarRange className="h-4 w-4" />
                <span>{item.dateRange}</span>
                <span>•</span>
                <span>{item.days} days</span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Total spent: </span>
                <span>{item.totalSpent}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
