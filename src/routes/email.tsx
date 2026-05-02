import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/email")({ component: () => <Outlet /> });
