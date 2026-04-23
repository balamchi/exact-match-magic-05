import { createFileRoute } from "@tanstack/react-router";
import { BookingWorkflow } from "@/components/booking-workflow";

export const Route = createFileRoute("/app/booking")({ component: BookingPage });

function BookingPage() {
  return <BookingWorkflow mode="booking" />;
}
