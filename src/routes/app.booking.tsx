import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/booking")({ component: () => (
  <PageStub
    title="Booking & Scheduling"
    description="Online booking with deposits, waitlists, recurring appointments, and resource management."
    icon={<CalendarDays className="h-6 w-6 text-primary-foreground" />}
    features={[
      "Public booking page per clinic",
      "Service & staff selection",
      "Deposits via Stripe",
      "Smart waitlist & cancellations",
      "SMS + email reminders",
      "Multi-resource scheduling",
    ]}
  />
)});
