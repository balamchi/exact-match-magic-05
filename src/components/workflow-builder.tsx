import { useState, useCallback, useRef, type DragEvent, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Zap, Mail, MessageSquare, Clock, CheckCircle2, UserPlus,
  CalendarCheck, Gift, Star, Bell, ArrowDown, Plus, Trash2,
  GripVertical, type LucideIcon, X, Settings2, Sparkles,
} from "lucide-react";

/* ── Node schema ─── */
export type NodeKind = "trigger" | "delay" | "condition" | "action";
export type TriggerType = "appointment_booked" | "appointment_completed" | "no_show" | "lead_created" | "birthday" | "rebook_due";
export type ActionType = "send_email" | "send_sms" | "create_task" | "add_tag" | "send_notification" | "apply_coupon";
export type ConditionOp = "has_tag" | "visited_last_30d" | "membership_active" | "vip";

export interface WorkflowNode {
  id: string;
  kind: NodeKind;
  label: string;
  config: Record<string, string>;
}

const TRIGGER_CATALOG: { type: TriggerType; label: string; icon: LucideIcon }[] = [
  { type: "appointment_booked", label: "Appointment Booked", icon: CalendarCheck },
  { type: "appointment_completed", label: "Appointment Completed", icon: CheckCircle2 },
  { type: "no_show", label: "No-Show", icon: Bell },
  { type: "lead_created", label: "New Lead", icon: UserPlus },
  { type: "birthday", label: "Birthday", icon: Gift },
  { type: "rebook_due", label: "Rebook Due", icon: Star },
];

const ACTION_CATALOG: { type: ActionType; label: string; icon: LucideIcon }[] = [
  { type: "send_email", label: "Send Email", icon: Mail },
  { type: "send_sms", label: "Send SMS", icon: MessageSquare },
  { type: "create_task", label: "Create Task", icon: CheckCircle2 },
  { type: "add_tag", label: "Add Tag", icon: Star },
  { type: "send_notification", label: "Push Notification", icon: Bell },
  { type: "apply_coupon", label: "Apply Coupon", icon: Sparkles },
];

const kindColors: Record<NodeKind, string> = {
  trigger: "border-emerald-500/50 bg-emerald-500/10",
  delay: "border-amber-500/50 bg-amber-500/10",
  condition: "border-sky-500/50 bg-sky-500/10",
  action: "border-primary/50 bg-primary/10",
};

const kindIcons: Record<NodeKind, LucideIcon> = {
  trigger: Zap,
  delay: Clock,
  condition: Settings2,
  action: Mail,
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

interface Props {
  nodes: WorkflowNode[];
  onChange: (nodes: WorkflowNode[]) => void;
}

export function WorkflowBuilder({ nodes, onChange }: Props) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addNode = (kind: NodeKind) => {
    const id = makeId();
    let label = "New Step";
    const config: Record<string, string> = {};
    if (kind === "trigger") { label = "Trigger"; config.type = "appointment_completed"; }
    if (kind === "delay") { label = "Wait"; config.duration = "1"; config.unit = "days"; }
    if (kind === "condition") { label = "If / Else"; config.op = "has_tag"; config.value = ""; }
    if (kind === "action") { label = "Send Email"; config.type = "send_email"; config.template = ""; }
    onChange([...nodes, { id, kind, label, config }]);
    setSelectedId(id);
  };

  const removeNode = (id: string) => {
    onChange(nodes.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateNode = (id: string, patch: Partial<WorkflowNode>) => {
    onChange(nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const onDragStart = (idx: number) => setDragging(idx);
  const onDragOver = (e: DragEvent, idx: number) => {
    e.preventDefault();
    if (dragging === null || dragging === idx) return;
    const next = [...nodes];
    const [moved] = next.splice(dragging, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    setDragging(idx);
  };
  const onDragEnd = () => setDragging(null);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="flex gap-6">
      {/* Canvas */}
      <div className="flex-1 space-y-1">
        {nodes.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Start by adding a <strong>Trigger</strong> node
          </div>
        )}

        {nodes.map((node, idx) => {
          const Icon = kindIcons[node.kind];
          const isActive = selectedId === node.id;
          return (
            <div key={node.id}>
              <div
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragEnd={onDragEnd}
                onClick={() => setSelectedId(node.id)}
                className={[
                  "group flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
                  kindColors[node.kind],
                  isActive ? "ring-2 ring-primary/50 shadow-glow" : "hover:ring-1 hover:ring-border",
                ].join(" ")}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab" />
                <Icon className="h-5 w-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{node.label}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{node.kind}</p>
                </div>
                <Badge variant="outline" className="text-[9px]">{node.kind}</Badge>
                <button
                  onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {idx < nodes.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
          );
        })}

        {/* Add buttons */}
        <div className="flex flex-wrap gap-2 pt-3">
          {(["trigger", "delay", "condition", "action"] as NodeKind[]).map((kind) => {
            const Icon = kindIcons[kind];
            return (
              <Button key={kind} size="sm" variant="outline" onClick={() => addNode(kind)} className="gap-1.5 capitalize">
                <Plus className="h-3 w-3" />
                <Icon className="h-3.5 w-3.5" />
                {kind}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Config panel */}
      <div className="w-72 shrink-0">
        {selected ? (
          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Configure Step</CardTitle>
                <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Label</label>
                <Input value={selected.label} onChange={(e) => updateNode(selected.id, { label: e.target.value })} />
              </div>

              {selected.kind === "trigger" && (
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Event</label>
                  <Select
                    value={selected.config.type}
                    onValueChange={(v) => updateNode(selected.id, { config: { ...selected.config, type: v } })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIGGER_CATALOG.map((t) => (
                        <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selected.kind === "delay" && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Duration</label>
                    <Input
                      type="number"
                      min={1}
                      value={selected.config.duration ?? "1"}
                      onChange={(e) => updateNode(selected.id, { config: { ...selected.config, duration: e.target.value } })}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Unit</label>
                    <Select
                      value={selected.config.unit ?? "days"}
                      onValueChange={(v) => updateNode(selected.id, { config: { ...selected.config, unit: v } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selected.kind === "condition" && (
                <>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Condition</label>
                    <Select
                      value={selected.config.op ?? "has_tag"}
                      onValueChange={(v) => updateNode(selected.id, { config: { ...selected.config, op: v } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="has_tag">Has Tag</SelectItem>
                        <SelectItem value="visited_last_30d">Visited Last 30 Days</SelectItem>
                        <SelectItem value="membership_active">Membership Active</SelectItem>
                        <SelectItem value="vip">Is VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Value</label>
                    <Input
                      value={selected.config.value ?? ""}
                      onChange={(e) => updateNode(selected.id, { config: { ...selected.config, value: e.target.value } })}
                      placeholder="e.g. 'vip' or 'returning'"
                    />
                  </div>
                </>
              )}

              {selected.kind === "action" && (
                <>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Action</label>
                    <Select
                      value={selected.config.type ?? "send_email"}
                      onValueChange={(v) => {
                        const lbl = ACTION_CATALOG.find((a) => a.type === v)?.label ?? v;
                        updateNode(selected.id, { label: lbl, config: { ...selected.config, type: v } });
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTION_CATALOG.map((a) => (
                          <SelectItem key={a.type} value={a.type}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Template / Message</label>
                    <Input
                      value={selected.config.template ?? ""}
                      onChange={(e) => updateNode(selected.id, { config: { ...selected.config, template: e.target.value } })}
                      placeholder="Template name or message"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Click a node to configure it
          </div>
        )}
      </div>
    </div>
  );
}
