import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/clinical/treatment-plans")({ component: () => <Outlet /> });
