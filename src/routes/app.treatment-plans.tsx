import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/treatment-plans")({
  component: () => <Navigate to="/app/clinical/treatment-plans" />,
});
