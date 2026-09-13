import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ghella Materials",
    short_name: "Ghella Materials",
    description: "Warehouse materials tracking for the GAJV project",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F7FA",
    theme_color: "#14213D",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
