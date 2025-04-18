import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"

export function TaxCalendar() {
  // This would be dynamic in a real app
  const today = new Date()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Calendar</CardTitle>
        <CardDescription>Track your location history for tax purposes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Calendar mode="single" selected={today} className="rounded-md border" />

          <div className="flex flex-wrap gap-2 pt-2">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <span className="text-xs">Portugal</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span className="text-xs">Thailand</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-purple-500"></div>
              <span className="text-xs">United States</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              <span className="text-xs">Colombia</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Important Dates</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>US Tax Filing Deadline</span>
                <Badge variant="outline">Apr 15, 2025</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Portugal Tax Declaration</span>
                <Badge variant="outline">Jun 30, 2025</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>183-day Threshold (Portugal)</span>
                <Badge variant="outline">Jul 2, 2025</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
