"use client";

import {
  formatQuantity,
  getFriendlyErrorMessage,
  getItemPhotoUrl,
  reservationFormSchema,
  useItem,
  useLocations,
  useProfile,
  useReserveItem,
  useSupabaseClient,
} from "@ghella/shared";
import { ImageOff, Mail, PackageCheck, Tag, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "../../../../components/Badge";
import { Button } from "../../../../components/Button";
import { ErrorState } from "../../../../components/ErrorState";
import { LocationBreadcrumb } from "../../../../components/LocationBreadcrumb";
import { StackLoader } from "../../../../components/StackLoader";
import { useSuccessOverlay } from "../../../../components/SuccessOverlay";
import { TextAreaField, TextField } from "../../../../components/TextField";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const { profile } = useProfile();
  const itemQuery = useItem(id);
  const locationsQuery = useLocations();
  const reserveItem = useReserveItem();
  const showSuccess = useSuccessOverlay();

  const [activePhoto, setActivePhoto] = useState(0);
  const [quantity, setQuantity] = useState("1");
  const [contactInfo, setContactInfo] = useState("");
  const [contactInfoTouched, setContactInfoTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!contactInfoTouched && profile?.email) {
      setContactInfo(profile.email);
    }
  }, [contactInfoTouched, profile?.email]);

  if (itemQuery.isError) {
    return <ErrorState message={itemQuery.error?.message} onRetry={() => itemQuery.refetch()} />;
  }

  if (itemQuery.isLoading || !itemQuery.data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <StackLoader />
      </div>
    );
  }

  const item = itemQuery.data;
  const available = item.availability?.available_quantity ?? item.quantity;
  const photo = item.item_photos[activePhoto] ?? item.item_photos[0];

  const handleReserve = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const result = reservationFormSchema(available).safeParse({
      quantity,
      contact_info: contactInfo,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[String(issue.path[0])] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    reserveItem.mutate(
      { itemId: item.id, quantity: result.data.quantity, contactInfo: result.data.contact_info },
      {
        onSuccess: async () => {
          setQuantity("1");
          await showSuccess(`Reserved ${result.data.quantity} x ${item.name}`);
        },
        onError: (error) => setFormError(getFriendlyErrorMessage(error)),
      }
    );
  };

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-5 text-sm font-semibold text-text-muted hover:text-text"
      >
        ← Back to materials
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-sm border border-border bg-surface-alt">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getItemPhotoUrl(supabase, photo.storage_path)}
                alt={item.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-text-faint">
                <ImageOff size={32} strokeWidth={1.5} />
                <span className="text-sm">No photos yet</span>
              </div>
            )}
          </div>
          {item.item_photos.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {item.item_photos.map((p, index) => (
                <button
                  key={p.id}
                  onClick={() => setActivePhoto(index)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-sm border-2 ${
                    index === activePhoto ? "border-primary" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getItemPhotoUrl(supabase, p.storage_path)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <h1 className="min-w-0 font-display text-2xl font-black uppercase tracking-tight text-text">
              {item.name}
            </h1>
            <Badge
              label={`${formatQuantity(available, null, false)} of ${formatQuantity(item.quantity, item.unit, item.is_approximate)} available`}
              tone={available > 0 ? "success" : "danger"}
            />
          </div>

          <div className="mb-4 flex flex-col gap-1.5">
            {item.identification_number ? (
              <p className="flex items-center gap-2 text-sm text-text-muted">
                <Tag size={15} strokeWidth={2} /> ID: {item.identification_number}
              </p>
            ) : null}
            <LocationBreadcrumb
              locations={locationsQuery.data ?? []}
              locationId={item.location_id}
              onNavigate={(locationId) => router.push(`/browse?location=${locationId}`)}
              className="text-sm"
            />
            {item.condition ? (
              <p className="flex items-center gap-2 text-sm text-text-muted">
                <PackageCheck size={15} strokeWidth={2} /> Condition: {item.condition}
              </p>
            ) : null}
          </div>

          {item.notes ? <p className="mb-4 text-[15px] leading-relaxed text-text">{item.notes}</p> : null}

          {item.creator ? (
            <div className="mb-4 rounded-sm border border-border bg-surface-alt p-3">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-text-faint">
                Added by
              </p>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-text">
                <User size={14} className="shrink-0 text-text-faint" strokeWidth={2} />
                {item.creator.name}
              </p>
              <a
                href={`mailto:${item.creator.email}`}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Mail size={14} className="shrink-0 text-text-faint" strokeWidth={2} />
                {item.creator.email}
              </a>
            </div>
          ) : null}

          <div className="my-6 h-px bg-border" />

          {available > 0 ? (
            <form onSubmit={handleReserve}>
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-black uppercase tracking-tight text-text">
                <span className="h-4 w-1 shrink-0 bg-primary" aria-hidden />
                Reserve this material
              </h2>
              <TextField
                label="Quantity needed *"
                type="number"
                min={0.01}
                max={available}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                error={fieldErrors.quantity}
              />
              <TextAreaField
                label="Contact info (name, phone, email — anything that helps) *"
                rows={3}
                value={contactInfo}
                onChange={(e) => {
                  setContactInfoTouched(true);
                  setContactInfo(e.target.value);
                }}
                error={fieldErrors.contact_info}
              />
              {formError ? <p className="mb-4 text-sm font-semibold text-danger">{formError}</p> : null}
              <Button type="submit" loading={reserveItem.isPending}>
                Reserve
              </Button>
            </form>
          ) : (
            <p className="text-sm text-text-muted">None currently available to reserve.</p>
          )}
        </div>
      </div>
    </div>
  );
}
