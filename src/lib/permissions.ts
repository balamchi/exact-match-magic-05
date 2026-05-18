/**
 * ClinicPro Permission System — Single Source of Truth
 *
 * Define which roles can perform which actions across the app.
 * Used by UI gating (PermissionGate component, hide/show buttons)
 * and server-side checks (will be wired in Commit 4.5).
 *
 * Permission key format: "module.action[.scope]"
 *   module: clinic, clients, appointments, services, consent_forms, etc.
 *   action: read, write, delete, sign, run, reset
 *   scope (optional): own, all
 */

import type { ClinicRole } from "@/lib/auth-context";

// ─────────────────────────────────────────────────────────────────
// Permission Keys (the universe of all permissions in the app)
// ─────────────────────────────────────────────────────────────────

export const PERMISSION_KEYS = [
  // Clinic Settings
  "clinic.settings.read",
  "clinic.settings.write",
  "clinic.delete",
  "clinic.billing.read",
  "clinic.billing.write",

  // Users & Roles
  "users.read",
  "users.invite",
  "users.manage_roles",
  "users.remove",

  // Clients
  "clients.read",
  "clients.write",
  "clients.delete",
  "clients.export",

  // Appointments
  "appointments.read.own",
  "appointments.read.all",
  "appointments.write",
  "appointments.cancel",
  "appointments.checkin",

  // Services
  "services.read",
  "services.write",
  "services.delete",

  // Consent Forms
  "consent_forms.read",
  "consent_forms.write",
  "consent_forms.sign",

  // SOAP Notes (clinical)
  "soap_notes.read.own",
  "soap_notes.read.all",
  "soap_notes.write",

  // Before/After photos (clinical media)
  "before_after.read",
  "before_after.write",
  "before_after.delete",

  // Automations
  "automations.read",
  "automations.write",

  // Memberships
  "memberships.read",
  "memberships.write",

  // Payments & Billing
  "payments.process",
  "payments.refund",
  "billing.read",

  // Reports
  "reports.read",
  "reports.export",

  // Staff
  "staff.read",
  "staff.write",

  // Setup / Seeding (admin tools)
  "seed.run",
  "seed.reset",
  "seed.view_log",
  // Audit
  "audit.read",
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

// ─────────────────────────────────────────────────────────────────
// Role → Permission Matrix
// ─────────────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<ClinicRole, ReadonlyArray<PermissionKey>> = {
  owner: [
    "clinic.settings.read", "clinic.settings.write", "clinic.delete",
    "clinic.billing.read", "clinic.billing.write",
    "users.read", "users.invite", "users.manage_roles", "users.remove",
    "clients.read", "clients.write", "clients.delete", "clients.export",
    "appointments.read.own", "appointments.read.all", "appointments.write",
    "appointments.cancel", "appointments.checkin",
    "services.read", "services.write", "services.delete",
    "consent_forms.read", "consent_forms.write", "consent_forms.sign",
    "soap_notes.read.own", "soap_notes.read.all", "soap_notes.write",
    "automations.read", "automations.write",
    "memberships.read", "memberships.write",
    "payments.process", "payments.refund",
    "billing.read",
    "reports.read", "reports.export",
    "staff.read", "staff.write",
    "seed.run", "seed.reset", "seed.view_log",
    "audit.read",
  ],

  senior_admin: [
    "clinic.settings.read", "clinic.settings.write",
    "clinic.billing.read",
    "users.read", "users.invite", "users.manage_roles", "users.remove",
    "clients.read", "clients.write", "clients.delete", "clients.export",
    "appointments.read.own", "appointments.read.all", "appointments.write",
    "appointments.cancel", "appointments.checkin",
    "services.read", "services.write", "services.delete",
    "consent_forms.read", "consent_forms.write", "consent_forms.sign",
    "soap_notes.read.own", "soap_notes.read.all", "soap_notes.write",
    "automations.read", "automations.write",
    "memberships.read", "memberships.write",
    "payments.process", "payments.refund",
    "billing.read",
    "reports.read", "reports.export",
    "staff.read", "staff.write",
    "seed.run", "seed.reset", "seed.view_log",
    "audit.read",
  ],

  // Legacy — same as senior_admin for backwards compat
  admin: [
    "clinic.settings.read", "clinic.settings.write",
    "clinic.billing.read",
    "users.read", "users.invite", "users.manage_roles", "users.remove",
    "clients.read", "clients.write", "clients.delete", "clients.export",
    "appointments.read.own", "appointments.read.all", "appointments.write",
    "appointments.cancel", "appointments.checkin",
    "services.read", "services.write", "services.delete",
    "consent_forms.read", "consent_forms.write", "consent_forms.sign",
    "soap_notes.read.own", "soap_notes.read.all", "soap_notes.write",
    "automations.read", "automations.write",
    "memberships.read", "memberships.write",
    "payments.process", "payments.refund",
    "billing.read",
    "reports.read", "reports.export",
    "staff.read", "staff.write",
    "seed.run", "seed.reset", "seed.view_log",
    "audit.read",
  ],

  junior_admin: [
    "clinic.settings.read",
    "users.read",
    "clients.read", "clients.write", "clients.export",
    "appointments.read.own", "appointments.read.all", "appointments.write",
    "appointments.cancel", "appointments.checkin",
    "services.read", "services.write",
    "consent_forms.read", "consent_forms.write", "consent_forms.sign",
    "soap_notes.read.own", "soap_notes.read.all", "soap_notes.write",
    "automations.read", "automations.write",
    "memberships.read", "memberships.write",
    "payments.process",
    "billing.read",
    "reports.read", "reports.export",
    "staff.read",
    "seed.view_log",
    "audit.read",
  ],

  manager: [
    "clinic.settings.read",
    "users.read",
    "clients.read", "clients.write",
    "appointments.read.own", "appointments.read.all", "appointments.write",
    "appointments.cancel", "appointments.checkin",
    "services.read",
    "consent_forms.read", "consent_forms.sign",
    "soap_notes.read.own", "soap_notes.read.all", "soap_notes.write",
    "automations.read",
    "memberships.read",
    "payments.process",
    "billing.read",
    "reports.read",
    "staff.read", "staff.write",
    "seed.view_log",
    "audit.read",
  ],

  provider: [
    "clinic.settings.read",
    "users.read",
    "clients.read", "clients.write",
    "appointments.read.own", "appointments.write",
    "appointments.checkin",
    "services.read",
    "consent_forms.read", "consent_forms.sign",
    "soap_notes.read.own", "soap_notes.write",
    "memberships.read",
    "staff.read",
  ],

  front_desk: [
    "clients.read", "clients.write",
    "appointments.read.all", "appointments.write",
    "appointments.cancel", "appointments.checkin",
    "services.read",
    "consent_forms.read",
    "memberships.read",
    "payments.process",
    "staff.read",
  ],
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

export function hasPermission(
  role: ClinicRole | null | undefined,
  permission: PermissionKey,
): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function hasAllPermissions(
  role: ClinicRole | null | undefined,
  permissions: PermissionKey[],
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function hasAnyPermission(
  role: ClinicRole | null | undefined,
  permissions: PermissionKey[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export const ROLE_LABELS: Record<ClinicRole, string> = {
  owner: "Owner",
  senior_admin: "Senior Admin",
  admin: "Admin (Legacy)",
  junior_admin: "Junior Admin",
  manager: "Manager",
  provider: "Provider",
  front_desk: "Front Desk",
};

export const ROLE_DESCRIPTIONS: Record<ClinicRole, string> = {
  owner: "Full control. Can delete the clinic and manage billing.",
  senior_admin: "Trusted operator. Everything except delete clinic and billing changes.",
  admin: "Legacy role — mapped to Senior Admin permissions.",
  junior_admin: "Day-to-day admin. Manages content but cannot reset data or change billing.",
  manager: "Shift lead. Manages staff, schedules, and reports.",
  provider: "Practitioner. Clinical work on own caseload only.",
  front_desk: "Reception. Booking and check-in only. No clinical data.",
};

export const PERMISSION_MODULES = [
  { key: "clinic", label: "Clinic Settings", keys: ["clinic.settings.read", "clinic.settings.write", "clinic.delete", "clinic.billing.read", "clinic.billing.write"] },
  { key: "users", label: "Users & Roles", keys: ["users.read", "users.invite", "users.manage_roles", "users.remove"] },
  { key: "clients", label: "Clients", keys: ["clients.read", "clients.write", "clients.delete", "clients.export"] },
  { key: "appointments", label: "Appointments", keys: ["appointments.read.own", "appointments.read.all", "appointments.write", "appointments.cancel", "appointments.checkin"] },
  { key: "services", label: "Services", keys: ["services.read", "services.write", "services.delete"] },
  { key: "consent_forms", label: "Consent Forms", keys: ["consent_forms.read", "consent_forms.write", "consent_forms.sign"] },
  { key: "soap_notes", label: "SOAP Notes", keys: ["soap_notes.read.own", "soap_notes.read.all", "soap_notes.write"] },
  { key: "automations", label: "Automations", keys: ["automations.read", "automations.write"] },
  { key: "memberships", label: "Memberships", keys: ["memberships.read", "memberships.write"] },
  { key: "payments", label: "Payments & Billing", keys: ["payments.process", "payments.refund", "billing.read"] },
  { key: "reports", label: "Reports", keys: ["reports.read", "reports.export"] },
  { key: "staff", label: "Staff", keys: ["staff.read", "staff.write"] },
  { key: "seed", label: "Setup & Seeding", keys: ["seed.run", "seed.reset", "seed.view_log"] },
  { key: "audit", label: "Audit Log", keys: ["audit.read"] },
] as const;
