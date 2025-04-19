import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyRotator } from "./CurrencyRotator";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";

export function CurrencyCard() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20">
            <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-lg font-semibold">Local Currency</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pt-6 flex flex-col items-center"
        >
          <CurrencyRotator 
            size="lg" 
            className="mb-6" 
            values={["$100.00", "€85.00", "£75.00", "¥11,000"]}
          />
          
          <div className="w-full mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-sm text-slate-500 dark:text-slate-400">Exchange Rate</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Live Rate
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500 dark:text-slate-400">Last Updated</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Just Now
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
} 