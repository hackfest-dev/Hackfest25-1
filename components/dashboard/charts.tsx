"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  TooltipProps
} from "recharts";
import { formatCurrency } from "@/lib/currency";

// Define default colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

// Custom tooltip for the spending chart
const SpendingTooltip = ({ active, payload, label, baseCurrency }: TooltipProps<any, any> & { baseCurrency: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 rounded-md shadow-md">
        <p className="font-medium text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`tooltip-${index}`} className="flex justify-between gap-3 text-xs">
            <span style={{ color: entry.color }}>
              {entry.name === 'income' ? 'Income' : 
               entry.name === 'expenses' ? 'Expenses' : 'Total'}:
            </span>
            <span className="font-medium">
              {formatCurrency(entry.value, baseCurrency)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const SpendingChart = ({ data, baseCurrency = 'USD' }: { data: any[], baseCurrency?: string }) => {
  // Format the date labels nicely
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));
  
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis 
          dataKey="date" 
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          tick={{ fill: 'var(--muted-foreground)' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          tick={{ fill: 'var(--muted-foreground)' }}
          tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}`}
        />
        <Tooltip content={<SpendingTooltip baseCurrency={baseCurrency} />} />
        <Line
          type="monotone"
          dataKey="income"
          stroke="hsl(var(--green-500))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, strokeWidth: 0 }}
          name="Income"
        />
        <Line
          type="monotone"
          dataKey="expenses"
          stroke="hsl(var(--red-500))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, strokeWidth: 0 }}
          name="Expenses"
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          dot={{ r: 2, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
          activeDot={{ r: 6, strokeWidth: 0 }}
          name="Total"
        />
        <Legend />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const CategoryPieChart = ({ data = [], colors = COLORS }: { data?: any[], colors?: string[] }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="hsl(var(--primary))"
          dataKey="value"
        >
          {data && data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}; 