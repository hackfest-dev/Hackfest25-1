import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, Heart, Sun, Wind } from "lucide-react";

interface QualityMetric {
  city: string;
  safety: number;
  healthcare: number;
  climate: number;
  pollution: number;
}

interface QualityMetricsProps {
  data: QualityMetric[];
}

export function QualityMetrics({ data }: QualityMetricsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality of Life Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {data.map((city) => (
            <div key={city.city} className="space-y-4">
              <h3 className="text-lg font-semibold">{city.city}</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Safety</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{city.safety}%</span>
                  </div>
                  <Progress value={city.safety} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium">Healthcare</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{city.healthcare}%</span>
                  </div>
                  <Progress value={city.healthcare} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Climate</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{city.climate}%</span>
                  </div>
                  <Progress value={city.climate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Air Quality</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{100 - city.pollution}%</span>
                  </div>
                  <Progress value={100 - city.pollution} className="h-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 