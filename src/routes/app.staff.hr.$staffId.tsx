import { useEffect, useState, FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  DollarSign,
  Phone,
  Mail,
  AlertTriangle,
  Plus,
  Trash2,
  Percent,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/staff/hr/$staffId")({
  component: StaffHrPage,
});

type StaffRow = {
  id: string;
  display_name: string;
  title: string | null;
  color: string | null;
  active: boolean;
};

type HrRow = {
  id?: string;
  staff_id: string;
  clinic_id: string;
  email: string;
  phone: string;
  employment_type: string;
  hire_date: string;
  hourly_rate_cents: number | null;
  salary_cents: number | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
};

type CommissionRow = {
  id?: string;
  staff_id: string;
  clinic_id: string;
  commission_type: string;
  rate: number;
  applies_to: string;
  service_category: string | null;
  service_id: string | null;
  active: boolean;
};

function StaffHrPage() {
  const { staffId } = Route.useParams();
  const { activeClinic } = useAuth();
  const clinicId = activeClinic?.clinic_id ?? "";

  const [staff, setStaff] = useState<StaffRow | null>(null);
  const [hr, setHr] = useState<HrRow | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    load();
  }, [clinicId, staffId]);

  const load = async () => {
    setLoading(true);

    const [staffRes, hrRes, commRes, catRes] = await Promise.all([
      supabase.from("staff").select("id, display_name, title, color, active").eq("id", staffId).single(),
      supabase.from("staff_hr").select("*").eq("staff_id", staffId).maybeSingle(),
      supabase.from("staff_commissions").select("*").eq("staff_id", staffId).order("created_at"),
      supabase.from("services").select("category").eq("clinic_id", clinicId),
    ]);

    if (staffRes.data) setStaff(staffRes.data as StaffRow);

    if (hrRes.data) {
      setHr(hrRes.data as any);
    } else {
      setHr({
        staff_id: staffId,
        clinic_id: clinicId,
        email: "",
        phone: "",
        employment_type: "full_time",
        hire_date: "",
        hourly_rate_cents: null,
        salary_cents: null,
        emergency_contact_name: "",
        emergency_contact_phone: "",
        notes: "",
      });
    }

    if (commRes.data) setCommissions(commRes.data as any[]);
    if (catRes.data) {
      const unique = [...new Set(catRes.data.map((s: any) => s.category).filter(Boolean))];
      setCategories(unique as string[]);
    }

    setLoading(false);
  };

  const saveHr = async (e: FormEvent) => {
    e.preventDefault();
    if (!hr) return;
    setSaving(true);
    try {
      if (hr.id) {
        const { error } = await supabase.from("staff_hr").update({
          email: hr.email || null,
          phone: hr.phone || null,
          employment_type: hr.employment_type,
          hire_date: hr.hire_date || null,
          hourly_rate_cents: hr.hourly_rate_cents,
          salary_cents: hr.salary_cents,
          emergency_contact_name: hr.emergency_contact_name || null,
          emergency_contact_phone: hr.emergency_contact_phone || null,
          notes: hr.notes || null,
        }).eq("id", hr.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("staff_hr").insert({
          staff_id: staffId,
          clinic_id: clinicId,
          email: hr.email || null,
          phone: hr.phone || null,
          employment_type: hr.employment_type,
          hire_date: hr.hire_date || null,
          hourly_rate_cents: hr.hourly_rate_cents,
          salary_cents: hr.salary_cents,
          emergency_contact_name: hr.emergency_contact_name || null,
          emergency_contact_phone: hr.emergency_contact_phone || null,
          notes: hr.notes || null,
        });
        if (error) throw error;
      }
      toast.success("HR details saved");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addCommission = async () => {
    const { error } = await supabase.from("staff_commissions").insert({
      staff_id: staffId,
      clinic_id: clinicId,
      commission_type: "percentage",
      rate: 10,
      applies_to: "all",
      active: true,
    });
    if (error) toast.error(error.message);
    else load();
  };

  const updateCommission = async (id: string, updates: Partial<CommissionRow>) => {
    const { error } = await supabase.from("staff_commissions").update(updates).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const deleteCommission = async (id: string) => {
    const { error } = await supabase.from("staff_commissions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Staff member not found.{" "}
        <Link to="/app/staff" className="text-primary underline">
          Back to Staff
        </Link>
      </div>
    );
  }

  const color = staff.color || "#a78bfa";

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/app/staff">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Staff
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-background"
            style={{ background: color }}
          >
            {staff.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{staff.display_name}</h1>
            <p className="text-xs text-muted-foreground">{staff.title || "No title"}</p>
          </div>
        </div>
      </div>

      {/* HR Details */}
      <section className="rounded-xl border border-border/60 bg-card/30 backdrop-blur">
        <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3">
          <Briefcase className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">HR Details</h2>
        </div>
        {hr && (
          <form onSubmit={saveHr} className="space-y-4 px-5 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                <Input
                  type="email"
                  value={hr.email}
                  onChange={(e) => setHr({ ...hr, email: e.target.value })}
                  placeholder="staff@clinic.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Phone className="h-3 w-3" /> Phone
                </Label>
                <Input
                  value={hr.phone}
                  onChange={(e) => setHr({ ...hr, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Employment type</Label>
                <select
                  value={hr.employment_type}
                  onChange={(e) => setHr({ ...hr, employment_type: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hire date</Label>
                <Input
                  type="date"
                  value={hr.hire_date}
                  onChange={(e) => setHr({ ...hr, hire_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <DollarSign className="h-3 w-3" /> Hourly rate
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={hr.hourly_rate_cents != null ? (hr.hourly_rate_cents / 100).toFixed(2) : ""}
                  onChange={(e) =>
                    setHr({
                      ...hr,
                      hourly_rate_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <DollarSign className="h-3 w-3" /> Annual salary
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={hr.salary_cents != null ? (hr.salary_cents / 100).toFixed(2) : ""}
                  onChange={(e) =>
                    setHr({
                      ...hr,
                      salary_cents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                Emergency contact
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={hr.emergency_contact_name}
                  onChange={(e) => setHr({ ...hr, emergency_contact_name: e.target.value })}
                  placeholder="Contact name"
                />
                <Input
                  value={hr.emergency_contact_phone}
                  onChange={(e) => setHr({ ...hr, emergency_contact_phone: e.target.value })}
                  placeholder="Contact phone"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <textarea
                value={hr.notes}
                onChange={(e) => setHr({ ...hr, notes: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Internal notes about this team member…"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-glow hover:opacity-90">
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                {saving ? "Saving…" : "Save HR details"}
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* Commission Rules */}
      <section className="rounded-xl border border-border/60 bg-card/30 backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold">Commission Rules</h2>
            <Badge variant="outline" className="text-[10px]">
              {commissions.length} rule{commissions.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <Button size="sm" variant="outline" onClick={addCommission}>
            <Plus className="mr-1 h-3 w-3" /> Add rule
          </Button>
        </div>

        {commissions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No commission rules yet. Add one to start tracking earnings.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {commissions.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <select
                  value={c.commission_type}
                  onChange={(e) => c.id && updateCommission(c.id, { commission_type: e.target.value })}
                  className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="percentage">Percentage</option>
                  <option value="flat">Flat fee</option>
                </select>

                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={c.rate}
                    onChange={(e) => c.id && updateCommission(c.id, { rate: parseFloat(e.target.value) || 0 })}
                    className="h-8 w-20 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">
                    {c.commission_type === "percentage" ? "%" : activeClinic?.clinic?.currency || "CAD"}
                  </span>
                </div>

                <select
                  value={c.applies_to}
                  onChange={(e) =>
                    c.id &&
                    updateCommission(c.id, {
                      applies_to: e.target.value,
                      service_category: e.target.value === "category" ? categories[0] || null : null,
                    })
                  }
                  className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">All services</option>
                  <option value="category">By category</option>
                </select>

                {c.applies_to === "category" && (
                  <select
                    value={c.service_category || ""}
                    onChange={(e) => c.id && updateCommission(c.id, { service_category: e.target.value })}
                    className="flex h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}

                <label className="ml-auto flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={c.active}
                    onChange={(e) => c.id && updateCommission(c.id, { active: e.target.checked })}
                    className="accent-primary"
                  />
                  Active
                </label>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => c.id && deleteCommission(c.id)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
