import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { PageStub } from "@/components/page-stub";

export const Route = createFileRoute("/app/locations")({
  component: LocationsPage,
});

function LocationsPage() {
  return (
    <PageStub
      title="Locations"
      description="Manage multiple clinic sites — addresses, hours, room inventory, and per-location services."
      phase="Phase 2"
      icon={<MapPin className="h-6 w-6 text-primary-foreground" />}
      features={[
        "Add and edit physical locations",
        "Per-location operating hours",
        "Treatment rooms & equipment",
        "Location-scoped staff and services",
      ]}
    />
  );
}
