import { FormEvent, useState } from "react";
import { CheckCircle2, Tag, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

interface CheckResult {
  status: "valid" | "invalid";
  reason?: string;
  message?: string;
  coupon?: { id: string; code: string; discount_type: string; discount_value: number; used_count: number };
}

function describe(coupon: CheckResult["coupon"]) {
  if (!coupon) return "";
  return coupon.discount_type === "percent"
    ? `${coupon.discount_value}% off`
    : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(coupon.discount_value / 100) + " off";
}

export function CouponValidator() {
  const { activeClinic } = useAuth();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState(false);

  const validate = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeClinic || !code.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("id, code, discount_type, discount_value, active, expires_at, usage_limit, used_count")
      .eq("clinic_id", activeClinic.clinic_id)
      .ilike("code", code.trim())
      .maybeSingle();
    setBusy(false);
    if (error || !data) {
      setResult({ status: "invalid", reason: "Code not found" });
      return;
    }
    if (!data.active) return setResult({ status: "invalid", reason: "Coupon is disabled" });
    if (data.expires_at && new Date(data.expires_at) < new Date()) return setResult({ status: "invalid", reason: "Coupon expired" });
    if (data.usage_limit && data.used_count >= data.usage_limit) return setResult({ status: "invalid", reason: "Usage limit reached" });
    setResult({ status: "valid", message: describe(data), coupon: data });
  };

  const apply = async () => {
    if (!activeClinic || result?.status !== "valid" || !result.coupon) return;
    setBusy(true);
    const { error } = await supabase
      .from("coupons")
      .update({ used_count: result.coupon.used_count + 1 })
      .eq("id", result.coupon.id)
      .eq("clinic_id", activeClinic.clinic_id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`Applied ${result.coupon.code}`);
      setCode("");
      setResult(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Tag className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Validate coupon</h2>
          <p className="text-xs text-muted-foreground">Check active status, expiry, and usage cap before applying.</p>
        </div>
      </div>

      <form onSubmit={validate} className="mt-4 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Coupon code (e.g. WELCOME10)"
          className="h-10 flex-1 rounded-lg border border-input bg-surface px-3 text-sm uppercase placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <Button type="submit" disabled={busy || !code.trim()} variant="outline">
          Check
        </Button>
      </form>

      {result && (
        <div className={`mt-4 flex items-start gap-3 rounded-xl border p-4 ${result.status === "valid" ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"}`}>
          {result.status === "valid" ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" /> : <XCircle className="mt-0.5 h-5 w-5 text-rose-300" />}
          <div className="flex-1">
            <div className={`font-medium ${result.status === "valid" ? "text-emerald-200" : "text-rose-200"}`}>
              {result.status === "valid" ? `Valid · ${result.message}` : "Invalid"}
            </div>
            {result.reason && <div className="text-xs text-rose-200/80">{result.reason}</div>}
          </div>
          {result.status === "valid" && (
            <Button onClick={apply} disabled={busy} size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              Apply
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
