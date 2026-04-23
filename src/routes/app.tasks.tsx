import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/tasks")({ component: TasksPage });

function TasksPage() {
  return <ResourceModule title="Tasks" eyebrow="Team work" description="Create operational tasks with due dates, descriptions, and completion status." table="tasks" icon={<CheckSquare className="h-4.5 w-4.5" />} searchKeys={["title", "description", "status"]} columns={["title", "status", "due_at", "description"]} defaults={{ status: "todo" }} metrics={[{ label: "Open", value: (rows) => rows.filter((row) => row.status !== "done").length.toString() }, { label: "Done", value: (rows) => rows.filter((row) => row.status === "done").length.toString() }]} fields={[{ key: "title", label: "Title", required: true, max: 160 }, { key: "status", label: "Status", type: "select", options: [{ label: "To do", value: "todo" }, { label: "In progress", value: "in_progress" }, { label: "Done", value: "done" }] }, { key: "due_at", label: "Due", type: "datetime" }, { key: "description", label: "Description", type: "textarea", max: 1000 }]} />;
}