import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { ItemFormInput } from "../schemas/item";
import { useSupabaseClient } from "../supabase/context";
import type { Item, ItemWithDetails } from "../types/database";
import { queryKeys } from "./keys";

// Embeds the real `reservations` foreign key (items -> reservations) and
// computes availability client-side, rather than embedding the
// `item_availability` view: PostgREST can't auto-detect an embeddable
// relationship through an aggregate view (no real FK to trace), which was
// causing a 400 on every fetch that tried to embed it.
//
// `creator` embeds the item's own added-by profile (items.created_by is the
// only FK from items to profiles, so this resolves unambiguously) — shown
// on the item detail page so a browsing user can contact them before
// reserving.
const ITEM_WITH_DETAILS_SELECT =
  "*, location:locations(*), item_photos(*), reservations(quantity, status), creator:profiles(name, email)";

export const ITEMS_PAGE_SIZE = 20;

function escapeForIlike(term: string) {
  // Postgrest's or()/ilike filter string is comma/paren-delimited — strip
  // characters that would break out of it rather than reject the search.
  return term.replace(/[,()%*]/g, "");
}

/**
 * @param locationIds When provided, restricts results to items whose
 * location_id is in this set — pass a location plus its descendant
 * sub-locations (see getDescendantLocationIds) to filter by a whole yard.
 */
export function useItems(locationIds?: string[] | null) {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: queryKeys.items(locationIds),
    queryFn: async () => {
      let query = supabase
        .from("items")
        .select(ITEM_WITH_DETAILS_SELECT)
        .order("name", { ascending: true });

      if (locationIds && locationIds.length > 0) {
        query = query.in("location_id", locationIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(normalizeItemWithDetails);
    },
  });
}

/**
 * Paginated materials list — fetches one page at a time instead of the
 * whole table, so a growing catalog doesn't mean a growing initial load.
 * Search runs server-side (Postgres ilike) so it matches across every
 * page, not just whatever happens to already be loaded.
 *
 * @param hideFullyReserved When true, drops items with 0 available quantity
 * from the returned page (staff Browse shouldn't offer stock nobody can
 * take) — admin's materials list passes this as false so it keeps showing
 * everything regardless of reservation state. Filtering happens after the
 * page is fetched, so `nextOffset` still tracks rows consumed from the
 * database, not rows displayed — a page may render fewer than
 * ITEMS_PAGE_SIZE cards without affecting pagination correctness.
 * @param ownedByUserId When provided, restricts results to items this user
 * added, plus any legacy item with no recorded owner (created_by null) —
 * used by "Manage Materials" so each maximum-tier user only sees (and can
 * only act on) their own additions. Browse omits this — every user sees
 * the full catalog regardless of who added what.
 * @param matchingLocationIds Location ids whose name/path matches the
 * search term (computed by the caller from the already-loaded locations
 * list — see matchingLocationIds in lib/locationTree) — folded into the
 * same search match as an OR, so "ormiston" finds materials stored under
 * an Ormiston location even when the term appears nowhere in the item's
 * own name/ID/notes/condition.
 */
