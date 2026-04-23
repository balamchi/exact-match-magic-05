import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/calendar")({ component: CalendarPage });

function CalendarPage() {
  return <ResourceModule title="Calendar" eyebrow="Agenda" description="View and edit scheduled appointments in a calendar-ready list." table="appointments" icon={<Calendar className="h-4.5 w-4.5" />} searchKeys={["status", "notes"]} columns={["starts_at", "ends_at", "status", "price_cents", "notes"]} defaults={{ status: "scheduled" }} orderBy="starts_at" metrics={[{ label: "Upcoming", value: (rows) => rows.filter((row) => new Date(String(row.starts_at)).getTime() >= Date.now()).length.toString() }, { label: "Completed", value: (rows) => rows.filter((row) => row.status === "completed").length.toString() }]} fields={[{ key: "starts_at", label: "Starts", type: "datetime", required: true }, { key: "ends_at", label: "Ends", type: "datetime", required: true }, { key: "status", label: "Status", type: "select", options: [{ label: "Scheduled", value: "scheduled" }, { label: "Confirmed", value: "confirmed" }, { label: "Checked in", value: "checked_in" }, { label: "Completed", value: "completed" }, { label: "No show", value: "no_show" }, { label: "Cancelled", value: "cancelled" }] }, { key: "price_cents", label: "Price", type: "money", min: 0 }, { key: "notes", label: "Notes", type: "textarea", max: 1000 }]} />;
}