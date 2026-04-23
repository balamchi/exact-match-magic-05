import { createFileRoute } from "@tanstack/react-router";
import { BookingWorkflow } from "@/components/booking-workflow";

export const Route = createFileRoute("/app/calendar")({ component: CalendarPage });

function CalendarPage() {
  return <BookingWorkflow mode="calendar" />;
}
