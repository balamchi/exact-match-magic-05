import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/soap-notes")({
  component: () => <Navigate to="/app/clinical/soap-notes" />,
});
