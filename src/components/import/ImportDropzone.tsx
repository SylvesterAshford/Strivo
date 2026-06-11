"use client";

import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { View, ActivityIndicator } from "@/rn";
import { AppText } from "@/components/ui/AppText";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

// Premium upload affordance shared by every import screen. Replaces the bare
// stacked-buttons pattern: a contained card with a dashed drop target that
// shows WHERE the file goes and what's accepted before the user commits.
// Click anywhere or drag a file onto it; both paths emit the same callback.
//
// Raw <div>/<input> is intentional — the @/rn layer renders DOM anyway and
// drag events + hidden file inputs are web-native concerns (same pattern as
// Screen.tsx).
export function ImportDropzone({
  onFile,
  accept = ".xlsx,.xls",
  hint = my.imports.dropHint,
  busy = false,
  busyLabel,
}: {
  /** Called with an object URL + file metadata, matching DocumentPicker's shape. */
  onFile: (file: { uri: string; name: string; mimeType: string }) => void;
  accept?: string;
  hint?: string;
  busy?: boolean;
  busyLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const emit = (file: File) => {
    onFile({
      uri: URL.createObjectURL(file),
      name: file.name,
      mimeType: file.type || "application/octet-stream",
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) emit(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={my.imports.dropTitle}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !busy) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      style={{
        cursor: busy ? "default" : "pointer",
        borderRadius: radius.attentionCard,
        border: `1.5px dashed ${dragOver ? colors.accent.base : colors.border.default}`,
        backgroundColor: dragOver ? colors.bg.elevated : colors.bg.surface,
        padding: `${spacing["3xl"]}px ${spacing["2xl"]}px`,
        transition: "border-color 120ms ease, background-color 120ms ease",
        outline: "none",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) emit(file);
          e.target.value = "";
        }}
      />
      <View style={{ alignItems: "center", gap: spacing.sm }}>
        {busy ? (
          <>
            <ActivityIndicator color={colors.accent.base} />
            <AppText variant="bodyMedium" color="primary">
              {busyLabel ?? my.imports.dropBusy}
            </AppText>
            <AppText variant="caption" color="tertiary">
              {my.imports.dropBusyHint}
            </AppText>
          </>
        ) : (
          <>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.bg.elevated,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing.xs,
              }}
            >
              <UploadCloud size={22} color={colors.accent.base} strokeWidth={1.75} />
            </View>
            <AppText variant="bodyMedium" color="primary">
              {my.imports.dropTitle}
            </AppText>
            <AppText variant="caption" color="secondary">
              {my.imports.dropOr}
            </AppText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: spacing.sm,
                paddingVertical: 4,
                paddingHorizontal: spacing.md,
                borderRadius: 999,
                backgroundColor: colors.bg.elevated,
              }}
            >
              <FileSpreadsheet size={13} color={colors.text.secondary} strokeWidth={1.75} />
              <AppText variant="caption" color="secondary">
                {hint}
              </AppText>
            </View>
          </>
        )}
      </View>
    </div>
  );
}
