import { getLocationAncestors, type Location } from "@ghella/shared";
import { ChevronRight, MapPin } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../lib/theme";

export function LocationBreadcrumb({
  locations,
  locationId,
  onNavigate,
  textStyle,
}: {
  locations: Location[];
  locationId: string;
  onNavigate?: (locationId: string) => void;
  textStyle?: object;
}) {
  const ancestors = useMemo(() => getLocationAncestors(locations, locationId), [locations, locationId]);

  return (
    <View style={styles.row}>
      <MapPin size={12} color={colors.textMuted} strokeWidth={2} />
      {ancestors.map((loc, index) => (
        <View key={loc.id} style={styles.crumb}>
          {index > 0 ? <ChevronRight size={10} color={colors.textFaint} strokeWidth={2} /> : null}
          {onNavigate ? (
            <Pressable onPress={() => onNavigate(loc.id)} hitSlop={4}>
              <Text style={[styles.text, styles.link, textStyle]} numberOfLines={1}>
                {loc.name}
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.text, textStyle]} numberOfLines={1}>
              {loc.name}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 3 },
  crumb: { flexDirection: "row", alignItems: "center", gap: 3 },
  text: { ...typography.caption, color: colors.textMuted },
  link: { textDecorationLine: "underline" },
});
