import { createFileRoute } from "@tanstack/react-router";
import { CalendarWeek } from "@/components/calendar-week";

export const Route = createFileRoute("/app/calendar")({ component: CalendarPage });

function CalendarPage() {
  return <CalendarWeek />;
}
