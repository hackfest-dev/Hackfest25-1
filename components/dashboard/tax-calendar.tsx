"use client";

import { Calendar } from "@/components/ui/calendar";

export const TaxCalendar = () => {
  return (
    <Calendar
      mode="single"
      selected={new Date()}
      className="rounded-md border"
    />
  );
}; 