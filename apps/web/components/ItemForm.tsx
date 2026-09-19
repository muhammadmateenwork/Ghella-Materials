"use client";

import { ITEM_CONDITIONS, itemFormSchema, useLocations, type Item } from "@ghella/shared";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "./Button";
import { LocationTreePicker } from "./LocationTreePicker";
import { LABEL_CLASSES, TextAreaField, TextField } from "./TextField";

export function ItemForm({
  initialValues,
  reservedQuantity = 0,
  submitLabel,
  isSubmitting,
  onSubmit,
}: {
  initialValues?: Partial<
    Pick<
      Item,
      "name" | "identification_number" | "quantity" | "unit" | "is_approximate" | "condition" | "location_id" | "notes"
    >
  >;
  // Total currently actively reserved against this item — the quantity
  // field can't be saved below this (see itemFormSchema). 0 for a new item.
  reservedQuantity?: number;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: {
    name: string;
    identification_number: string;
    quantity: number;
    unit?: string;
    is_approximate?: boolean;
    condition?: string;
    location_id: string;
    notes?: string;
  }) => void;
}) {
  const locationsQuery = useLocations();
  const locations = locationsQuery.data ?? [];

  const [name, setName] = useState(initialValues?.name ?? "");
  const [idNumber, setIdNumber] = useState(initialValues?.identification_number ?? "");
  const [quantity, setQuantity] = useState(String(initialValues?.quantity ?? ""));
  const [unit, setUnit] = useState(initialValues?.unit ?? "");
  const [isApproximate, setIsApproximate] = useState(initialValues?.is_approximate ?? false);
  const [condition, setCondition] = useState(initialValues?.condition ?? "");
  const [locationId, setLocationId] = useState(initialValues?.location_id ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Items saved before this became a picker can carry a condition that
  // isn't one of the standard options — keep it selectable instead of
  // silently dropping it the moment someone reopens the form.
  const conditionOptions = useMemo(
    () => (condition && !(ITEM_CONDITIONS as readonly string[]).includes(condition) ? [...ITEM_CONDITIONS, condition] : ITEM_CONDITIONS),
    [condition]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const result = itemFormSchema(reservedQuantity).safeParse({
      name,
      identification_number: idNumber,
      quantity,
      unit,
      is_approximate: isApproximate,
      condition,
      location_id: locationId,
      notes,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[String(issue.path[0])] = issue.message;
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <TextField label="Material name *" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
      <TextField
        label="Identification number *"
        value={idNumber}
        onChange={(e) => setIdNumber(e.target.value)}
        error={fieldErrors.identification_number}
      />

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Quantity *"
          type="number"
          min={reservedQuantity}
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          error={fieldErrors.quantity}
        />
        <TextField
          label="Unit"
          placeholder="e.g. bundles, rolls, bags"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          error={fieldErrors.unit}
        />
      </div>
      {reservedQuantity > 0 ? (
        <p className="-mt-3 mb-4 text-xs text-text-muted">
          {reservedQuantity} already reserved — quantity can&apos;t go below that.
        </p>
      ) : null}

      <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-text">
        <input
          type="checkbox"
          checked={isApproximate}
          onChange={(e) => setIsApproximate(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        Quantity is approximate
        <span className="font-normal text-text-muted">
          (shows as &ldquo;{quantity || "10"}+{unit ? ` ${unit}` : ""}&rdquo; instead of an exact count)
        </span>
      </label>

      <div className="mb-4">
        <span className={LABEL_CLASSES}>Condition</span>
        <div className="flex flex-wrap gap-1.5">
          {conditionOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setCondition(condition === opt ? "" : opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                condition === opt
                  ? "border-primary bg-primary text-primary-text"
                  : "border-border bg-surface text-text-muted hover:bg-surface-alt"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {fieldErrors.condition ? <span className="mt-1 block text-xs font-semibold text-danger">{fieldErrors.condition}</span> : null}
      </div>
      <LocationTreePicker
        label="Location *"
        locations={locations}
        value={locationId}
        onChange={setLocationId}
        error={fieldErrors.location_id}
      />
      <TextAreaField
        label="Notes / contact details"
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        error={fieldErrors.notes}
      />

      {formError ? <p className="mb-4 text-sm font-semibold text-danger">{formError}</p> : null}

      <Button type="submit" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
