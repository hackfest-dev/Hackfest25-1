import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function TaxResidencyTracker() {
  const residencyData = [
    {
      country: "United States",
      daysPresent: 95,
      threshold: 183,
      percentage: 52,
      status: "Non-resident",
      alert: false,
    },
    {
      country: "Portugal",
      daysPresent: 120,
      threshold: 183,
      percentage: 66,
      status: "Approaching residency",
      alert: true,
    },
    {
      country: "Thailand",
      daysPresent: 45,
      threshold: 180,
      percentage: 25,
      status: "Non-resident",
      alert: false,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Residency Status</CardTitle>
        <CardDescription>Track your days in each country for tax purposes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {residencyData.map((country) => (
            <div key={country.country} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{country.country}</h3>
                <span className="text-sm">
                  {country.daysPresent} / {country.threshold} days
                </span>
              </div>
              <Progress value={country.percentage} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <span className={country.alert ? "text-amber-500 font-medium" : "text-muted-foreground"}>
                  {country.status}
                </span>
                <span className="text-muted-foreground">{country.threshold - country.daysPresent} days remaining</span>
              </div>

              {country.alert && (
                <Alert variant="warning" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Approaching tax residency</AlertTitle>
                  <AlertDescription>
                    You're approaching the tax residency threshold for {country.country}. Consider your travel plans
                    carefully.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
