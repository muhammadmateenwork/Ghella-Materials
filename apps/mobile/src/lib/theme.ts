import { Platform } from "react-native";

// "Blueprint" — a construction-drawing visual language for a materials
// system built for Ghella Limited: deep blueprint-navy ink, a cool
// paper-white ground, and one construction-safety-orange accent — the same
// navy/orange pairing found on site signage, plant, and hi-vis gear, rather
// than a generic "professional SaaS" palette.
export const colors = {
  background: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceAlt: "#EAEEF3",
  border: "#D7DEE7",
  borderStrong: "#AEB9C9",

  text: "#14213D",
  textMuted: "#55617A",
  textFaint: "#8A93A8",

  ink: "#14213D",
  inkDark: "#0C1526",
  primary: "#E8590C",
  primaryDark: "#C24A08",
  primarySoft: "#FCE3D1",
  primaryText: "#14213D",

  accent: "#14213D",
  accentSoft: "#DCE1E9",

  success: "#1F7A4D",
  successSoft: "#DDF0E6",
  danger: "#C1272D",
  dangerSoft: "#FADBDA",
  warning: "#B8860B",
  warningSoft: "#F3E8C8",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

// Sharper, hairline-drawing shape language rather than soft "app" rounding.
export const radius = {
  sm: 3,
  md: 5,
  lg: 8,
  full: 999,
};

export const fonts = {
  display: "BigShouldersDisplay_800ExtraBold",
  displayBold: "BigShouldersDisplay_900Black",
  body: "IBMPlexSans_400Regular",
  bodyMedium: "IBMPlexSans_500Medium",
  bodySemiBold: "IBMPlexSans_600SemiBold",
  bodyBold: "IBMPlexSans_700Bold",
};

export const typography = {
  display: {
    fontSize: 28,
    fontFamily: fonts.displayBold,
    letterSpacing: -0.3,
    textTransform: "uppercase" as const,
  },
  title: {
    fontSize: 21,
    fontFamily: fonts.display,
    letterSpacing: -0.2,
    textTransform: "uppercase" as const,
  },
  subtitle: { fontSize: 16, fontFamily: fonts.bodySemiBold },
  body: { fontSize: 15, fontFamily: fonts.body },
  bodyStrong: { fontSize: 15, fontFamily: fonts.bodySemiBold },
  caption: { fontSize: 13, fontFamily: fonts.body },
  captionStrong: { fontSize: 13, fontFamily: fonts.bodyBold },
  label: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
  },
};

const platformShadow = (elevation: number, opacity: number, radiusPx: number, yOffset: number) =>
  Platform.select({
    web: {
      boxShadow: `0 ${yOffset}px ${radiusPx}px rgba(20, 33, 61, ${opacity})`,
    },
    default: {
      shadowColor: "#14213D",
      shadowOpacity: opacity,
      shadowRadius: radiusPx,
      shadowOffset: { width: 0, height: yOffset },
      elevation,
    },
  });

// Flatter than a typical "soft SaaS card" — closer to the crisp, minimal
// depth of linework on a technical drawing.
export const shadow = {
  xs: platformShadow(1, 0.05, 2, 1),
  sm: platformShadow(2, 0.07, 5, 2),
  md: platformShadow(3, 0.09, 10, 3),
  lg: platformShadow(6, 0.12, 20, 6),
};
