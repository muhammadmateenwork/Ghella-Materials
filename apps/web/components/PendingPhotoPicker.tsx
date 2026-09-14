"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

/**
 * Lets a user stage photos before the record they belong to exists yet
 * (e.g. while creating a new item). Nothing is uploaded until the caller
 * does so explicitly, once it has a real item id to attach them to.
 */
export function PendingPhotoPicker({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    onChange([...files, ...Array.from(fileList)]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mb-5">
      <p className="mb-2 text-sm font-bold text-text">Photos</p>
      <div className="flex flex-wrap gap-3">
        {files.map((file, index) => (
          <div key={`${file.name}-${index}`} className="relative h-24 w-24 overflow-hidden rounded-sm border border-border bg-surface-alt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrls[index]} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => onChange(files.filter((_, i) => i !== index))}
              className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed border-primary bg-primary-soft text-primary"
        >
          <Plus size={18} strokeWidth={2.25} />
          <span className="text-xs font-bold">Add</span>
        </button>
      </div>
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
