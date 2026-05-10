// Whitelisted dimensions and metrics for the custom report builder.
// All queries flow through this schema — fields not declared here cannot
// be queried from the UI.

export type DataSource = "appointments" | "clients" | "invoices" | "memberships" | "leads";
export type Aggregation = "sum" | "count" | "avg" | "min" | "max" | "count_distinct";
export type Format = "currency" | "number" | "percent" | "duration";
export type Visualization = "bar" | "line" | "pie" | "table" | "heatmap" | "kpi";

export interface DimensionDef {
  key: string;
  label: string;
  field: string; // column on the source row, or a derived key (day_of_week, month, etc.)
  derived?: "day_of_week" | "hour_of_day" | "week" | "month" | "quarter" | "year" | "age_bucket" | "boolean";
}

export interface MetricDef {
  key: string;
  label: string;
  field: string;
  aggregation: Aggregation;
  format: Format;
  // optional row predicate to count/sum only matching rows
  filter?: (row: Record<string, unknown>) => boolean;
}

export interface SourceSchema {
  source: DataSource;
  label: string;
  table: string;
  dateField: string;
  dimensions: DimensionDef[];
  metrics: MetricDef[];
  // additional select columns needed for joins / derived fields
  select: string;
}

export const SCHEMAS: Record<DataSource, SourceSchema> = {
  appointments: {
    source: "appointments",
    label: "Appointments",
    table: "appointments",
    dateField: "starts_at",
    select:
      "id, status, price_cents, starts_at, staff_id, service_id, location_id, client_id, no_show_at, cancelled_at, services(name, category), staff(display_name), clients(source)",
    dimensions: [
      { key: "service_category", label: "Service category", field: "services.category" },
      { key: "service_name", label: "Service", field: "services.name" },
      { key: "staff_member", label: "Staff member", field: "staff.display_name" },
      { key: "status", label: "Status", field: "status" },
      { key: "client_source", label: "Acquisition source", field: "clients.source" },
      { key: "day_of_week", label: "Day of week", field: "starts_at", derived: "day_of_week" },
      { key: "hour_of_day", label: "Hour of day", field: "starts_at", derived: "hour_of_day" },
      { key: "week", label: "Week", field: "starts_at", derived: "week" },
      { key: "month", label: "Month", field: "starts_at", derived: "month" },
      { key: "quarter", label: "Quarter", field: "starts_at", derived: "quarter" },
    ],
    metrics: [
      { key: "revenue", label: "Revenue", field: "price_cents", aggregation: "sum", format: "currency",
        filter: (r) => r.status === "completed" },
      { key: "bookings", label: "Bookings", field: "id", aggregation: "count", format: "number" },
      { key: "completed", label: "Completed", field: "id", aggregation: "count", format: "number",
        filter: (r) => r.status === "completed" },
      { key: "no_shows", label: "No-shows", field: "id", aggregation: "count", format: "number",
        filter: (r) => r.status === "no_show" || !!r.no_show_at },
      { key: "cancellations", label: "Cancellations", field: "id", aggregation: "count", format: "number",
        filter: (r) => r.status === "cancelled" || !!r.cancelled_at },
      { key: "avg_ticket", label: "Avg ticket", field: "price_cents", aggregation: "avg", format: "currency",
        filter: (r) => r.status === "completed" },
      { key: "unique_clients", label: "Unique clients", field: "client_id", aggregation: "count_distinct", format: "number" },
    ],
  },
  clients: {
    source: "clients",
    label: "Clients",
    table: "clients",
    dateField: "created_at",
    select: "id, source, gender, created_at, city, country, marketing_consent",
    dimensions: [
      { key: "source", label: "Acquisition source", field: "source" },
      { key: "gender", label: "Gender", field: "gender" },
      { key: "city", label: "City", field: "city" },
      { key: "country", label: "Country", field: "country" },
      { key: "marketing_consent", label: "Marketing consent", field: "marketing_consent", derived: "boolean" },
      { key: "month", label: "Signup month", field: "created_at", derived: "month" },
      { key: "quarter", label: "Signup quarter", field: "created_at", derived: "quarter" },
    ],
    metrics: [
      { key: "clients", label: "Clients", field: "id", aggregation: "count", format: "number" },
      { key: "consented", label: "Marketing consented", field: "id", aggregation: "count", format: "number",
        filter: (r) => !!r.marketing_consent },
    ],
  },
  invoices: {
    source: "invoices",
    label: "Invoices",
    table: "invoices",
    dateField: "issued_on",
    select: "id, status, total_cents, issued_on, client_id",
    dimensions: [
      { key: "status", label: "Status", field: "status" },
      { key: "month", label: "Month", field: "issued_on", derived: "month" },
      { key: "week", label: "Week", field: "issued_on", derived: "week" },
      { key: "quarter", label: "Quarter", field: "issued_on", derived: "quarter" },
    ],
    metrics: [
      { key: "total_revenue", label: "Total revenue", field: "total_cents", aggregation: "sum", format: "currency" },
      { key: "invoice_count", label: "Invoice count", field: "id", aggregation: "count", format: "number" },
      { key: "paid_count", label: "Paid count", field: "id", aggregation: "count", format: "number",
        filter: (r) => r.status === "paid" },
      { key: "unpaid_count", label: "Unpaid count", field: "id", aggregation: "count", format: "number",
        filter: (r) => r.status !== "paid" },
      { key: "avg_invoice", label: "Avg invoice", field: "total_cents", aggregation: "avg", format: "currency" },
    ],
  },
  memberships: {
    source: "memberships",
    label: "Memberships",
    table: "membership_subscriptions",
    dateField: "created_at",
    select: "id, status, created_at, canceled_at, membership_id, memberships(name, monthly_price_cents, billing_cadence)",
    dimensions: [
      { key: "plan_name", label: "Plan", field: "memberships.name" },
      { key: "status", label: "Status", field: "status" },
      { key: "billing_cadence", label: "Billing cadence", field: "memberships.billing_cadence" },
      { key: "cohort_month", label: "Cohort month", field: "created_at", derived: "month" },
    ],
    metrics: [
      { key: "subs", label: "Subscriptions", field: "id", aggregation: "count", format: "number" },
      { key: "active_subs", label: "Active", field: "id", aggregation: "count", format: "number",
        filter: (r) => r.status === "active" || r.status === "trialing" },
      { key: "churned_subs", label: "Churned", field: "id", aggregation: "count", format: "number",
        filter: (r) => !!r.canceled_at },
      { key: "mrr", label: "MRR", field: "memberships.monthly_price_cents", aggregation: "sum", format: "currency",
        filter: (r) => r.status === "active" || r.status === "trialing" },
    ],
  },
  leads: {
    source: "leads",
    label: "Leads",
    table: "leads",
    dateField: "created_at",
    select: "id, source, stage, assigned_to, estimated_value_cents, created_at, converted_to_client_id, staff:assigned_to(display_name)",
    dimensions: [
      { key: "source", label: "Source", field: "source" },
      { key: "stage", label: "Stage", field: "stage" },
      { key: "assigned_to", label: "Assigned to", field: "staff.display_name" },
      { key: "month", label: "Month", field: "created_at", derived: "month" },
      { key: "week", label: "Week", field: "created_at", derived: "week" },
    ],
    metrics: [
      { key: "leads_count", label: "Leads", field: "id", aggregation: "count", format: "number" },
      { key: "won_count", label: "Won", field: "id", aggregation: "count", format: "number",
        filter: (r) => r.stage === "converted" || r.stage === "won" || !!r.converted_to_client_id },
      { key: "lost_count", label: "Lost", field: "id", aggregation: "count", format: "number",
        filter: (r) => r.stage === "lost" },
      { key: "estimated_value", label: "Estimated value", field: "estimated_value_cents", aggregation: "sum", format: "currency" },
    ],
  },
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getDim(source: DataSource, key: string): DimensionDef | undefined {
  return SCHEMAS[source].dimensions.find((d) => d.key === key);
}
export function getMet(source: DataSource, key: string): MetricDef | undefined {
  return SCHEMAS[source].metrics.find((m) => m.key === key);
}

// === Config types ===
export interface FilterClause {
  field: string;
  operator: "eq" | "neq" | "in" | "gt" | "lt" | "contains";
  value: string | number | string[];
  label?: string;
}

export interface CustomReportConfig {
  source: DataSource;
  dimensions: string[]; // dimension keys
  metrics: string[]; // metric keys
  filters: FilterClause[];
  visualization: Visualization;
  dateRange: { from: string; to: string; preset?: string };
  comparison?: "previous-period" | "previous-year" | "none";
  sortBy?: { metric: string; direction: "asc" | "desc" };
  limit?: number;
}

export const DEFAULT_CONFIG: CustomReportConfig = {
  source: "appointments",
  dimensions: ["service_category"],
  metrics: ["revenue"],
  filters: [],
  visualization: "bar",
  dateRange: { from: "", to: "", preset: "30d" },
  comparison: "none",
  limit: 50,
};

export const VIZ_LIMITS: Record<Visualization, { dims: [number, number]; mets: [number, number] }> = {
  bar: { dims: [1, 2], mets: [1, 4] },
  line: { dims: [1, 2], mets: [1, 4] },
  pie: { dims: [1, 1], mets: [1, 1] },
  table: { dims: [0, 5], mets: [1, 8] },
  heatmap: { dims: [2, 2], mets: [1, 1] },
  kpi: { dims: [0, 0], mets: [1, 6] },
};

export function validateConfig(c: CustomReportConfig): string | null {
  const lim = VIZ_LIMITS[c.visualization];
  if (c.metrics.length < lim.mets[0]) return `Pick at least ${lim.mets[0]} metric`;
  if (c.metrics.length > lim.mets[1]) return `Maximum ${lim.mets[1]} metrics for this chart type`;
  if (c.dimensions.length < lim.dims[0]) return `Pick at least ${lim.dims[0]} dimension`;
  if (c.dimensions.length > lim.dims[1]) return `Maximum ${lim.dims[1]} dimensions for this chart type`;
  return null;
}