export function useItemsInfinite(
  locationIds?: string[] | null,
  search?: string,
  hideFullyReserved?: boolean,
  ownedByUserId?: string | null,
  matchingLocationIds?: string[] | null
) {
  const supabase = useSupabaseClient();
  const term = search?.trim() ?? "";

  return useInfiniteQuery({
    queryKey: [
      ...queryKeys.items(locationIds),
      "infinite",
      term,
      hideFullyReserved ?? false,
      ownedByUserId ?? null,
      matchingLocationIds ?? null,
    ],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("items")
        .select(ITEM_WITH_DETAILS_SELECT)
        .order("name", { ascending: true })
        .range(pageParam, pageParam + ITEMS_PAGE_SIZE - 1);

      if (locationIds && locationIds.length > 0) {
        query = query.in("location_id", locationIds);
      }
      if (term) {
        const safe = escapeForIlike(term);
        const orParts = [
          `name.ilike.%${safe}%`,
          `identification_number.ilike.%${safe}%`,
          `notes.ilike.%${safe}%`,
          `condition.ilike.%${safe}%`,
        ];
        if (matchingLocationIds && matchingLocationIds.length > 0) {
          orParts.push(`location_id.in.(${matchingLocationIds.join(",")})`);
        }
        query = query.or(orParts.join(","));
      }
      if (ownedByUserId) {
        query = query.or(`created_by.eq.${ownedByUserId},created_by.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const fetchedCount = data?.length ?? 0;
      let items = (data ?? []).map(normalizeItemWithDetails);
      if (hideFullyReserved) {
        items = items.filter((item) => (item.availability?.available_quantity ?? item.quantity) > 0);
      }
      return {
        items,
        nextOffset: fetchedCount === ITEMS_PAGE_SIZE ? pageParam + ITEMS_PAGE_SIZE : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });
}

/**
 * Lightweight aggregate counts for the stats bar — reads only the columns
 * needed for the sums, across the current filter, without pulling in the
 * photos/location joins the full list view needs.
 */
export function useItemsStats(locationIds?: string[] | null) {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: [...queryKeys.items(locationIds), "stats"],
    queryFn: async () => {
      let query = supabase.from("items").select("quantity, reservations(quantity, status)");

      if (locationIds && locationIds.length > 0) {
        query = query.in("location_id", locationIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as { quantity: number; reservations: { quantity: number; status: string }[] }[];
      let unitsAvailable = 0;
      let fullyReservedCount = 0;
      for (const row of rows) {
        const reserved = (row.reservations ?? [])
          .filter((r) => r.status === "active")
          .reduce((sum, r) => sum + r.quantity, 0);
        const available = row.quantity - reserved;
        unitsAvailable += available;
        if (available <= 0) fullyReservedCount += 1;
      }

      return { materialTypes: rows.length, unitsAvailable, fullyReservedCount };
    },
  });
}

export function useItem(
  itemId: string,
  options?: Pick<UseQueryOptions<ItemWithDetails>, "enabled">
) {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: queryKeys.item(itemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select(ITEM_WITH_DETAILS_SELECT)
        .eq("id", itemId)
        .single();
      if (error) throw error;
      return normalizeItemWithDetails(data);
    },
    enabled: options?.enabled ?? Boolean(itemId),
  });
}

// Computes availability from the embedded `reservations` rows instead of
// the (unembeddable) item_availability view, and drops the raw reservations
// array from the returned shape — callers only need the computed summary.
function normalizeItemWithDetails(raw: any): ItemWithDetails {
  const { reservations, ...item } = raw;
  const reservedQuantity = ((reservations ?? []) as { quantity: number; status: string }[])
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + r.quantity, 0);

  return {
    ...item,
    availability: {
      item_id: raw.id,
      total_quantity: raw.quantity,
      reserved_quantity: reservedQuantity,
      available_quantity: raw.quantity - reservedQuantity,
    },
  };
}

export function useCreateItem() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ItemFormInput) => {
      const { data, error } = await supabase
        .from("items")
        .insert({
          name: input.name,
          identification_number: input.identification_number || null,
          quantity: input.quantity,
          unit: input.unit || null,
          is_approximate: input.is_approximate ?? false,
          condition: input.condition || null,
          location_id: input.location_id,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Best-effort: queues this addition for the notification flush job
      // (send-item-notifications, runs every 2 minutes via pg_cron) —
      // never blocks or fails item creation itself.
      void supabase.from("pending_item_notifications").insert({ item_name: input.name });

      return data as Item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useUpdateItem(itemId: string) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ItemFormInput) => {
      const { data, error } = await supabase
        .from("items")
        .update({
          name: input.name,
          identification_number: input.identification_number || null,
          quantity: input.quantity,
          unit: input.unit || null,
          is_approximate: input.is_approximate ?? false,
          condition: input.condition || null,
          location_id: input.location_id,
          notes: input.notes || null,
        })
        .eq("id", itemId)
        .select()
        .single();
      if (error) throw error;
      return data as Item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.item(itemId) });
    },
  });
}

export function useDeleteItem() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("items").delete().eq("id", itemId);
      if (error) throw error;
      return itemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      // Any reservation of this item now shows it as "removed" rather than
      // its (now-gone) name — refresh both reservation lists so that shows
      // up immediately instead of stale cached item details.
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });
}
