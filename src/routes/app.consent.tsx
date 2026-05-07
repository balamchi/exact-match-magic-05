import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/consent")({
  component: () => <Navigate to="/app/clinical/consent-forms" />,
});
