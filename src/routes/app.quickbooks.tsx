import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  DollarSign,
  Users,
  FileText,
  Clock,
  Settings,
  Download,
  Upload,
  Zap,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Phase4Badge, ComingSoonBanner } from "@/components/beta-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/quickbooks")({ component: QuickBooksPage });

type SyncEntity = {
  id: string;
  name: string;
  icon: typeof DollarSign;
  description: string;
  direction: "push" | "pull" | "both";
  enabled: boolean;
  lastSync: string | null;
  count: number;
};

function QuickBooksPage() {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "mapping" | "logs">("overview");
  const [entities, setEntities] = useState<SyncEntity[]>([
    { id: "invoices", name: "Invoices", icon: FileText, description: "Sync completed POS orders and invoices as sales receipts", direction: "push", enabled: true, lastSync: null, count: 0 },
    { id: "clients", name: "Clients → Customers", icon: Users, description: "Push client records as QuickBooks customers", direction: "push", enabled: true, lastSync: null, count: 0 },
    { id: "payments", name: "Payments", icon: DollarSign, description: "Record payment transactions for reconciliation", direction: "push", enabled: true, lastSync: null, count: 0 },
    { id: "products", name: "Services → Items", icon: BookOpen, description: "Map clinic services and retail items to QuickBooks inventory items", direction: "push", enabled: false, lastSync: null, count: 0 },
    { id: "expenses", name: "Expenses", icon: Download, description: "Pull expenses from QuickBooks for clinic reporting", direction: "pull", enabled: false, lastSync: null, count: 0 },
  ]);

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Zap },
    { id: "mapping" as const, label: "Field Mapping", icon: ArrowRightLeft },
    { id: "logs" as const, label: "Sync Logs", icon: Clock },
  ];

  const handleConnect = () => {
    toast.info("QuickBooks Online OAuth ships in Phase 4.", {
      description: "We'll wire your accounts the moment the integration goes live.",
    });
  };

  const toggleEntity = (id: string) => {
    setEntities((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e))
    );
  };

  const syncEntity = async (id: string) => {
    toast.info(`${entities.find((e) => e.id === id)?.name} sync activates in Phase 4.`, {
      description: "Mappings you configure now will run automatically once OAuth is live.",
    });
    setSyncing(null);
  };

  const syncAll = async () => {
    toast.info("Bulk sync runs after Phase 4 OAuth ships.");
  };

  return (
    <div className="space-y-6">
      <ComingSoonBanner
        title="QuickBooks Online sync — coming in Phase 4"
        description="The mappings and toggles you configure now will run automatically once OAuth ships."
      />
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            <BookOpen className="h-3 w-3" /> Accounting
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-4xl font-semibold tracking-tight">QuickBooks<Phase4Badge /></h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sync invoices, payments, and client records with QuickBooks Online for seamless accounting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
            connected
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
          )}>
            {connected ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {connected ? "Connected" : "Not connected"}
          </span>
          {connected && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={syncAll}>
              <RefreshCw className="h-3.5 w-3.5" /> Sync All
            </Button>
          )}
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total Synced", value: entities.reduce((s, e) => s + e.count, 0).toString(), icon: Upload },
          { label: "Last Sync", value: entities.some((e) => e.lastSync) ? "Just now" : "Never", icon: Clock },
          { label: "Entities Active", value: entities.filter((e) => e.enabled).length.toString(), icon: Zap },
          { label: "Errors", value: "0", icon: AlertCircle },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="h-4 w-4" />
              <span className="text-[11px] font-medium uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition",
              activeTab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {!connected ? (
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-8 text-center shadow-card">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <BookOpen className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="font-display text-2xl font-semibold">Connect QuickBooks Online</h2>
                <p className="mx-auto mt-2 max-w-[95vw] sm:max-w-md text-sm text-muted-foreground">
                  Link your QuickBooks Online account to automatically sync sales, payments, and client data. 
                  No manual bookkeeping required.
                </p>
                <Button onClick={handleConnect} className="mt-6 gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  <BookOpen className="h-4 w-4" /> Connect QuickBooks
                </Button>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  You'll be redirected to Intuit to authorize access. We only request the permissions needed for syncing.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="font-display text-xl font-semibold">Sync Entities</h2>
                {entities.map((entity) => (
                  <div
                    key={entity.id}
                    className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition hover:border-primary/30"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <entity.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{entity.name}</h3>
                        <span className={cn(
                          "rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase",
                          entity.direction === "push"
                            ? "border-blue-500/30 text-blue-300"
                            : entity.direction === "pull"
                            ? "border-amber-500/30 text-amber-300"
                            : "border-emerald-500/30 text-emerald-300"
                        )}>
                          {entity.direction === "push" ? "→ QB" : entity.direction === "pull" ? "← QB" : "↔ Both"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{entity.description}</p>
                      {entity.lastSync && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Last synced: {new Date(entity.lastSync).toLocaleString()} · {entity.count} records
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleEntity(entity.id)}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          entity.enabled ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span className={cn(
                          "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                          entity.enabled ? "translate-x-6" : "translate-x-1"
                        )} />
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!entity.enabled || syncing !== null}
                        onClick={() => syncEntity(entity.id)}
                        className="gap-1 text-xs"
                      >
                        {syncing === entity.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Sync
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold">Auto-Sync Settings</h2>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Sync on new sale", desc: "Push POS orders to QB immediately" },
                  { label: "Daily reconciliation", desc: "Batch sync every night at 2am" },
                  { label: "Error notifications", desc: "Get alerted on sync failures" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                    <div>
                      <h3 className="text-sm font-medium">{s.label}</h3>
                      <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                    </div>
                    <div className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-primary transition-colors">
                      <span className="inline-block h-4 w-4 translate-x-6 rounded-full bg-white transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold">Chart of Accounts</h2>
              <p className="mt-1 text-xs text-muted-foreground">Map clinic revenue categories to your QB chart of accounts.</p>
              <div className="mt-3 space-y-2">
                {["Service Revenue", "Product Sales", "Gift Cards", "Membership Fees"].map((a) => (
                  <div key={a} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                    <span className="text-sm">{a}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeTab === "mapping" && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
          <h2 className="font-display text-xl font-semibold">Field Mapping</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure how ClinicPro fields map to QuickBooks fields for each entity.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left">ClinicPro Field</th>
                  <th className="px-4 py-3 text-center"><ArrowRightLeft className="mx-auto h-4 w-4" /></th>
                  <th className="px-4 py-3 text-left">QuickBooks Field</th>
                  <th className="px-4 py-3 text-left">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Client Name", "Customer DisplayName", "Clients"],
                  ["Client Email", "Customer PrimaryEmailAddr", "Clients"],
                  ["Client Phone", "Customer PrimaryPhone", "Clients"],
                  ["Invoice Total", "SalesReceipt TotalAmt", "Invoices"],
                  ["Payment Method", "SalesReceipt PaymentMethodRef", "Payments"],
                  ["Service Name", "Item Name", "Products"],
                  ["Service Price", "Item UnitPrice", "Products"],
                  ["Tax Amount", "TaxLine TaxAmount", "Invoices"],
                ].map(([cp, qb, entity]) => (
                  <tr key={cp} className="hover:bg-surface/50">
                    <td className="px-4 py-3 font-medium">{cp}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">→</td>
                    <td className="px-4 py-3 font-mono text-xs text-primary">{qb}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px]">{entity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
          <h2 className="font-display text-xl font-semibold">Sync Logs</h2>
          <div className="mt-6 flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="font-medium">No sync activity yet</h3>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Sync logs will appear here once you connect QuickBooks and start syncing data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
