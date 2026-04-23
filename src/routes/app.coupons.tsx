import { createFileRoute } from "@tanstack/react-router";
import { Ticket } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/coupons")({ component: CouponsPage });

function CouponsPage() {
  return <ResourceModule title="Coupons" eyebrow="Promotions" description="Create promo codes, usage caps, expiry dates, and active discounts." table="coupons" icon={<Ticket className="h-4.5 w-4.5" />} searchKeys={["code", "discount_type"]} columns={["code", "discount_type", "discount_value", "usage_limit", "used_count", "expires_at", "active"]} defaults={{ discount_type: "percent", discount_value: "10", active: true }} metrics={[{ label: "Active", value: (rows) => rows.filter((row) => row.active).length.toString() }, { label: "Redeemed", value: (rows) => rows.reduce((sum, row) => sum + Number(row.used_count ?? 0), 0).toString() }]} fields={[{ key: "code", label: "Code", required: true, max: 40 }, { key: "discount_type", label: "Discount type", type: "select", options: [{ label: "Percent", value: "percent" }, { label: "Fixed amount", value: "fixed" }] }, { key: "discount_value", label: "Discount value", type: "number", min: 0 }, { key: "usage_limit", label: "Usage limit", type: "number", min: 0 }, { key: "expires_at", label: "Expires", type: "date" }, { key: "active", label: "Active", type: "boolean" }]} />;
}