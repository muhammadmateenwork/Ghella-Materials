export function downloadCsv(filename: string, content: string) {
  // A leading BOM makes Excel (Windows in particular) detect the file as
  // UTF-8 instead of guessing a local codepage and mangling any non-ASCII
  // character (names, notes, etc.).
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
