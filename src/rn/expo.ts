"use client";

// expo-document-picker / expo-file-system / expo-sharing → web equivalents.
//
// File picking uses a hidden <input type="file">. The returned `uri` is an
// object URL, so the API layer can recover the real blob with `fetch(uri)`.
// The export flow writes a "file" into an in-memory map then "shares" it, which
// on web triggers a normal browser download.

// ── DocumentPicker ────────────────────────────────────────────────────────────
export interface DocumentAsset {
  uri: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  file: File;
}
export interface DocumentResult {
  canceled: boolean;
  assets: DocumentAsset[] | null;
}

export const DocumentPicker = {
  getDocumentAsync(options?: {
    type?: string | string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
  }): Promise<DocumentResult> {
    return new Promise((resolve) => {
      if (typeof document === "undefined") {
        resolve({ canceled: true, assets: null });
        return;
      }
      const input = document.createElement("input");
      input.type = "file";
      const types = options?.type;
      if (types && types !== "*/*") {
        input.accept = Array.isArray(types) ? types.join(",") : types;
      }
      if (options?.multiple) input.multiple = true;
      input.style.display = "none";

      let settled = false;
      const finish = (result: DocumentResult) => {
        if (settled) return;
        settled = true;
        input.remove();
        resolve(result);
      };

      input.onchange = () => {
        const files = Array.from(input.files ?? []);
        if (!files.length) return finish({ canceled: true, assets: null });
        finish({
          canceled: false,
          assets: files.map((file) => ({
            uri: URL.createObjectURL(file),
            name: file.name,
            mimeType: file.type || null,
            size: file.size,
            file,
          })),
        });
      };
      // If the dialog is dismissed, browsers fire `cancel` (modern) — and as a
      // fallback we resolve canceled on window refocus with no selection.
      input.oncancel = () => finish({ canceled: true, assets: null });

      document.body.appendChild(input);
      input.click();
    });
  },
};

// ── FileSystem (legacy) ───────────────────────────────────────────────────────
const memFiles = new Map<string, string>();

export const FileSystem = {
  documentDirectory: "memfs://documents/",
  cacheDirectory: "memfs://cache/",
  EncodingType: { UTF8: "utf8", Base64: "base64" } as const,
  async writeAsStringAsync(path: string, contents: string, _options?: { encoding?: string }): Promise<void> {
    memFiles.set(path, contents);
  },
  async readAsStringAsync(path: string): Promise<string> {
    return memFiles.get(path) ?? "";
  },
  async deleteAsync(path: string): Promise<void> {
    memFiles.delete(path);
  },
};

// ── Sharing → browser download ────────────────────────────────────────────────
function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "download";
}

export const Sharing = {
  async isAvailableAsync(): Promise<boolean> {
    return typeof document !== "undefined";
  },
  async shareAsync(
    path: string,
    options?: { mimeType?: string; dialogTitle?: string; UTI?: string },
  ): Promise<void> {
    if (typeof document === "undefined") return;
    const contents = memFiles.get(path) ?? "";
    const blob = new Blob([contents], { type: options?.mimeType ?? "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = basename(path);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
