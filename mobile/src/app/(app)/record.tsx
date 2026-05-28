import { useEffect, useRef, useState, useCallback } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { colors, spacing } from "@/theme/tokens";
import { my } from "@/i18n/my";
import { uploadVoice } from "@/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAX_SECS = 90;

type Phase = "idle" | "recording" | "uploading" | "error";

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function RecordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const stopAndUpload = useCallback(async () => {
    setPhase("uploading");
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error("No recording URI");

      const durationSecs = Math.round((recorderState.durationMillis ?? 0) / 1000);
      const result = await uploadVoice(uri, "audio/mp4", durationSecs);

      router.replace({
        pathname: "/confirm-facts",
        params: {
          recordingId: result.recordingId,
          transcript: result.transcript,
          facts: JSON.stringify(result.facts),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    }
  }, [audioRecorder, recorderState.durationMillis, router]);

  const startRecording = async () => {
    setError(null);
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        setError("Microphone permission denied");
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setPhase("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start recording");
    }
  };

  // Auto-stop at MAX_SECS
  useEffect(() => {
    if (phase === "recording" && (recorderState.durationMillis ?? 0) >= MAX_SECS * 1000) {
      void stopAndUpload();
    }
  }, [phase, recorderState.durationMillis, stopAndUpload]);

  const handleMicPress = () => {
    if (phase === "idle" || phase === "error") {
      void startRecording();
    } else if (phase === "recording") {
      void stopAndUpload();
    }
  };

  const isRecording = phase === "recording";
  const isUploading = phase === "uploading";
  const elapsedMs = recorderState.durationMillis ?? 0;
  const remainingSecs = Math.max(0, MAX_SECS - Math.floor(elapsedMs / 1000));

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing["3xl"] },
      ]}
    >
      {/* Close */}
      <Pressable
        onPress={() => {
          if (isRecording) void stopAndUpload();
          else router.back();
        }}
        hitSlop={12}
        style={styles.closeBtn}
      >
        <Icon name="x" size={22} color={colors.text.onDark} />
      </Pressable>

      {/* Title */}
      <AppText
        variant="subhead"
        color="onDark"
        style={{ textAlign: "center", marginBottom: spacing["5xl"] }}
      >
        {my.record.title}
      </AppText>

      {/* Timer / uploading indicator */}
      <View style={styles.timerArea}>
        {isUploading ? (
          <>
            <ActivityIndicator color={colors.text.onDark} size="large" />
            <AppText variant="body" color="onDark" style={{ marginTop: spacing.md }}>
              {"ပြုလုပ်နေသည်..."}
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="serifDisplay" color="onDark" style={{ letterSpacing: 2 }}>
              {isRecording ? formatTime(elapsedMs) : "00:00"}
            </AppText>
            {isRecording && (
              <AppText variant="caption" color="onDark" style={{ marginTop: spacing.sm, opacity: 0.7 }}>
                {`${String(Math.floor(remainingSecs / 60)).padStart(2, "0")}:${String(remainingSecs % 60).padStart(2, "0")} ကျန်သည်`}
              </AppText>
            )}
          </>
        )}
      </View>

      {/* Error */}
      {phase === "error" && error && (
        <AppText variant="body" color="onDark" style={styles.errorText}>
          {error}
        </AppText>
      )}

      {/* Mic / stop button */}
      <Pressable
        onPress={handleMicPress}
        disabled={isUploading}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
        style={({ pressed }) => [
          styles.micBtn,
          isRecording && styles.micBtnActive,
          { transform: [{ scale: pressed ? 0.94 : 1 }], opacity: isUploading ? 0.4 : 1 },
        ]}
      >
        <Icon
          name={isRecording ? "square" : "mic"}
          size={36}
          color={isRecording ? colors.semantic.critical : colors.text.onDark}
        />
      </Pressable>

      {isRecording && (
        <AppText variant="caption" color="onDark" style={{ marginTop: spacing.xl, opacity: 0.7 }}>
          {my.record.listening}
        </AppText>
      )}

      {/* Type instead link */}
      {!isRecording && !isUploading && (
        <Pressable onPress={() => router.push("/manual-entry")} style={styles.typeLink}>
          <AppText variant="body" color="onDark" style={{ opacity: 0.6 }}>
            {my.record.typeInstead}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.text.primary,
    alignItems: "center",
    paddingHorizontal: spacing["3xl"],
  },
  closeBtn: {
    alignSelf: "flex-end",
    marginBottom: spacing["3xl"],
  },
  timerArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent.base,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent.glow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  micBtnActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 2,
    borderColor: colors.semantic.critical,
  },
  errorText: {
    textAlign: "center",
    marginBottom: spacing["3xl"],
    opacity: 0.8,
  },
  typeLink: {
    marginTop: spacing["3xl"],
    paddingVertical: spacing.sm,
  },
});
