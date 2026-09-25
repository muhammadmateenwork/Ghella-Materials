import writeXlsxFile from "write-excel-file/universal";
import type { Row } from "write-excel-file/universal";
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
  comments: string | null;
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

/** One-shot (non-paginated) fetch for an export — not a hook, since an
 * export is a single imperative action rather than a live-updating view. */
export async function fetchItemsForExport(
  supabase: GhellaSupabaseClient,
  filters: ExportFilters
): Promise<ExportItemRow[]> {
  const reservationSelect = filters.includeReservationDetails
    ? "reservations(quantity, status, contact_info, comments, created_at, cancelled_at, user:profiles(name, email))"
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

// Brand palette, matching the app's own theme tokens — the exported
// workbook should look like it came from Ghella Materials, not a generic
// data dump.
const BRAND = {
  ink: "#14213D",
  primary: "#E8590C",
  primaryText: "#14213D",
  surfaceAlt: "#EAEEF3",
  border: "#D7DEE7",
  white: "#FFFFFF",
  textMuted: "#55617A",
};

function titleBand(text: string, columnCount: number): Row {
  return [
    { value: text, columnSpan: columnCount, fontWeight: "bold", fontSize: 13, textColor: BRAND.white, backgroundColor: BRAND.ink, align: "left", height: 24 },
    ...Array(Math.max(columnCount - 1, 0)).fill(null),
  ];
}

function subtitleBand(text: string, columnCount: number): Row {
  return [
    { value: text, columnSpan: columnCount, fontStyle: "italic", fontSize: 10, textColor: BRAND.textMuted, align: "left" },
    ...Array(Math.max(columnCount - 1, 0)).fill(null),
  ];
}

function headerRow(labels: string[]): Row {
  return labels.map((label) => ({
    value: label,
    fontWeight: "bold" as const,
    fontSize: 11,
    textColor: BRAND.primaryText,
    backgroundColor: BRAND.primary,
    align: "left" as const,
    height: 20,
    borderColor: BRAND.border,
    borderStyle: "thin" as const,
  }));
}

function dataRow(
  cells: (string | number | null | undefined)[],
  rowIndex: number,
  numericColumns: Set<number> = new Set()
): Row {
  const shaded = rowIndex % 2 === 1;
  return cells.map((value, i) => ({
    value: value === null || value === undefined || value === "" ? undefined : value,
    type: typeof value === "number" ? Number : String,
    fontSize: 10.5,
    align: numericColumns.has(i) ? ("right" as const) : ("left" as const),
    backgroundColor: shaded ? BRAND.surfaceAlt : BRAND.white,
    borderColor: BRAND.border,
    borderStyle: "hair" as const,
    wrap: true,
  }));
}

function generatedAt(): string {
  return `Generated ${new Date().toLocaleString()}`;
}

/** Builds the materials export workbook — either one row per item (a
 * summary), or one row per active reservation when includeReservationDetails
 * is set (so "who reserved how much of what" is visible directly, for a
 * single item or many). Cancelled reservations are left out — the report is
 * about what's currently reserved, not reservation history. */
export async function itemsToXlsx(
  items: ExportItemRow[],
  locations: Location[],
  includeReservationDetails: boolean
): Promise<Blob> {
  if (includeReservationDetails) {
    const headers = [
      "Material",
      "ID Number",
      "Location",
      "Total Qty",
      "Unit",
      "Condition",
      "Reserved By",
      "Reserver Email",
      "Reserved Qty",
      "Contact Info",
      "Comments",
      "Reserved At",
    ];
    const rows: Row[] = [];
    let i = 0;
    for (const item of items) {
      const path = getLocationPath(locations, item.location_id);
      const active = (item.reservations ?? []).filter((r) => r.status === "active");
      if (active.length === 0) {
        rows.push(dataRow([item.name, item.identification_number, path, item.quantity, item.unit, item.condition, "", "", "", "", "", ""], i++, new Set([3, 8])));
        continue;
      }
      for (const r of active) {
        rows.push(
          dataRow(
            [
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
              r.comments,
              new Date(r.created_at).toLocaleString(),
            ],
            i++,
            new Set([3, 8])
          )
        );
      }
    }
    return writeXlsxFile(
      [titleBand("GHELLA MATERIALS", headers.length), subtitleBand(generatedAt(), headers.length), headerRow(headers), ...rows],
      { columns: [{ width: 22 }, { width: 14 }, { width: 22 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 18 }, { width: 24 }, { width: 12 }, { width: 26 }, { width: 30 }, { width: 18 }] }
    ).toBlob();
  }

  const headers = [
    "Material",
    "ID Number",
    "Location",
    "Total Qty",
    "Unit",
    "Approx.",
    "Condition",
    "Reserved",
    "Available",
    "Notes",
    "Added At",
  ];
  const rows = items.map((item, i) => {
    const reserved = (item.reservations ?? [])
      .filter((r) => r.status === "active")
      .reduce((sum, r) => sum + r.quantity, 0);
    return dataRow(
      [
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
      ],
      i,
      new Set([3, 7, 8])
    );
  });
  return writeXlsxFile(
    [titleBand("GHELLA MATERIALS", headers.length), subtitleBand(generatedAt(), headers.length), headerRow(headers), ...rows],
    { columns: [{ width: 22 }, { width: 14 }, { width: 22 }, { width: 10 }, { width: 10 }, { width: 9 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 26 }, { width: 18 }] }
  ).toBlob();
}

/** Workbook for a single item's already-loaded active reservation list (see
 * useItemReservations) — used by the per-item Reservations page's export
 * shortcut, which already has this data in hand and doesn't need a fresh
 * fetch. */
export async function reservationsToXlsx(itemName: string, reservations: ReservationWithDetails[]): Promise<Blob> {
  const headers = ["Material", "Reserved By", "Reserver Email", "Reserved Qty", "Contact Info", "Comments", "Reserved At"];
  const rows = reservations.map((r, i) =>
    dataRow(
      [itemName, r.user?.name ?? "Deleted user", r.user?.email ?? "", r.quantity, r.contact_info, r.comments, new Date(r.created_at).toLocaleString()],
      i,
      new Set([3])
    )
  );
  return writeXlsxFile([titleBand("GHELLA MATERIALS", headers.length), subtitleBand(generatedAt(), headers.length), headerRow(headers), ...rows], {
    columns: [{ width: 22 }, { width: 18 }, { width: 26 }, { width: 12 }, { width: 26 }, { width: 30 }, { width: 18 }],
  }).toBlob();
}
