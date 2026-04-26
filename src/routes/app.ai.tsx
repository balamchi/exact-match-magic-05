import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { ResourceModule } from "@/components/resource-module";

export const Route = createFileRoute("/app/ai")({ component: AiAssistantPage });

function AiAssistantPage() {
  return (
    <ResourceModule
      title="AI assistants"
      eyebrow="Automation"
      description="Configure AI assistants for front-desk replies, summarization, and clinical drafting."
      table="ai_assistants"
      icon={<Bot className="h-4.5 w-4.5" />}
      searchKeys={["name", "purpose", "model"]}
      columns={["name", "purpose", "model", "active", "call_count"]}
      defaults={{ purpose: "front_desk", model: "google/gemini-2.5-flash", active: true }}
      metrics={[
        { label: "Active", value: (rows) => rows.filter((r) => r.active).length.toString() },
        { label: "Total calls", value: (rows) => rows.reduce((s, r) => s + Number(r.call_count ?? 0), 0).toLocaleString() },
      ]}
      fields={[
        { key: "name", label: "Name", required: true, max: 160 },
        { key: "purpose", label: "Purpose", type: "select", options: [
          { label: "Front desk", value: "front_desk" },
          { label: "SOAP drafting", value: "soap_drafting" },
          { label: "Marketing copy", value: "marketing_copy" },
          { label: "Insights", value: "insights" },
        ]},
        { key: "model", label: "Model", type: "select", options: [
          { label: "Gemini 2.5 Flash (fast)", value: "google/gemini-2.5-flash" },
          { label: "Gemini 2.5 Pro (smart)", value: "google/gemini-2.5-pro" },
          { label: "GPT-5 Mini", value: "openai/gpt-5-mini" },
          { label: "GPT-5", value: "openai/gpt-5" },
        ]},
        { key: "system_prompt", label: "System prompt", type: "textarea", max: 4000 },
        { key: "active", label: "Active", type: "boolean" },
      ]}
    />
  );
}
