import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, spacing, typography } from "../lib/theme";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toIso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The OS's own date picker. A hand-rolled calendar broke twice here —
 * its 7-day grid misaligned in a narrow column, and after fixing that,
 * its popover ran off the right edge of the screen with no way to jump
 * years quickly. The native picker's layout is already correct on every
 * screen size and comes with year navigation built in, so it wins for
 * this specific field even though the rest of the app avoids default UI. */
export function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);
  const dateValue = value ? new Date(`${value}T00:00:00`) : new Date();

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShow(Platform.OS === "ios");
    if (event.type === "set" && selectedDate) {
      onChange(toIso(selectedDate));
    }
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => setShow(true)} style={styles.field}>
        <Text style={value ? styles.value : styles.placeholder} numberOfLines={1}>
          {value || "Any date"}
        </Text>
        <Calendar size={14} color={colors.textFaint} strokeWidth={2} />
      </Pressable>
      {value ? (
        <Pressable onPress={() => onChange("")} hitSlop={8} style={styles.clearButton}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}
      {show ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
  },
  value: { ...typography.body, fontSize: 13, color: colors.text, flexShrink: 1 },
  placeholder: { ...typography.body, fontSize: 13, color: colors.textFaint },
  clearButton: { marginTop: 4, alignSelf: "flex-start" },
  clearText: { fontSize: 11, fontFamily: fonts.bodySemiBold, color: colors.textMuted },
});
