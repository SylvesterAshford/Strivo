import { useState } from "react";
import { View, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { env, isSupabaseConfigured } from "@/lib/env";
import { colors, spacing, radius } from "@/theme/tokens";
import { my } from "@/i18n/my";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, signInWithEmailPassword, signInAnonymously } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requireConfigured = () => {
    if (!isSupabaseConfigured()) {
      setError("Supabase not configured — add creds to mobile/.env");
      return false;
    }
    return true;
  };

  const onGoogle = async () => {
    setError(null);
    if (!requireConfigured()) return;
    setBusy(true);
    const { error } = await signInWithGoogle();
    setBusy(false);
    if (error) setError(error);
  };

  const onEmail = async () => {
    setError(null);
    if (!requireConfigured()) return;
    setBusy(true);
    const { error } = await signInWithEmailPassword(email.trim(), password);
    setBusy(false);
    if (error) setError(error);
  };

  const onDevSkip = async () => {
    setBusy(true);
    const { error } = await signInAnonymously();
    setBusy(false);
    if (error) setError(error);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.bg.base }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing["4xl"],
          paddingBottom: insets.bottom + spacing["3xl"],
          paddingHorizontal: spacing.sectionX,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: spacing.sm, marginBottom: spacing["2xl"] }}>
          <AppText variant="subhead">{my.auth.title}</AppText>
          <AppText variant="body" color="secondary">
            {my.auth.subtitle}
          </AppText>
        </View>

        <Button label={my.auth.continueWithGoogle} onPress={onGoogle} disabled={busy} />

        <View style={styles.divider}>
          <View style={styles.line} />
          <AppText variant="caption" color="tertiary" style={{ marginHorizontal: spacing.md }}>
            {my.auth.or}
          </AppText>
          <View style={styles.line} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="caption" color="secondary">
            {my.auth.emailLabel}
          </AppText>
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder={my.auth.emailPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
          />
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="caption" color="secondary">
            {my.auth.passwordLabel}
          </AppText>
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder={my.auth.passwordPlaceholder}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
          />
        </View>

        <Button
          label={busy ? "..." : my.auth.signInWithEmail}
          variant="secondary"
          onPress={onEmail}
          disabled={busy || email.trim().length === 0 || password.length === 0}
        />

        {error ? (
          <AppText variant="caption" style={{ color: colors.semantic.critical, textAlign: "center" }}>
            {error}
          </AppText>
        ) : null}

        {env.authBypass && (
          <Pressable onPress={() => void onDevSkip()} disabled={busy} style={{ marginTop: spacing.lg, alignItems: "center" }}>
            <AppText variant="caption" color="tertiary">
              DEV: Skip login
            </AppText>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.default,
  },
});
