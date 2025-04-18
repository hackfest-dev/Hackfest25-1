import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar, DollarSign, Plane } from "lucide-react"

export function RelocationPlanner() {
  const savingsData = {
    currentLocation: "Lisbon",
    targetLocation: "Bangkok",
    monthlySavings: 570,
    savingsGoal: 2000,
    savedAmount: 1200,
    percentage: 60,
    estimatedDate: "Jun 15, 2025",
  }

  const checklistItems = [
    { id: 1, task: "Research visa requirements", completed: true },
    { id: 2, task: "Book flight tickets", completed: true },
    { id: 3, task: "Find accommodation", completed: false },
    { id: 4, task: "Purchase travel insurance", completed: false },
    { id: 5, task: "Research local coworking spaces", completed: false },
    { id: 6, task: "Set up international banking", completed: true },
  ]

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Relocation Planner</CardTitle>
        <CardDescription>Plan your move to a new location</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="savings" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="savings">Savings Plan</TabsTrigger>
            <TabsTrigger value="checklist">Moving Checklist</TabsTrigger>
          </TabsList>
          <TabsContent value="savings" className="pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Plane className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Moving from</p>
                          <p className="text-lg font-bold">{savingsData.currentLocation}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Plane className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Moving to</p>
                          <p className="text-lg font-bold">{savingsData.targetLocation}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Savings Goal</p>
                        <p className="text-sm font-medium">
                          ${savingsData.savedAmount} / ${savingsData.savingsGoal}
                        </p>
                      </div>
                      <Progress value={savingsData.percentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{savingsData.percentage}% saved</span>
                        <span>${savingsData.savingsGoal - savingsData.savedAmount} to go</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Savings</p>
                        <p className="text-lg font-bold">${savingsData.monthlySavings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Move Date</p>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-primary" />
                          <p className="text-lg font-bold">{savingsData.estimatedDate}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Cost Breakdown</h3>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">One-time Costs</span>
                        <span className="font-medium">$1,200</span>
                      </div>
                      <div className="pl-4 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Flight</span>
                          <span>$600</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Visa</span>
                          <span>$100</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Initial Accommodation</span>
                          <span>$500</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Monthly Savings</span>
                        <span className="font-medium text-green-500">$570/month</span>
                      </div>
                      <div className="pl-4 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Housing Difference</span>
                          <span>-$300</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Food Difference</span>
                          <span>-$100</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Transportation Difference</span>
                          <span>-$70</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Entertainment Difference</span>
                          <span>-$100</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button className="w-full">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Adjust Savings Plan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="checklist" className="pt-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Moving to {savingsData.targetLocation}</h3>
                    <Badge variant="outline">
                      {checklistItems.filter((item) => item.completed).length} / {checklistItems.length} completed
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {checklistItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          readOnly
                        />
                        <span className={item.completed ? "line-through text-muted-foreground" : ""}>{item.task}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-between">
                    <Button variant="outline">Add Task</Button>
                    <Button>Save Changes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
