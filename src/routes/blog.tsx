import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/blog")({
  component: BlogPage,
  head: () => ({ meta: [{ title: "Blog — ClinicPro" }, { name: "description", content: "Insights and guides for clinic owners. Coming soon." }] }),
});

function BlogPage() {
  return (
    <PlaceholderPage title="Blog">
      <p>Coming soon. We're writing guides on clinic growth, marketing, and operations.</p>
      <p className="mt-4">Subscribe for updates — be the first to read new posts.</p>
    </PlaceholderPage>
  );
}
