import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/reviews")({ component: ReviewsPage });

function ReviewsPage() {
  return (
    <ResourceModule
      title="Reviews"
      eyebrow="Reputation"
      description="Public reviews from clients with rating, source channel, and response status."
      table="reviews"
      icon={<Star className="h-4.5 w-4.5" />}
      searchKeys={["reviewer_name", "body", "source"]}
      columns={["reviewer_name", "rating", "source", "responded", "created_at"]}
      defaults={{ rating: "5", source: "in_app", responded: false }}
      metrics={[
        {
          label: "Average rating",
          value: (rows) => {
            if (!rows.length) return "—";
            const avg = rows.reduce((s, r) => s + Number(r.rating ?? 0), 0) / rows.length;
            return avg.toFixed(2);
          },
        },
        { label: "Awaiting response", value: (rows) => rows.filter((r) => !r.responded).length.toString() },
      ]}
      fields={[
        { key: "reviewer_name", label: "Reviewer", required: true, max: 160 },
        { key: "rating", label: "Rating (1-5)", type: "number", min: 1, max: 5 },
        { key: "body", label: "Review", type: "textarea", max: 4000 },
        { key: "source", label: "Source", type: "select", options: [
          { label: "In-app", value: "in_app" },
          { label: "Google", value: "google" },
          { label: "Yelp", value: "yelp" },
          { label: "Facebook", value: "facebook" },
          { label: "Other", value: "other" },
        ]},
        { key: "responded", label: "Responded", type: "boolean" },
      ]}
    />
  );
}
