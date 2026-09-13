"use client";

import {
  getFriendlyErrorMessage,
  getItemPhotoUrl,
  useDeleteItemPhoto,
  useSupabaseClient,
  useUploadItemPhoto,
  type ItemPhoto,
} from "@ghella/shared";
import { Loader2, Plus, X } from "lucide-react";
import { useRef } from "react";
import { useConfirm } from "./ConfirmDialog";
import { useToast } from "./Toast";

export function ItemPhotoManager({ itemId, photos }: { itemId: string; photos: ItemPhoto[] }) {
  const supabase = useSupabaseClient();
  const uploadPhoto = useUploadItemPhoto();
  const deletePhoto = useDeleteItemPhoto();
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmDialog = useConfirm();
  const showToast = useToast();

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const body = await file.arrayBuffer();
      const contentType = file.type || "image/jpeg";
      const fileExt = contentType.split("/")[1] ?? "jpg";
      uploadPhoto.mutate(
        { itemId, body, fileExt, contentType },
        { onError: (error) => showToast(`Upload failed: ${getFriendlyErrorMessage(error)}`, "error") }
      );
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (photo: ItemPhoto) => {
    const confirmed = await confirmDialog({
      title: "Remove this photo?",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!confirmed) return;
    deletePhoto.mutate(
      { id: photo.id, item_id: photo.item_id, storage_path: photo.storage_path },
      { onError: (error) => showToast(`Remove failed: ${getFriendlyErrorMessage(error)}`, "error") }
    );
  };

  return (
    <div className="mb-5">
      <p className="mb-2 text-sm font-bold text-text">Photos</p>
      <div className="flex flex-wrap gap-3">
        {photos.map((photo) => {
          const isDeleting = deletePhoto.isPending && deletePhoto.variables?.id === photo.id;
          return (
            <div key={photo.id} className="relative h-24 w-24 overflow-hidden rounded-sm border border-border bg-surface-alt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getItemPhotoUrl(supabase, photo.storage_path)}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => handleDelete(photo)}
                disabled={isDeleting}
                className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white disabled:opacity-70"
              >
                {isDeleting ? <Loader2 size={12} className="animate-spin" strokeWidth={2.5} /> : <X size={12} strokeWidth={2.5} />}
              </button>
            </div>
          );
        })}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploadPhoto.isPending}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed border-primary bg-primary-soft text-primary disabled:opacity-60"
        >
          <Plus size={18} strokeWidth={2.25} />
          <span className="text-xs font-bold">{uploadPhoto.isPending ? "Uploading…" : "Add"}</span>
        </button>
      </div>
      {/* No `capture` attribute — leaving this off lets mobile browsers show
          their native "Camera or Photo Library" choice; desktop just gets
          the normal file picker. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
