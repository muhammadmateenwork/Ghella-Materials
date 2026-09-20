import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, spacing, typography } from "../lib/theme";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const CELL_SIZE = 32;

/** A custom month-grid calendar instead of the OS date picker — same
 * "no default UI" reasoning as the rest of the app's pickers. Renders
 * inline (not a separate Modal) since this is always used inside a modal
 * of its own (the export sheet), and nesting Modals on RN is best avoided. */
export function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const parsed = value ? new Date(`${value}T00:00:00`) : null;
  const [viewYear, setViewYear] = useState((parsed ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState((parsed ?? today).getMonth());

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => setOpen((o) => !o)} style={styles.field}>
        <Text style={value ? styles.value : styles.placeholder}>{value || "Any date"}</Text>
        <Calendar size={14} color={colors.textFaint} strokeWidth={2} />
      </Pressable>
      {open ? (
        <View style={styles.calendar}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={goPrevMonth} hitSlop={8} style={styles.navButton}>
              <ChevronLeft size={16} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable onPress={goNextMonth} hitSlop={8} style={styles.navButton}>
              <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.weekdayText}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={i} style={styles.cell} />;
              const iso = toIso(viewYear, viewMonth, day);
              const isSelected = iso === value;
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  style={[styles.cell, isSelected && styles.cellSelected]}
                >
                  <Text style={[styles.cellText, isSelected && styles.cellTextSelected]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>
          {value ? (
            <Pressable
              onPress={() => {
                onChange("");
                setOpen(false);
              }}
              style={styles.clearButton}
            >
              <X size={12} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surface,
  },
  value: { ...typography.body, fontSize: 14, color: colors.text },
  placeholder: { ...typography.body, fontSize: 14, color: colors.textFaint },
  calendar: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  navButton: { padding: 4 },
  monthLabel: { ...typography.captionStrong, fontSize: 12, color: colors.text },
  weekdayRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  weekdayText: {
    width: CELL_SIZE,
    textAlign: "center",
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    color: colors.textFaint,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  cellSelected: { backgroundColor: colors.primary },
  cellText: { fontSize: 12, fontFamily: fonts.body, color: colors.text },
  cellTextSelected: { color: colors.primaryText, fontFamily: fonts.bodyBold },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  clearText: { fontSize: 12, fontFamily: fonts.bodySemiBold, color: colors.textMuted },
});
