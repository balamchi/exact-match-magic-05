import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/inbox")({ component: InboxPage });

function InboxPage() {
  return (
    <ResourceModule
      title="Inbox"
      eyebrow="Conversations"
      description="Unified inbox for SMS, email, and web inquiries from your clients."
      table="inbox_messages"
      icon={<Inbox className="h-4.5 w-4.5" />}
      searchKeys={["contact_name", "contact_handle", "preview", "channel"]}
      columns={["contact_name", "channel", "preview", "status", "unread", "last_message_at"]}
      defaults={{ channel: "sms", status: "open", unread: true }}
      orderBy="last_message_at"
      metrics={[
        { label: "Unread", value: (rows) => rows.filter((r) => r.unread).length.toString() },
        { label: "Open", value: (rows) => rows.filter((r) => r.status === "open").length.toString() },
      ]}
      fields={[
        { key: "contact_name", label: "Contact", required: true, max: 160 },
        { key: "contact_handle", label: "Phone or email", max: 160 },
        { key: "channel", label: "Channel", type: "select", options: [
          { label: "SMS", value: "sms" },
          { label: "Email", value: "email" },
          { label: "Web", value: "web" },
          { label: "WhatsApp", value: "whatsapp" },
        ]},
        { key: "preview", label: "Last message", type: "textarea", max: 500 },
        { key: "status", label: "Status", type: "select", options: [
          { label: "Open", value: "open" },
          { label: "Closed", value: "closed" },
          { label: "Snoozed", value: "snoozed" },
        ]},
        { key: "unread", label: "Unread", type: "boolean" },
        { key: "last_message_at", label: "Last message at", type: "datetime" },
      ]}
    />
  );
}
