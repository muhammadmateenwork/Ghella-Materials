import { itemFormSchema, useLocations, type Item } from "@ghella/shared";
import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "./Button";
import { LocationPickerField } from "./LocationPickerField";
import { TextField } from "./TextField";
import { colors, spacing, typography } from "../lib/theme";

export function ItemForm({
  initialValues,
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
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: {
    name: string;
    identification_number?: string;
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
  const [locationId, setLocationId] = useState<string | null>(initialValues?.location_id ?? null);
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = () => {
    setFormError(null);
    const result = itemFormSchema.safeParse({
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
        label="Identification number"
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

      <TextField
        label="Condition"
        value={condition}
        onChangeText={setCondition}
        placeholder="e.g. Good, Used, Damaged"
        error={fieldErrors.condition}
      />
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
  formError: { color: colors.danger, marginBottom: spacing.md },
});
