import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/clinical/soap-notes")({ component: () => <Outlet /> });
