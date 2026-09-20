import { ITEM_CONDITIONS, itemFormSchema, useLocations, type Item } from "@ghella/shared";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "./Button";
import { LocationPickerField } from "./LocationPickerField";
import { TextField } from "./TextField";
import { colors, fonts, radius, spacing, typography } from "../lib/theme";

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
    condition: string;
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
  const [locationId, setLocationId] = useState<string | null>(initialValues?.location_id ?? null);
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

  const handleSubmit = () => {
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
      for (const issue of result.error.issues) {
        errors[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    onSubmit(result.data);
  };

  return (
    <View>
      <TextField label="Material name *" value={name} onChangeText={setName} error={fieldErrors.name} />
      <TextField
        label="Identification number *"
        value={idNumber}
        onChangeText={setIdNumber}
        error={fieldErrors.identification_number}
      />

      <View style={styles.row}>
        <View style={styles.rowField}>
          <TextField
            label="Quantity *"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            error={fieldErrors.quantity}
          />
        </View>
        <View style={styles.rowField}>
          <TextField
            label="Unit"
            value={unit}
            onChangeText={setUnit}
            placeholder="bundles, rolls..."
            error={fieldErrors.unit}
          />
        </View>
      </View>
      {reservedQuantity > 0 ? (
        <Text style={styles.reservedHint}>
          {reservedQuantity} already reserved — quantity can&apos;t go below that.
        </Text>
      ) : null}

      <View style={styles.approxRow}>
        <View style={styles.approxText}>
          <Text style={styles.approxLabel}>Quantity is approximate</Text>
          <Text style={styles.approxHint}>
            Shows as &ldquo;{quantity || "10"}+{unit ? ` ${unit}` : ""}&rdquo; instead of an exact count
          </Text>
        </View>
        <Switch
          value={isApproximate}
          onValueChange={setIsApproximate}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={isApproximate ? colors.primary : colors.surface}
        />
      </View>

      <View style={styles.conditionField}>
        <Text style={styles.conditionLabel}>Condition *</Text>
        <View style={styles.conditionRow}>
          {conditionOptions.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setCondition(opt)}
              style={[styles.conditionChip, condition === opt && styles.conditionChipSelected]}
            >
              <Text style={[styles.conditionChipText, condition === opt && styles.conditionChipTextSelected]}>{opt}</Text>
            </Pressable>
          ))}
        </View>
        {fieldErrors.condition ? <Text style={styles.conditionError}>{fieldErrors.condition}</Text> : null}
      </View>
      <LocationPickerField
        label="Location *"
        locations={locations}
        value={locationId}
        onChange={setLocationId}
        error={fieldErrors.location_id}
      />
      <TextField
        label="Notes / contact details"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        error={fieldErrors.notes}
      />

      {formError ? <Text style={styles.formError}>{formError}</Text> : null}

      <Button title={submitLabel} onPress={handleSubmit} loading={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  rowField: { flex: 1 },
  approxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  approxText: { flex: 1 },
  approxLabel: { ...typography.bodyStrong, fontSize: 14, color: colors.text },
  approxHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  reservedHint: { ...typography.caption, color: colors.textMuted, marginTop: -8, marginBottom: spacing.md },
  conditionField: { marginBottom: spacing.md },
  conditionLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  conditionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
  conditionChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  conditionChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  conditionChipText: { ...typography.captionStrong, color: colors.textMuted },
  conditionChipTextSelected: { color: colors.primaryText },
  conditionError: { color: colors.danger, fontSize: 12, fontFamily: fonts.bodySemiBold, marginTop: spacing.xs },
  formError: { color: colors.danger, marginBottom: spacing.md },
});
