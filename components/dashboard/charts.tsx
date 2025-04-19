"use client";

import {
  AreaChart,
  Area,
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
              {entry.dataKey}:
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
  console.log('SpendingChart received data:', data);
  
  // Sort data by date to ensure proper chronological order
  const formattedData = [...data].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  console.log('SpendingChart formatted data:', formattedData);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis 
          dataKey="date" 
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          fontSize={12}
          tick={{ fill: '#64748b' }}
          interval="preserveStartEnd"
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          fontSize={12}
          tick={{ fill: '#64748b' }}
          tickFormatter={(value) => formatCurrency(value, baseCurrency)}
        />
        <Tooltip content={<SpendingTooltip baseCurrency={baseCurrency} />} />
        <Area
          type="monotone"
          dataKey="Income"
          stroke="#22c55e"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#incomeGradient)"
          dot={false}
          activeDot={{ r: 6, strokeWidth: 0 }}
          name="Income"
        />
        <Area
          type="monotone"
          dataKey="Expenses"
          stroke="#ef4444"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#expensesGradient)"
          dot={false}
          activeDot={{ r: 6, strokeWidth: 0 }}
          name="Expenses"
        />
        <Legend
          verticalAlign="top"
          iconType="circle"
          iconSize={8}
          height={36}
        />
      </AreaChart>
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