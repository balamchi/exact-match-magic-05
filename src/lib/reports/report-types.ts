// Report type definitions for the simplified Builder.
// Each type defines its filters, columns, KPI labels, and chart axes.

export type ReportType =
  | "sales" | "appointments" | "clients" | "staff"
  | "memberships" | "inventory" | "giftcards" | "refunds";

export type ViewMode = "table" | "bar" | "line" | "pie";

export type StatusFilter = "all" | "completed" | "cancelled" | "no_show" | "pending";

export interface ReportFilters {
  locationId: string;          // "all" or uuid
  staffId: string;             // "all" or uuid
  serviceId: string;           // "all" or uuid
  status: StatusFilter;
  // Optional / advanced
  paymentMethod?: string;      // "all" | "card" | "cash" | "other"
  firstTimeOnly?: boolean;
  source?: string;             // client acquisition source
}

export const DEFAULT_FILTERS: ReportFilters = {
  locationId: "all",
  staffId: "all",
  serviceId: "all",
  status: "all",
  paymentMethod: "all",
  firstTimeOnly: false,
  source: "all",
};

export type ColumnFormat = "money" | "num" | "pct" | "date" | "datetime" | "time" | "text" | "status";

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: ColumnFormat;
  sortable?: boolean;
}

export interface ReportTypeDef {
  key: ReportType;
  label: string;
  icon: string;          // emoji
  description: string;
  columns: ReportColumn[];
  // Which filters are relevant (rest are hidden)
  showFilters: { location?: boolean; staff?: boolean; service?: boolean; status?: boolean; paymentMethod?: boolean; firstTime?: boolean; source?: boolean };
  // Chart hint
  chart: { xLabel: string; yLabel: string };
  // KPI labels in display order
  kpiLabels: [string, string, string, string];
}

export const REPORT_TYPES: ReportTypeDef[] = [
  {
    key: "sales", label: "Sales", icon: "📊",
    description: "Revenue from completed appointments",
    columns: [
      { key: "date", label: "Date", format: "datetime", sortable: true },
      { key: "client", label: "Client", format: "text" },
      { key: "service", label: "Service", format: "text" },
      { key: "staff", label: "Staff", format: "text" },
      { key: "amount", label: "Amount", format: "money", align: "right", sortable: true },
    ],
    showFilters: { location: true, staff: true, service: true, status: true, paymentMethod: true },
    chart: { xLabel: "Date", yLabel: "Revenue" },
    kpiLabels: ["Revenue", "Bookings", "Avg ticket", "No-show %"],
  },
  {
    key: "appointments", label: "Appointments", icon: "📅",
    description: "All appointments in the period",
    columns: [
      { key: "date", label: "Date", format: "date", sortable: true },
      { key: "time", label: "Time", format: "time" },
      { key: "client", label: "Client", format: "text" },
      { key: "service", label: "Service", format: "text" },
      { key: "staff", label: "Staff", format: "text" },
      { key: "status", label: "Status", format: "status" },
    ],
    showFilters: { location: true, staff: true, service: true, status: true },
    chart: { xLabel: "Date", yLabel: "Bookings" },
    kpiLabels: ["Bookings", "Completed", "Cancelled", "Utilization"],
  },
  {
    key: "clients", label: "Clients", icon: "👥",
    description: "Client visit history and lifetime value",
    columns: [
      { key: "name", label: "Name", format: "text" },
      { key: "first_visit", label: "First visit", format: "date", sortable: true },
      { key: "last_visit", label: "Last visit", format: "date", sortable: true },
      { key: "visits", label: "Visits", format: "num", align: "right", sortable: true },
      { key: "ltv", label: "LTV", format: "money", align: "right", sortable: true },
    ],
    showFilters: { source: true, firstTime: true },
    chart: { xLabel: "Source", yLabel: "Clients" },
    kpiLabels: ["Active", "New", "Returning", "Avg LTV"],
  },
  {
    key: "staff", label: "Staff performance", icon: "👨‍💼",
    description: "Bookings, hours and revenue per staff",
    columns: [
      { key: "name", label: "Staff", format: "text" },
      { key: "bookings", label: "Bookings", format: "num", align: "right", sortable: true },
      { key: "hours", label: "Hours", format: "num", align: "right", sortable: true },
      { key: "revenue", label: "Revenue", format: "money", align: "right", sortable: true },
      { key: "avg_ticket", label: "Avg ticket", format: "money", align: "right" },
    ],
    showFilters: { location: true, service: true, status: true },
    chart: { xLabel: "Staff", yLabel: "Revenue" },
    kpiLabels: ["Top staff", "Hours booked", "Revenue", "Utilization"],
  },
  {
    key: "memberships", label: "Memberships", icon: "💎",
    description: "Active subscriptions and MRR",
    columns: [
      { key: "client", label: "Member", format: "text" },
      { key: "plan", label: "Plan", format: "text" },
      { key: "started", label: "Started", format: "date", sortable: true },
      { key: "mrr", label: "MRR", format: "money", align: "right", sortable: true },
      { key: "status", label: "Status", format: "status" },
    ],
    showFilters: {},
    chart: { xLabel: "Plan", yLabel: "MRR" },
    kpiLabels: ["MRR", "Active", "New", "Churn rate"],
  },
  {
    key: "inventory", label: "Inventory", icon: "📦",
    description: "Stock levels and value on hand",
    columns: [
      { key: "name", label: "Product", format: "text" },
      { key: "stock", label: "Stock", format: "num", align: "right", sortable: true },
      { key: "threshold", label: "Threshold", format: "num", align: "right" },
      { key: "cost", label: "Cost", format: "money", align: "right" },
      { key: "value", label: "Value", format: "money", align: "right", sortable: true },
    ],
    showFilters: {},
    chart: { xLabel: "Product", yLabel: "Value" },
    kpiLabels: ["Items", "Low stock", "Expiring", "Total value"],
  },
  {
    key: "giftcards", label: "Gift cards", icon: "🎁",
    description: "Issued, redeemed, and outstanding liability",
    columns: [
      { key: "code", label: "Card #", format: "text" },
      { key: "recipient", label: "Issued to", format: "text" },
      { key: "issued", label: "Issued on", format: "date", sortable: true },
      { key: "balance", label: "Balance", format: "money", align: "right", sortable: true },
      { key: "status", label: "Status", format: "status" },
    ],
    showFilters: {},
    chart: { xLabel: "Month", yLabel: "Issued" },
    kpiLabels: ["Issued", "Redeemed", "Outstanding", "Liability"],
  },
  {
    key: "refunds", label: "Refunds", icon: "💸",
    description: "Refunded transactions",
    columns: [
      { key: "date", label: "Date", format: "datetime", sortable: true },
      { key: "client", label: "Client", format: "text" },
      { key: "original", label: "Original sale", format: "money", align: "right" },
      { key: "refund", label: "Refund", format: "money", align: "right", sortable: true },
      { key: "method", label: "Method", format: "text" },
    ],
    showFilters: { paymentMethod: true },
    chart: { xLabel: "Date", yLabel: "Refunded" },
    kpiLabels: ["Total refunded", "Count", "Avg refund", "Refund rate"],
  },
];

export const REPORT_TYPE_MAP: Record<ReportType, ReportTypeDef> =
  REPORT_TYPES.reduce((acc, t) => ({ ...acc, [t.key]: t }), {} as Record<ReportType, ReportTypeDef>);
