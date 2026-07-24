"use client";

import { CalendarPortfolio } from "@/components/calendar/calendar-portfolio";
import { useDataSource } from "@/components/crm/use-data-source";

export function CalendarPageClient() {
  const dataSource = useDataSource();
  return <CalendarPortfolio key={dataSource} />;
}
