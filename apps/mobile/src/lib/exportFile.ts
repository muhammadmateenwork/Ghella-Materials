import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// React Native's Blob only supports being constructed from strings or other
// Blobs. write-excel-file's `.toBlob()` builds the workbook's zip bytes via
// `new Blob([uint8Array], { type })`, which throws "Creating blobs from
// 'ArrayBuffer' and 'ArrayBufferView' are not supported" on RN — confirmed
// live on an Android build. We can't change the library, so for just the
// moment it runs we swap in a minimal Blob-like stand-in that accepts
// binary parts, pull the raw bytes back out ourselves afterward, and
// restore the real Blob immediately — nothing else in the app ever sees
// the substitute.
class BytesBlob {
  bytes: Uint8Array;
  readonly type: string;
  readonly size: number;

  constructor(parts: Array<string | ArrayBuffer | ArrayBufferView | BytesBlob> = [], options: { type?: string } = {}) {
    const chunks = parts.map((part) => {
      if (typeof part === "string") return new TextEncoder().encode(part);
      if (part instanceof BytesBlob) return part.bytes;
      if (ArrayBuffer.isView(part)) return new Uint8Array(part.buffer, part.byteOffset, part.byteLength);
      return new Uint8Array(part);
    });
    const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const merged = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    this.bytes = merged;
    this.type = options.type ?? "";
    this.size = size;
  }
}

async function buildXlsxBytes(buildWorkbook: () => Promise<Blob>): Promise<Uint8Array> {
  const RealBlob = (globalThis as { Blob?: unknown }).Blob;
  (globalThis as { Blob?: unknown }).Blob = BytesBlob;
  try {
    const result = (await buildWorkbook()) as unknown;
    if (!(result instanceof BytesBlob)) {
      throw new Error("Couldn't build the Excel file on this device.");
    }
    return result.bytes;
  } finally {
    (globalThis as { Blob?: unknown }).Blob = RealBlob;
  }
}

/** Builds a workbook (via one of the shared xlsx builders) and shares it —
 * RN has no direct "download" concept, so sharing (to Files, email,
 * WhatsApp, etc.) is the equivalent of a browser's file download here.
 * Takes a builder function rather than an already-built Blob so the
 * Blob substitution above is in effect while the workbook is actually
 * assembled. */
export async function shareXlsx(filenamePrefix: string, buildWorkbook: () => Promise<Blob>) {
  const bytes = await buildXlsxBytes(buildWorkbook);
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
