import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/tasks")({ component: () => (
  <PageStub
    title="Tasks"
    description="Personal and team task lists with assignments, due dates, and priorities."
    icon={<CheckSquare className="h-6 w-6 text-primary-foreground" />}
    features={[
      "Personal & team views",
      "Assign to staff",
      "Due dates & reminders",
      "Link to clients & appointments",
      "Recurring tasks",
      "Completion tracking",
    ]}
  />
)});
