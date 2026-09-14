import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, useSupabaseClient } from "../supabase/context";
import type { Reservation, ReservationWithDetails } from "../types/database";
import { queryKeys } from "./keys";

const RESERVATION_WITH_DETAILS_SELECT =
  "*, item:items(id, name, identification_number), user:profiles(id, name, email)";

export const RESERVATIONS_PAGE_SIZE = 20;

// Relies on an explicit user_id filter, not just RLS, because the RLS read
// policy also lets maximum-tier users read every row (for the admin
// Reservation Log) — without this filter, a maximum-tier user's "My
// Reservations" would silently show everyone's reservations too.
export function useMyReservations() {
  const supabase = useSupabaseClient();
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...queryKeys.myReservations(), userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select(RESERVATION_WITH_DETAILS_SELECT)
        .eq("user_id", userId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ReservationWithDetails[];
    },
    enabled: Boolean(userId),
  });
}

/** Maximum-tier only — RLS restricts this to users with role = 'maximum'. */
export function useAllReservations() {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: queryKeys.allReservations(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select(RESERVATION_WITH_DETAILS_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ReservationWithDetails[];
    },
  });
}

/** Paginated version of useMyReservations — a long personal history loads
 * a page at a time instead of the whole log. Same explicit user_id filter
 * as useMyReservations, for the same reason (RLS alone would let
 * maximum-tier users see everyone's reservations here too). */
export function useMyReservationsInfinite() {
  const supabase = useSupabaseClient();
  const { session } = useSession();
  const userId = session?.user.id;

  return useInfiniteQuery({
    queryKey: [...queryKeys.myReservations(), "infinite", userId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from("reservations")
        .select(RESERVATION_WITH_DETAILS_SELECT)
        .eq("user_id", userId as string)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + RESERVATIONS_PAGE_SIZE - 1);
      if (error) throw error;
      const reservations = (data ?? []) as unknown as ReservationWithDetails[];
      return {
        reservations,
        nextOffset:
          reservations.length === RESERVATIONS_PAGE_SIZE ? pageParam + RESERVATIONS_PAGE_SIZE : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: Boolean(userId),
  });
}

/** Paginated version of useAllReservations (the admin reservation log) —
 * maximum-tier only, RLS-enforced same as the non-paginated version. */
export function useAllReservationsInfinite() {
  const supabase = useSupabaseClient();

  return useInfiniteQuery({
    queryKey: [...queryKeys.allReservations(), "infinite"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from("reservations")
        .select(RESERVATION_WITH_DETAILS_SELECT)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + RESERVATIONS_PAGE_SIZE - 1);
      if (error) throw error;
      const reservations = (data ?? []) as unknown as ReservationWithDetails[];
      return {
        reservations,
        nextOffset:
          reservations.length === RESERVATIONS_PAGE_SIZE ? pageParam + RESERVATIONS_PAGE_SIZE : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });
}

export function useReserveItem() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      itemId: string;
      quantity: number;
      contactInfo: string;
    }) => {
      const { data, error } = await supabase.rpc("reserve_item", {
        p_item_id: input.itemId,
        p_quantity: input.quantity,
        p_contact_info: input.contactInfo,
      });
      if (error) throw error;
      return data as Reservation;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.item(variables.itemId) });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.myReservations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.allReservations() });
    },
  });
}

export function useCancelReservation() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const { data, error } = await supabase.rpc("cancel_reservation", {
        p_reservation_id: reservationId,
      });
      if (error) throw error;
      return data as Reservation;
    },
    onSuccess: (data) => {
      if (data.item_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.item(data.item_id) });
      }
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.myReservations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.allReservations() });
    },
  });
}
