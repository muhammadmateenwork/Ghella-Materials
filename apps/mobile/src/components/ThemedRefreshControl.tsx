import { RefreshControl, type RefreshControlProps } from "react-native";
import { colors } from "../lib/theme";

/** A pull-to-refresh spinner in the brand's amber rather than the OS
 * default grey/blue — drop into any FlatList/ScrollView's `refreshControl`. */
export function ThemedRefreshControl(props: Omit<RefreshControlProps, "tintColor" | "colors">) {
  return (
    <RefreshControl
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.surface}
      {...props}
    />
  );
}
