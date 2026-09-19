import { getLocationPath } from "./locationTree";
import type { GhellaSupabaseClient } from "../supabase/client";
import type { Location, ReservationWithDetails } from "../types/database";

export type ExportReservationStatus = "all" | "none" | "partial" | "full";

export interface ExportFilters {
  // Restricts to items this user added, plus any legacy unowned item —
  // same semantics as useItemsInfinite's ownedByUserId, so an export from
  // Manage Materials only ever covers materials the exporting user
  // actually manages.
  ownedByUserId?: string | null;
  createdFrom?: string | null; // yyyy-mm-dd, inclusive
  createdTo?: string | null; // yyyy-mm-dd, inclusive
  reservationStatus?: ExportReservationStatus;
  // One row per reservation (item repeated) instead of one row per item —
  // needed to show who reserved how much of what.
  includeReservationDetails?: boolean;
}

type ExportReservation = {
  quantity: number;
  status: "active" | "cancelled";
  contact_info: string | null;
  created_at: string;
  cancelled_at: string | null;
  user: { name: string; email: string } | null;
};

type ExportItemRow = {
  id: string;
  name: string;
  identification_number: string | null;
  quantity: number;
  unit: string | null;
  is_approximate: boolean;
  condition: string | null;
  notes: string | null;
  location_id: string;
  created_at: string;
  reservations: ExportReservation[];
};

/** One-shot (non-paginated) fetch for a CSV export — not a hook, since an
 * export is a single imperative action rather than a live-updating view. */
export async function fetchItemsForExport(
  supabase: GhellaSupabaseClient,
  filters: ExportFilters
): Promise<ExportItemRow[]> {
  const reservationSelect = filters.includeReservationDetails
    ? "reservations(quantity, status, contact_info, created_at, cancelled_at, user:profiles(name, email))"
    : "reservations(quantity, status)";

  let query = supabase
    .from("items")
    .select(`id, name, identification_number, quantity, unit, is_approximate, condition, notes, location_id, created_at, ${reservationSelect}`)
    .order("name", { ascending: true });

  if (filters.ownedByUserId) {
    query = query.or(`created_by.eq.${filters.ownedByUserId},created_by.is.null`);
  }
  if (filters.createdFrom) query = query.gte("created_at", filters.createdFrom);
  if (filters.createdTo) query = query.lte("created_at", `${filters.createdTo}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) throw error;

  let items = (data ?? []) as unknown as ExportItemRow[];

  if (filters.reservationStatus && filters.reservationStatus !== "all") {
    items = items.filter((item) => {
      const reserved = (item.reservations ?? [])
        .filter((r) => r.status === "active")
        .reduce((sum, r) => sum + r.quantity, 0);
      const available = item.quantity - reserved;
      if (filters.reservationStatus === "none") return reserved === 0;
      if (filters.reservationStatus === "full") return available <= 0;
      if (filters.reservationStatus === "partial") return reserved > 0 && available > 0;
      return true;
    });
  }

  return items;
}

function escapeCsvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCsvField).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(","));
  }
  // \r\n line endings — the widely-compatible choice for CSVs opened in
  // spreadsheet apps (Excel in particular treats bare \n inconsistently).
  return lines.join("\r\n");
}

/** Builds the CSV text for a materials export — either one row per item
 * (a summary), or one row per reservation when includeReservationDetails
 * is set (so "who reserved how much of what" is visible directly, for a
 * single item or many). */
export function itemsToCsv(
  items: ExportItemRow[],
  locations: Location[],
  includeReservationDetails: boolean
): string {
  if (includeReservationDetails) {
    const headers = [
      "Material",
      "ID Number",
      "Location",
      "Total Quantity",
      "Unit",
      "Condition",
      "Reserved By",
      "Reserver Email",
      "Reserved Quantity",
      "Reserver Contact Info",
      "Reservation Status",
      "Reserved At",
    ];
    const rows: (string | number | null)[][] = [];
    for (const item of items) {
      const path = getLocationPath(locations, item.location_id);
      const reservations = item.reservations ?? [];
      if (reservations.length === 0) {
        rows.push([item.name, item.identification_number, path, item.quantity, item.unit, item.condition, "", "", "", "", "No reservations", ""]);
        continue;
      }
      for (const r of reservations) {
        rows.push([
          item.name,
          item.identification_number,
          path,
          item.quantity,
          item.unit,
          item.condition,
          r.user?.name ?? "Deleted user",
          r.user?.email ?? "",
          r.quantity,
          r.contact_info,
          r.status === "active" ? "Active" : "Cancelled",
          new Date(r.created_at).toLocaleString(),
        ]);
      }
    }
    return buildCsv(headers, rows);
  }

  const headers = [
    "Material",
    "ID Number",
    "Location",
    "Total Quantity",
    "Unit",
    "Approximate",
    "Condition",
    "Reserved Quantity",
    "Available Quantity",
    "Notes",
    "Added At",
  ];
  const rows = items.map((item) => {
    const reserved = (item.reservations ?? [])
      .filter((r) => r.status === "active")
      .reduce((sum, r) => sum + r.quantity, 0);
    return [
      item.name,
      item.identification_number,
      getLocationPath(locations, item.location_id),
      item.quantity,
      item.unit,
      item.is_approximate ? "Yes" : "No",
      item.condition,
      reserved,
      item.quantity - reserved,
      item.notes,
      new Date(item.created_at).toLocaleString(),
    ];
  });
  return buildCsv(headers, rows);
}

/** CSV for a single item's already-loaded reservation list (see
 * useItemReservations) — used by the per-item Reservations page's "Export
 * CSV" shortcut, which already has this data in hand and doesn't need a
 * fresh fetch. */
export function reservationsToCsv(itemName: string, reservations: ReservationWithDetails[]): string {
  const headers = ["Material", "Reserved By", "Reserver Email", "Reserved Quantity", "Reserver Contact Info", "Reserved At"];
  const rows = reservations.map((r) => [
    itemName,
    r.user?.name ?? "Deleted user",
    r.user?.email ?? "",
    r.quantity,
    r.contact_info,
    new Date(r.created_at).toLocaleString(),
  ]);
  return buildCsv(headers, rows);
}
