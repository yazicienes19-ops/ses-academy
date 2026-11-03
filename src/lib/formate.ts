/** Abgabeformate für Hausaufgaben (spiegelt assignments.allowed_formats und den Bucket „abgaben“). */
export const abgabeFormate = [
  { wert: "pdf", name: "PDF" },
  { wert: "docx", name: "Word (DOCX)" },
  { wert: "text", name: "Text" },
  { wert: "link", name: "Link (z. B. Video)" },
] as const;
export type AbgabeFormat = (typeof abgabeFormate)[number]["wert"];

export const dateiMime: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export const MAX_ABGABE_MB = 20;
export const MAX_MATERIAL_MB = 50;

export const endung = (name: string) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";

export const groesse = (bytes: number | null | undefined) =>
  bytes == null ? "" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
