import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LocationFormInput } from "../schemas/item";
import { useSupabaseClient } from "../supabase/context";
import type { Location } from "../types/database";
import { queryKeys } from "./keys";

export function useLocations() {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: queryKeys.locations(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Location[];
    },
  });
}

export function useCreateLocation() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LocationFormInput) => {
      const { data, error } = await supabase
        .from("locations")
        .insert({
          name: input.name,
          parent_location_id: input.parent_location_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations() });
    },
  });
}

export function useUpdateLocation() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LocationFormInput & { id: string }) => {
      const { data, error } = await supabase
        .from("locations")
        .update({ name: input.name, parent_location_id: input.parent_location_id ?? null })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations() });
    },
  });
}

/**
 * Deleting a location cascades to its sub-locations at the DB level (the
 * caller should warn about that first using getDescendantLocationIds), but
 * is blocked outright if any item still references it — the FK there has
 * no ON DELETE behavior on purpose, so materials are never silently
 * orphaned or deleted as a side effect of tidying up locations.
 */
export function useDeleteLocation() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("locations").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") {
          throw new Error(
            "This location (or one of its sub-locations) still has materials assigned. Move or delete those materials first."
          );
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations() });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
