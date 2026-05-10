import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  REPORT_TYPE_MAP, type ReportType, type ReportFilters, type StatusFilter,
} from "@/lib/reports/report-types";

interface Props {
  reportType: ReportType;
  filters: ReportFilters;
  onChange: (f: ReportFilters) => void;
}

interface Opt { id: string; label: string }

export function FilterBar({ reportType, filters, onChange }: Props) {
  const { activeClinic } = useAuth();
  const [locations, setLocations] = useState<Opt[]>([]);
  const [staff, setStaff] = useState<Opt[]>([]);
  const [services, setServices] = useState<Opt[]>([]);
  const [showMore, setShowMore] = useState(false);

  const show = REPORT_TYPE_MAP[reportType].showFilters;

  useEffect(() => {
    if (!activeClinic) return;
    const id = activeClinic.clinic_id;
    void Promise.all([
      supabase.from("locations").select("id,name").eq("clinic_id", id).eq("active", true),
      supabase.from("staff").select("id,display_name").eq("clinic_id", id).eq("active", true),
      supabase.from("services").select("id,name").eq("clinic_id", id).eq("active", true).order("name"),
    ]).then(([l, s, sv]) => {
      setLocations((l.data ?? []).map((r) => ({ id: r.id, label: r.name })));
      setStaff((s.data ?? []).map((r) => ({ id: r.id, label: r.display_name })));
      setServices((sv.data ?? []).map((r) => ({ id: r.id, label: r.name })));
    });
  }, [activeClinic]);

  const set = <K extends keyof ReportFilters>(k: K, v: ReportFilters[K]) =>
    onChange({ ...filters, [k]: v });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {show.location && (
        <SelectChip label="Location" value={filters.locationId} onChange={(v) => set("locationId", v)}
          options={[{ id: "all", label: "All locations" }, ...locations]} />
      )}
      {show.staff && (
        <SelectChip label="Staff" value={filters.staffId} onChange={(v) => set("staffId", v)}
          options={[{ id: "all", label: "All staff" }, ...staff]} />
      )}
      {show.service && (
        <SelectChip label="Service" value={filters.serviceId} onChange={(v) => set("serviceId", v)}
          options={[{ id: "all", label: "All services" }, ...services]} />
      )}
      {show.status && (
        <SelectChip label="Status" value={filters.status}
          onChange={(v) => set("status", v as StatusFilter)}
          options={[
            { id: "all", label: "All statuses" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
            { id: "no_show", label: "No-show" },
          ]} />
      )}
      {(show.paymentMethod || show.firstTime || show.source) && (
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
          onClick={() => setShowMore((v) => !v)}>
          <Filter className="h-3.5 w-3.5" />
          {showMore ? "Fewer filters" : "More filters"}
        </Button>
      )}
      {showMore && show.paymentMethod && (
        <SelectChip label="Payment" value={filters.paymentMethod ?? "all"}
          onChange={(v) => set("paymentMethod", v)}
          options={[
            { id: "all", label: "Any method" },
            { id: "card", label: "Card" },
            { id: "cash", label: "Cash" },
            { id: "other", label: "Other" },
          ]} />
      )}
      {showMore && show.source && (
        <SelectChip label="Source" value={filters.source ?? "all"}
          onChange={(v) => set("source", v)}
          options={[
            { id: "all", label: "Any source" },
            { id: "google", label: "Google" },
            { id: "instagram", label: "Instagram" },
            { id: "referral", label: "Referral" },
            { id: "walk-in", label: "Walk-in" },
          ]} />
      )}
      {showMore && show.firstTime && (
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card/40 px-3 py-1.5">
          <Switch id="ft" checked={!!filters.firstTimeOnly}
            onCheckedChange={(v) => set("firstTimeOnly", v)} />
          <Label htmlFor="ft" className="text-xs">First-time only</Label>
        </div>
      )}
    </div>
  );
}

function SelectChip({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: Opt[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto gap-2 text-xs">
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id} className="text-xs">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
