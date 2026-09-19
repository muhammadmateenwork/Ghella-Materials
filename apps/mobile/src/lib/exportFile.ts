import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// React Native's Blob doesn't implement the standard `blob.arrayBuffer()` —
// FileReader is the RN-supported way to pull bytes back out of a Blob (it
// round-trips through the native BlobModule that backs both).
function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read the exported file."));
    reader.onloadend = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error("Failed to read the exported file."));
      }
    };
    reader.readAsArrayBuffer(blob);
  });
}

/** Writes a workbook Blob to a temp file and opens the native share sheet —
 * RN has no direct "download" concept, so sharing (to Files, email,
 * WhatsApp, etc.) is the equivalent of a browser's file download here. */
export async function shareXlsx(filenamePrefix: string, workbook: Blob) {
  const bytes = await blobToUint8Array(workbook);
  const filename = `${filenamePrefix}-${Date.now()}.xlsx`;
  const file = new File(Paths.cache, filename);
  file.create();
  file.write(bytes);

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing isn't available on this device.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Export Excel",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
}
