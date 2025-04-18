"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateRangePickerProps {
  date: {
    from: Date | undefined;
    to?: Date | undefined;
  };
  onDateChange: (date: { from: Date | undefined; to?: Date | undefined }) => void;
  className?: string;
}

export function CalendarDateRangePicker({
  date,
  onDateChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Helper function to subtract days from a date
  const subtractDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  };

  const applyPreset = (preset: string) => {
    const today = new Date();
    
    switch (preset) {
      case "last-week":
        onDateChange({
          from: subtractDays(today, 7),
          to: today,
        });
        break;
      case "last-month":
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        onDateChange({
          from: lastMonth,
          to: today,
        });
        break;
      case "last-3-months":
        const last3Months = new Date(today);
        last3Months.setMonth(last3Months.getMonth() - 3);
        onDateChange({
          from: last3Months,
          to: today,
        });
        break;
      case "last-year":
        const lastYear = new Date(today);
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        onDateChange({
          from: lastYear,
          to: today,
        });
        break;
      case "all-time":
        onDateChange({
          from: undefined,
          to: undefined,
        });
        break;
    }
    
    setIsOpen(false);
  };

  // Helper function for formatting dates
  const formatDisplayDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            size="sm"
            className={cn(
              "justify-start text-left font-normal w-full max-w-[280px]",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {formatDisplayDate(date.from)} - {formatDisplayDate(date.to)}
                </>
              ) : (
                formatDisplayDate(date.from)
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <Select 
              onValueChange={applyPreset}
              defaultValue="custom"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preset range..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Range</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
                <SelectItem value="all-time">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={{ from: date?.from, to: date?.to }}
            onSelect={(range) => {
              if (range) {
                onDateChange(range);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
} 