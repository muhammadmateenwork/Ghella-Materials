import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

// Self-hosted (not next/font/google) — this machine's network has been
// unreliable, and a failed live font fetch used to crash the whole page
// with a raw error dump instead of just falling back to a system font.
const bigShoulders = localFont({
  variable: "--font-display",
  src: [
    { path: "./fonts/BigShouldersDisplay-Bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/BigShouldersDisplay-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "./fonts/BigShouldersDisplay-Black.ttf", weight: "900", style: "normal" },
  ],
});

const plexSans = localFont({
  variable: "--font-body",
  src: [
    { path: "./fonts/IBMPlexSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/IBMPlexSans-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/IBMPlexSans-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/IBMPlexSans-Bold.ttf", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Ghella Materials",
  description: "Warehouse materials tracking for the GAJV project",
};

export const viewport: Viewport = {
  themeColor: "#14213D",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${bigShoulders.variable} ${plexSans.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
