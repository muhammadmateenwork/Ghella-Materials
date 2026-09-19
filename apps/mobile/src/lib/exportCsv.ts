import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/** Writes CSV text to a temp file and opens the native share sheet — RN has
 * no direct "download" concept, so sharing (to Files, email, WhatsApp,
 * etc.) is the equivalent of a browser's file download here. */
export async function shareCsv(filenamePrefix: string, content: string) {
  const filename = `${filenamePrefix}-${Date.now()}.csv`;
  const file = new File(Paths.cache, filename);
  file.create();
  file.write(content);

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing isn't available on this device.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: "Export CSV",
    UTI: "public.comma-separated-values-text",
  });
}
