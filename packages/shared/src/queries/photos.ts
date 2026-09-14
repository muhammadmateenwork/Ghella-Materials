import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "../supabase/context";
import type { GhellaSupabaseClient } from "../supabase/client";
import type { ItemPhoto } from "../types/database";
import { queryKeys } from "./keys";

const PHOTOS_BUCKET = "item-photos";

// Browsers expose a global `crypto.randomUUID`, but React Native's Hermes
// engine doesn't — this package is shared by both, so it can't assume the
// browser global exists. Fall back to a Math.random()-based v4 UUID, which
// is plenty for a storage-path suffix (it only needs to avoid collisions,
// not resist an attacker).
function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getItemPhotoUrl(supabase: GhellaSupabaseClient, storagePath: string): string {
  return supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

/**
 * Uploads a photo for an item. Callers are responsible for producing a
 * platform-appropriate body (Blob on web, ArrayBuffer from
 * expo-file-system on React Native) since that conversion is platform-specific.
 */
export function useUploadItemPhoto() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      itemId: string;
      body: ArrayBuffer | Blob;
      fileExt: string;
      contentType: string;
    }) => {
      const path = `${input.itemId}/${generateUuid()}.${input.fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .upload(path, input.body, { contentType: input.contentType });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("item_photos")
        .insert({ item_id: input.itemId, storage_path: path })
        .select()
        .single();
      if (error) throw error;
      return data as ItemPhoto;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.item(variables.itemId) });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDeleteItemPhoto() {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photo: Pick<ItemPhoto, "id" | "item_id" | "storage_path">) => {
      const { error: storageError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .remove([photo.storage_path]);
      if (storageError) throw storageError;

      const { error } = await supabase.from("item_photos").delete().eq("id", photo.id);
      if (error) throw error;
      return photo;
    },
    onSuccess: (photo) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.item(photo.item_id) });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
