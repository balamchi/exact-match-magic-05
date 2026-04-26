import { FormEvent, useState } from "react";
import { Gift, ScanLine, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

function money(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

export function GiftCardRedeem() {
  const { activeClinic } = useAuth();
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [lookup, setLookup] = useState<{ id: string; balance_cents: number; active: boolean; expires_at: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeClinic || !code.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("gift_cards")
      .select("id, balance_cents, active, expires_at")
      .eq("clinic_id", activeClinic.clinic_id)
      .ilike("code", code.trim())
      .maybeSingle();
    setBusy(false);
    if (error || !data) {
      setLookup(null);
      toast.error("Gift card not found");
      return;
    }
    if (!data.active) toast.error("This card is inactive");
    else if (data.expires_at && new Date(data.expires_at) < new Date()) toast.error("This card has expired");
    setLookup(data);
  };

  const redeem = async () => {
    if (!activeClinic || !lookup) return;
    const cents = Math.round(Number(amount || 0) * 100);
    if (cents <= 0) return toast.error("Enter an amount");
    if (cents > lookup.balance_cents) return toast.error("Insufficient balance");
    setBusy(true);
    const { error } = await supabase
      .from("gift_cards")
      .update({ balance_cents: lookup.balance_cents - cents })
      .eq("id", lookup.id)
      .eq("clinic_id", activeClinic.clinic_id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`Redeemed ${money(cents)}`);
      setLookup({ ...lookup, balance_cents: lookup.balance_cents - cents });
      setAmount("");
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ScanLine className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Redeem gift card</h2>
          <p className="text-xs text-muted-foreground">Look up a code and apply value to a sale.</p>
        </div>
      </div>

      <form onSubmit={search} className="mt-4 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Card code (e.g. GIFT-2024-001)"
          className="h-10 flex-1 rounded-lg border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <Button type="submit" disabled={busy || !code.trim()} variant="outline" className="gap-2">
          <Gift className="h-4 w-4" /> Lookup
        </Button>
      </form>

      {lookup && (
        <div className="mt-4 rounded-xl border border-border bg-surface/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Available balance</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${lookup.active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>
              {lookup.active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="mt-1 font-display text-3xl font-semibold tracking-tight">{money(lookup.balance_cents)}</div>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount to redeem"
              className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            <Button onClick={redeem} disabled={busy || !lookup.active} className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              <Wallet className="h-4 w-4" /> Redeem
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
