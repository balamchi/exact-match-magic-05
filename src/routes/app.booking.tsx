import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/booking")({ component: BookingPage });

function BookingPage() {
  return <ResourceModule title="Booking" eyebrow="Scheduling" description="Create and manage appointment bookings with status, times, pricing, and notes." table="appointments" icon={<CalendarDays className="h-4.5 w-4.5" />} searchKeys={["status", "notes"]} columns={["starts_at", "ends_at", "status", "price_cents", "notes"]} defaults={{ status: "scheduled" }} metrics={[{ label: "Scheduled", value: (rows) => rows.filter((row) => row.status === "scheduled" || row.status === "confirmed").length.toString() }, { label: "Revenue", value: (rows) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(rows.reduce((sum, row) => sum + Number(row.price_cents ?? 0), 0) / 100) }]} fields={[{ key: "starts_at", label: "Starts", type: "datetime", required: true }, { key: "ends_at", label: "Ends", type: "datetime", required: true }, { key: "status", label: "Status", type: "select", options: [{ label: "Scheduled", value: "scheduled" }, { label: "Confirmed", value: "confirmed" }, { label: "Checked in", value: "checked_in" }, { label: "Completed", value: "completed" }, { label: "No show", value: "no_show" }, { label: "Cancelled", value: "cancelled" }] }, { key: "price_cents", label: "Price", type: "money", min: 0 }, { key: "notes", label: "Notes", type: "textarea", max: 1000 }]} />;
}