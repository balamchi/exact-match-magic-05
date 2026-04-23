import { createFileRoute } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/giftcards")({ component: GiftCardsPage });

function GiftCardsPage() {
  return <ResourceModule title="Gift Cards" eyebrow="Stored value" description="Issue gift cards with balances, recipients, and expiry tracking." table="gift_cards" icon={<Gift className="h-4.5 w-4.5" />} searchKeys={["code", "purchaser_name", "recipient_name", "recipient_email"]} columns={["code", "recipient_name", "recipient_email", "initial_value_cents", "balance_cents", "expires_at", "active"]} defaults={{ active: true }} metrics={[{ label: "Outstanding", value: (rows) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(rows.reduce((sum, row) => sum + Number(row.balance_cents ?? 0), 0) / 100) }, { label: "Active", value: (rows) => rows.filter((row) => row.active).length.toString() }]} fields={[{ key: "code", label: "Code", required: true, max: 40 }, { key: "purchaser_name", label: "Purchaser", max: 120 }, { key: "recipient_name", label: "Recipient", max: 120 }, { key: "recipient_email", label: "Recipient email", type: "email", max: 255 }, { key: "initial_value_cents", label: "Initial value", type: "money", min: 0 }, { key: "balance_cents", label: "Balance", type: "money", min: 0 }, { key: "expires_at", label: "Expires", type: "date" }, { key: "active", label: "Active", type: "boolean" }]} />;
}