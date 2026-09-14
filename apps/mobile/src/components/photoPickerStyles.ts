import { StyleSheet } from "react-native";
import { colors, fonts, radius, shadow, spacing } from "../lib/theme";

export const PHOTO_SIZE = 96;

export const photoPickerStyles = StyleSheet.create({
  label: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.text, marginBottom: spacing.sm },
  row: { marginBottom: spacing.md },
  photoWrap: { marginRight: spacing.sm },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    ...shadow.xs,
  },
  removeBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(15,23,42,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhoto: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    gap: 4,
  },
  addPhotoIcons: { flexDirection: "row", gap: 4 },
  addPhotoText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 12 },
});
