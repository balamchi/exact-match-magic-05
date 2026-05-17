import { useEffect, useMemo, useState } from "react";
import { BetaBadge } from "@/components/beta-badge";
import { createFileRoute } from "@tanstack/react-router";
import {
  CreditCard,
  Smartphone,
  Banknote,
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Package as PackageIcon,
  HeartPulse,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/app/pos")({ component: PosPage });

type CartItem = {
  id: string;
  kind: "service" | "package" | "retail";
  name: string;
  unitCents: number;
  qty: number;
};

type Catalog = {
  services: { id: string; name: string; price_cents: number }[];
  packages: { id: string; name: string; price_cents: number }[];
  retail: { id: string; name: string; price_cents: number; stock: number }[];
};

const TIP_PRESETS = [0, 10, 15, 20];
const TAX_RATE = 0.13; // HST default — settings-driven later

function formatCAD(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function PosPage() {
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id;
  const canProcessPayments = hasPermission(activeClinic?.role, "payments.process");
  const canRefundPayments = hasPermission(activeClinic?.role, "payments.refund");
  void canRefundPayments;

  const [catalog, setCatalog] = useState<Catalog>({ services: [], packages: [], retail: [] });
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"services" | "packages" | "retail">("services");
  const [tipPercent, setTipPercent] = useState<number>(15);
  const [customTipCents, setCustomTipCents] = useState<number | null>(null);
  const [clientName, setClientName] = useState("");
  const [staffName, setStaffName] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState<null | "card" | "tap" | "cash" | "bnpl">(null);
  const [depositMode, setDepositMode] = useState(false);
  const [depositPercent, setDepositPercent] = useState(50);
  const [todayCents, setTodayCents] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  // Fetch catalog
  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [svcRes, pkgRes, invRes] = await Promise.all([
        supabase.from("services").select("id,name,price_cents").eq("clinic_id", clinicId).eq("active", true).order("name").limit(200),
        supabase.from("packages").select("id,name,price_cents").eq("clinic_id", clinicId).eq("active", true).order("name").limit(100),
        supabase.from("inventory_items").select("id,name,unit_cost_cents,stock_quantity").eq("clinic_id", clinicId).eq("active", true).order("name").limit(200),
      ]);
      if (!active) return;
      setCatalog({
        services: svcRes.data ?? [],
        packages: pkgRes.data ?? [],
        retail: (invRes.data ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          // retail price ≈ 2× cost as a starting point (clinics override later)
          price_cents: Math.round(Number(r.unit_cost_cents ?? 0) * 2),
          stock: Number(r.stock_quantity ?? 0),
        })),
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [clinicId]);

  // Today's totals
  useEffect(() => {
    if (!clinicId) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("pos_orders")
        .select("total_cents,status")
        .eq("clinic_id", clinicId)
        .gte("created_at", start.toISOString());
      if (!active) return;
      const completed = (data ?? []).filter((r) => r.status === "completed");
      setTodayCents(completed.reduce((s, r) => s + Number(r.total_cents ?? 0), 0));
      setTodayCount(completed.length);
    })();
    return () => {
      active = false;
    };
  }, [clinicId, processing]);

  const filtered = useMemo(() => {
    const list = catalog[tab];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => i.name.toLowerCase().includes(q));
  }, [catalog, tab, search]);

  function addToCart(kind: CartItem["kind"], item: { id: string; name: string; price_cents: number }) {
    setCart((prev) => {
      const found = prev.find((c) => c.id === item.id && c.kind === kind);
      if (found) return prev.map((c) => (c === found ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { id: item.id, kind, name: item.name, unitCents: item.price_cents, qty: 1 }];
    });
  }

  function adjust(idx: number, delta: number) {
    setCart((prev) => {
      const next = [...prev];
      const target = { ...next[idx], qty: Math.max(0, next[idx].qty + delta) };
      if (target.qty === 0) next.splice(idx, 1);
      else next[idx] = target;
      return next;
    });
  }

  function removeLine(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearCart() {
    setCart([]);
    setTipPercent(15);
    setCustomTipCents(null);
    setClientName("");
    setNotes("");
  }

  const subtotal = cart.reduce((s, c) => s + c.unitCents * c.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const tip = customTipCents ?? Math.round(subtotal * (tipPercent / 100));
  const fullTotal = subtotal + tax + tip;
  const depositAmount = depositMode ? Math.round(fullTotal * (depositPercent / 100)) : 0;
  const total = depositMode ? depositAmount : fullTotal;

  async function checkout(method: "card" | "tap" | "cash" | "bnpl") {
    if (!clinicId) return;
    if (!canProcessPayments) { toast.error("You don't have permission to process payments"); return; }
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setProcessing(method);
    // Simulate terminal processing for card / tap (real Paddle terminal/Stripe Reader integration is platform-level)
    if (method !== "cash") {
      await new Promise((r) => setTimeout(r, 1200));
    }
    const paymentMethod = method === "tap" ? "card" : method === "bnpl" ? "bnpl" : method;
    const noteSummary =
      cart.map((c) => `${c.qty}× ${c.name}`).join(", ") +
      (notes ? ` — ${notes}` : "") +
      ` (subtotal ${formatCAD(subtotal)}, tax ${formatCAD(tax)}, tip ${formatCAD(tip)})`;

    const { error } = await supabase.from("pos_orders").insert({
      clinic_id: clinicId,
      client_name: clientName || null,
      staff_name: staffName || null,
      total_cents: total,
      payment_method: paymentMethod,
      status: "completed",
      notes: noteSummary,
    });

    setProcessing(null);
    if (error) {
      toast.error("Could not record sale", { description: error.message });
      return;
    }
    toast.success("Sale completed", { description: `${formatCAD(total)} • ${method.toUpperCase()}` });
    clearCart();
  }

  if (!canProcessPayments) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight">Point of Sale</h1>
        </div>
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <ShieldOff className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold">Restricted</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You don't have permission to process payments. Contact your clinic owner if you need access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Receipt className="h-3 w-3" /> Point of sale
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            Ring it up.
            <span className="ms-2 bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text italic text-transparent">
              Get paid.
            </span>
            <BetaBadge />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add services, packages, or retail. Take card, tap, or cash. Receipts and totals sync instantly.
          </p>
        </div>
        <div className="flex gap-3">
          <KpiPill label="Today's revenue" value={formatCAD(todayCents)} accent />
          <KpiPill label="Sales today" value={String(todayCount)} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {/* LEFT — catalog + cart */}
        <div className="space-y-4">
          {/* Catalog picker */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                <TabsList>
                  <TabsTrigger value="services" className="gap-1.5">
                    <HeartPulse className="h-3.5 w-3.5" /> Services
                  </TabsTrigger>
                  <TabsTrigger value="packages" className="gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Packages
                  </TabsTrigger>
                  <TabsTrigger value="retail" className="gap-1.5">
                    <PackageIcon className="h-3.5 w-3.5" /> Retail
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative ms-auto w-full max-w-xs">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${tab}…`}
                  className="ps-9"
                />
              </div>
            </div>

            <ScrollArea className="h-[340px]">
              <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/40" />
                  ))
                ) : filtered.length === 0 ? (
                  <div className="col-span-full py-10 text-center text-sm text-muted-foreground">
                    No {tab} found. Add some in the {tab} module.
                  </div>
                ) : (
                  filtered.map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        addToCart(
                          tab === "services" ? "service" : tab === "packages" ? "package" : "retail",
                          item,
                        )
                      }
                      className="group flex h-20 flex-col items-start justify-between rounded-lg border border-border bg-background p-3 text-start transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-glow"
                    >
                      <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
                        {item.name}
                      </span>
                      <span className="font-mono text-sm font-semibold text-primary">
                        {formatCAD(item.price_cents)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Cart */}
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Current sale
              </h2>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="h-7 text-xs text-muted-foreground">
                  Clear
                </Button>
              )}
            </div>
            {cart.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                Tap a service, package, or retail item above to start a sale.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {cart.map((line, idx) => (
                  <li key={`${line.kind}-${line.id}`} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{line.name}</div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {line.kind} · {formatCAD(line.unitCents)} ea
                      </div>
                    </div>
                    <div className="flex items-center gap-1 rounded-md border border-border bg-background">
                      <Button aria-label="Action" variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust(idx, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center font-mono text-sm tabular-nums">{line.qty}</span>
                      <Button aria-label="Action" variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjust(idx, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="w-20 text-end font-mono text-sm font-semibold tabular-nums">
                      {formatCAD(line.unitCents * line.qty)}
                    </div>
                    <Button aria-label="Action" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => removeLine(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT — totals + payment */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Order details
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Client (optional)
                </label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Walk-in" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Staff
                </label>
                <Input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Provider name" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Note
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Receipt note (optional)"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Tip
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {TIP_PRESETS.map((p) => {
                const active = customTipCents === null && p === tipPercent;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setTipPercent(p);
                      setCustomTipCents(null);
                    }}
                    className={[
                      "rounded-lg border px-2 py-2 text-sm font-semibold transition-all",
                      active
                        ? "border-primary/50 bg-gradient-to-br from-primary/25 to-fuchsia-500/10 text-primary shadow-glow"
                        : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    ].join(" ")}
                  >
                    {p}%
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Custom</span>
              <Input
                inputMode="decimal"
                placeholder="$0.00"
                value={customTipCents !== null ? (customTipCents / 100).toFixed(2) : ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setCustomTipCents(Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : null);
                }}
                className="h-8 font-mono"
              />
            </div>
          </div>

          {/* Deposit toggle */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Deposit / Partial Payment
                </h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Collect a deposit now, charge the rest at appointment</p>
              </div>
              <button
                onClick={() => setDepositMode(!depositMode)}
                className={[
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  depositMode ? "bg-primary" : "bg-muted",
                ].join(" ")}
              >
                <span className={[
                  "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                  depositMode ? "translate-x-6" : "translate-x-1",
                ].join(" ")} />
              </button>
            </div>
            {depositMode && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    onClick={() => setDepositPercent(p)}
                    className={[
                      "rounded-lg border px-2 py-2 text-sm font-semibold transition-all",
                      p === depositPercent
                        ? "border-primary/50 bg-gradient-to-br from-primary/25 to-fuchsia-500/10 text-primary shadow-glow"
                        : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    ].join(" ")}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-gradient-to-br from-surface to-background p-5">
            <Row label="Subtotal" value={formatCAD(subtotal)} />
            <Row label={`Tax (${(TAX_RATE * 100).toFixed(0)}%)`} value={formatCAD(tax)} />
            <Row label="Tip" value={formatCAD(tip)} />
            <div className="mt-3 border-t border-border pt-3">
              {depositMode && (
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Full total</span>
                  <span className="font-mono tabular-nums line-through opacity-50">{formatCAD(fullTotal)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {depositMode ? `Deposit (${depositPercent}%)` : "Total"}
                </span>
                <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text font-mono text-2xl sm:text-3xl font-bold tabular-nums text-transparent">
                  {formatCAD(total)}
                </span>
              </div>
              {depositMode && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Remaining balance of {formatCAD(fullTotal - depositAmount)} due at appointment
                </p>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <PayButton
                label="Card"
                icon={CreditCard}
                onClick={() => checkout("card")}
                disabled={cart.length === 0 || processing !== null}
                loading={processing === "card"}
                primary
              />
              <PayButton
                label="Tap to pay"
                icon={Smartphone}
                onClick={() => checkout("tap")}
                disabled={cart.length === 0 || processing !== null}
                loading={processing === "tap"}
              />
              <PayButton
                label="Cash"
                icon={Banknote}
                onClick={() => checkout("cash")}
                disabled={cart.length === 0 || processing !== null}
                loading={processing === "cash"}
              />
              <PayButton
                label="BNPL"
                icon={Clock}
                onClick={() => checkout("bnpl")}
                disabled={cart.length === 0 || processing !== null}
                loading={processing === "bnpl"}
              />
            </div>
            {processing === "bnpl" && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground animate-pulse">
                Generating installment plan…
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

function KpiPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={[
        "rounded-xl border px-4 py-2 text-end",
        accent
          ? "border-primary/30 bg-gradient-to-br from-primary/15 to-fuchsia-500/5 shadow-glow"
          : "border-border bg-surface",
      ].join(" ")}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={["font-mono text-lg font-bold tabular-nums", accent ? "text-primary" : "text-foreground"].join(" ")}>
        {value}
      </div>
    </div>
  );
}

function PayButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  loading,
  primary,
}: {
  label: string;
  icon: typeof CreditCard;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "group relative flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40",
        primary
          ? "border-primary/50 bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground shadow-glow hover:shadow-[0_0_24px_rgba(217,70,239,0.5)]"
          : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5",
      ].join(" ")}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </>
      )}
      {!loading && primary && (
        <CheckCircle2 className="absolute end-2 top-2 h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}
