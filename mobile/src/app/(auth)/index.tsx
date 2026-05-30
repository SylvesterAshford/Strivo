import { useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/contexts/AuthContext";
import { env, isSupabaseConfigured } from "@/lib/env";
import { colors, spacing, radius, type } from "@/theme/tokens";
import { my } from "@/i18n/my";

const LOGO = require("../../../assets/strivo-logo.png");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, signInWithEmailPassword, signInAnonymously, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<null | "google" | "email">(null);
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
    setBusy("google");
    const { error } = await signInWithGoogle();
    setBusy(null);
    if (error) setError(error);
  };

  const onEmail = async () => {
    setError(null);
    if (!requireConfigured()) return;
    setBusy("email");
    const { error } = await signInWithEmailPassword(email.trim(), password);
    setBusy(null);
    if (error) setError(error);
  };

  const onForgotPassword = async () => {
    setError(null);
    if (email.trim().length === 0) {
      setError(my.auth.resetEmailNeeded);
      return;
    }
    if (!requireConfigured()) return;
    const { error } = await resetPassword(email);
    if (error) setError(error);
    else Alert.alert(my.auth.forgotPassword, my.auth.resetSent);
  };

  const onDevSkip = async () => {
    setBusy("email");
    const { error } = await signInAnonymously();
    setBusy(null);
    if (error) setError(error);
  };

  const emailDisabled = busy !== null || email.trim().length === 0 || password.length === 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.bg.base }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          paddingHorizontal: spacing.sectionX,
        }}
      >
        {/* Brand lockup — logo beside wordmark, tagline beneath */}
        <View style={styles.brand}>
          <View style={styles.brandRow}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <AppText style={styles.wordmark}>{my.auth.brand}</AppText>
          </View>
          <AppText variant="caption" color="secondary" style={{ textAlign: "center" }}>
            {my.auth.tagline}
          </AppText>
        </View>

        {/* Auth card */}
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Icon name="login" size={20} color={colors.accent.base} />
          </View>

          <AppText variant="subhead" style={{ textAlign: "center" }}>
            {my.auth.title}
          </AppText>
          <AppText
            variant="body"
            color="secondary"
            style={{ textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.lg }}
          >
            {my.auth.subtitle}
          </AppText>

          {/* Google */}
          <Pressable
            onPress={onGoogle}
            disabled={busy !== null}
            style={({ pressed }) => [
              styles.googleBtn,
              { opacity: busy !== null ? 0.6 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
            ]}
          >
            {busy === "google" ? (
              <ActivityIndicator color={colors.accent.base} />
            ) : (
              <>
                <Icon name="google" size={18} color={colors.text.primary} />
                <AppText variant="title" style={{ marginLeft: spacing.sm }}>
                  {my.auth.continueWithGoogle}
                </AppText>
              </>
            )}
          </Pressable>

          {/* OR divider */}
          <View style={styles.divider}>
            <View style={styles.line} />
            <AppText variant="monoEyebrow" color="tertiary" style={{ marginHorizontal: spacing.md }}>
              {my.auth.or}
            </AppText>
            <View style={styles.line} />
          </View>

          {/* Email */}
          <AppText variant="bodyMedium" style={styles.fieldLabel}>
            {my.auth.emailLabel}
          </AppText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={my.auth.emailPlaceholder}
            placeholderTextColor={colors.text.tertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            style={styles.input}
          />

          {/* Password */}
          <View style={styles.passwordLabelRow}>
            <AppText variant="bodyMedium" style={styles.fieldLabel}>
              {my.auth.passwordLabel}
            </AppText>
            <Pressable hitSlop={8} onPress={onForgotPassword} disabled={busy !== null}>
              <AppText variant="caption" color="accent">
                {my.auth.forgotPassword}
              </AppText>
            </Pressable>
          </View>
          <View style={styles.passwordWrap}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={my.auth.passwordPlaceholder}
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="password"
              style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0, marginBottom: 0 }]}
            />
            <Pressable
              onPress={() => setShowPassword((s) => !s)}
              hitSlop={8}
              accessibilityLabel={showPassword ? my.auth.hidePassword : my.auth.showPassword}
            >
              <Icon name={showPassword ? "eye-off" : "eye"} size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>

          <Button
            label={busy === "email" ? "..." : my.auth.signInWithEmail}
            onPress={onEmail}
            disabled={emailDisabled}
            style={{ marginTop: spacing.lg, opacity: emailDisabled ? 0.5 : 1 }}
          />

          {error ? (
            <AppText
              variant="caption"
              style={{ color: colors.semantic.critical, textAlign: "center", marginTop: spacing.md }}
            >
              {error}
            </AppText>
          ) : null}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <AppText variant="body" color="secondary">
            {my.auth.noAccount}{" "}
          </AppText>
          <Pressable onPress={onGoogle} hitSlop={6}>
            <AppText variant="bodyMedium" color="accent">
              {my.auth.signUp}
            </AppText>
          </Pressable>
        </View>

        {env.authBypass && (
          <Pressable onPress={() => void onDevSkip()} disabled={busy !== null} style={{ marginTop: spacing.md, alignItems: "center" }}>
            <AppText variant="caption" color="tertiary">
              DEV: Skip login
            </AppText>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    width: 48,
    height: 48,
  },
  wordmark: {
    fontFamily: type.subhead.fontFamily,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.5,
    color: colors.text.primary,
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.goalCard,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing["2xl"],
    shadowColor: colors.accent.glow,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  iconCircle: {
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent.soft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.attentionCard,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing["3xl"],
  },
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
  fieldLabel: {
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.attentionCard,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    fontFamily: type.body.fontFamily,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.attentionCard,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
});
