import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { REPORT_PRESETS } from "@/lib/reports/hooks";

interface Props {
  presetId: string;
  onPresetChange: (id: string) => void;
  compare: boolean;
  onCompareChange: (v: boolean) => void;
}

export function ReportDatePicker({ presetId, onPresetChange, compare, onCompareChange }: Props) {
  const current = REPORT_PRESETS.find((p) => p.id === presetId)?.label ?? "Last 30 days";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarIcon className="h-3.5 w-3.5" />
          {current}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {REPORT_PRESETS.map((p) => (
          <DropdownMenuItem key={p.id} onClick={() => onPresetChange(p.id)}>
            {p.label}
            {presetId === p.id && <span className="ml-auto text-primary">●</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={compare} onCheckedChange={onCompareChange}>
          Compare to previous period
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
