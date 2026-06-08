"use client";

// Minimal React Native → DOM compatibility layer.
//
// The Strivo product was originally an Expo / React Native app. To turn it into
// a genuine responsive web app (Next.js + React DOM — NOT react-native-web) we
// render real <div>/<span>/<input> elements but keep the React Native component
// API (View, Text, Pressable, StyleSheet, LinearGradient, …). This lets the
// screens and design system port over almost verbatim while shipping plain web.
//
// `resolveStyle` converts RN style objects (numbers = px, paddingVertical,
// transform arrays, named font families, …) into React.CSSProperties.

import {
  forwardRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

// ── Font family mapping ───────────────────────────────────────────────────────
// Token family names → CSS stacks (next/font variables wired in layout.tsx).
// Every stack ends in the Myanmar fallback so Burmese renders without tofu.
const MYANMAR = "var(--font-myanmar), sans-serif";
const FONT_FAMILY_MAP: Record<string, string> = {
  Inter: `var(--font-inter), ${MYANMAR}`,
  "Inter-Medium": `var(--font-inter), ${MYANMAR}`,
  InstrumentSerif: `var(--font-serif), Georgia, ${MYANMAR}`,
  "InstrumentSerif-Italic": `var(--font-serif), Georgia, ${MYANMAR}`,
  JetBrainsMono: `var(--font-mono), ${MYANMAR}`,
  SpaceGrotesk: `var(--font-grotesk), var(--font-inter), ${MYANMAR}`,
  NotoSansMyanmar: MYANMAR,
  "NotoSansMyanmar-Medium": MYANMAR,
};

type AnyStyle = Record<string, unknown>;
export type RNStyle =
  | AnyStyle
  | false
  | null
  | undefined
  | ReadonlyArray<RNStyle>;

function transformToCss(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return undefined;
  const parts: string[] = [];
  for (const op of value) {
    if (!op || typeof op !== "object") continue;
    for (const [k, v] of Object.entries(op as AnyStyle)) {
      if (k === "scale") parts.push(`scale(${v})`);
      else if (k === "scaleX") parts.push(`scaleX(${v})`);
      else if (k === "scaleY") parts.push(`scaleY(${v})`);
      else if (k === "translateX") parts.push(`translateX(${typeof v === "number" ? `${v}px` : v})`);
      else if (k === "translateY") parts.push(`translateY(${typeof v === "number" ? `${v}px` : v})`);
      else if (k === "rotate") parts.push(`rotate(${v})`);
      else if (k === "rotateZ") parts.push(`rotate(${v})`);
    }
  }
  return parts.length ? parts.join(" ") : undefined;
}

/** Flatten + convert one or more RN style objects to a single CSSProperties. */
export function resolveStyle(style: RNStyle): CSSProperties {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce<CSSProperties>((acc, s) => ({ ...acc, ...resolveStyle(s) }), {});
  }
  const out: AnyStyle = {};
  for (const [key, raw] of Object.entries(style as AnyStyle)) {
    if (raw === undefined || raw === null) continue;
    switch (key) {
      case "paddingVertical":
        out.paddingTop = raw;
        out.paddingBottom = raw;
        break;
      case "paddingHorizontal":
        out.paddingLeft = raw;
        out.paddingRight = raw;
        break;
      case "marginVertical":
        out.marginTop = raw;
        out.marginBottom = raw;
        break;
      case "marginHorizontal":
        out.marginLeft = raw;
        out.marginRight = raw;
        break;
      case "transform":
        out.transform = transformToCss(raw);
        break;
      case "lineHeight":
        // RN line-height is in px; React DOM treats a numeric lineHeight as a
        // unitless multiplier (lineHeight × font-size). Emit px for the token
        // values (always > 3) and keep small numbers (≤ 3) as CSS multipliers.
        out.lineHeight = typeof raw === "number" && raw > 3 ? `${raw}px` : raw;
        break;
      case "fontFamily": {
        const fam = String(raw);
        out.fontFamily = FONT_FAMILY_MAP[fam] ?? fam;
        if (fam.endsWith("-Medium")) out.fontWeight = out.fontWeight ?? 500;
        if (fam.endsWith("-Italic")) out.fontStyle = out.fontStyle ?? "italic";
        break;
      }
      // RN shadow props → box-shadow (used sparingly: dock + mic glow).
      case "shadowColor":
      case "shadowOffset":
      case "shadowOpacity":
      case "shadowRadius":
      case "elevation":
        break; // handled via explicit boxShadow in components that need it
      // RN-only no-ops on web.
      case "includeFontPadding":
      case "textAlignVertical":
      case "tintColor":
        break;
      default:
        out[key] = raw;
    }
  }
  return out as CSSProperties;
}

// ── View ──────────────────────────────────────────────────────────────────────
// RN View defaults to a column flexbox; emulate that so layouts port directly.
const VIEW_BASE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  flexShrink: 0,
  position: "relative",
  boxSizing: "border-box",
  minHeight: 0,
  minWidth: 0,
};

export interface ViewProps {
  style?: RNStyle;
  children?: ReactNode;
  pointerEvents?: "auto" | "none" | "box-none" | "box-only";
  // RN accessibility props (ignored on web but accepted for parity).
  accessibilityRole?: string;
  accessibilityState?: Record<string, unknown>;
  accessibilityLabel?: string;
  testID?: string;
  onLayout?: (e: unknown) => void;
  id?: string;
  // Web-only escape hatch: attach a CSS class (responsive grids, media queries).
  className?: string;
}

export const View = forwardRef(function View(
  { style, children, pointerEvents, accessibilityRole, accessibilityLabel, id, className }: ViewProps,
  ref: Ref<HTMLDivElement>,
) {
  // When a className supplies layout (e.g. .card-grid), don't force the flex
  // column base — let the class own `display`.
  const css = className ? resolveStyle(style) : { ...VIEW_BASE, ...resolveStyle(style) };
  if (pointerEvents === "none") css.pointerEvents = "none";
  return (
    <div ref={ref} id={id} className={className} role={accessibilityRole} aria-label={accessibilityLabel} style={css}>
      {children}
    </div>
  );
});

export const SafeAreaView = View;
export const KeyboardAvoidingView = function KeyboardAvoidingView({
  children,
  style,
}: ViewProps & { behavior?: string; keyboardVerticalOffset?: number }) {
  return <View style={style}>{children}</View>;
};

// ── Text ────────────────────────────────────────────────────────────────────
export interface TextProps {
  style?: RNStyle;
  children?: ReactNode;
  numberOfLines?: number;
  onPress?: () => void;
  accessibilityRole?: string;
  selectable?: boolean;
}

export const Text = forwardRef(function Text(
  { style, children, numberOfLines, onPress }: TextProps,
  ref: Ref<HTMLSpanElement>,
) {
  const css: CSSProperties = { margin: 0, padding: 0, ...resolveStyle(style) };
  if (numberOfLines && numberOfLines > 1) {
    css.display = "-webkit-box";
    (css as AnyStyle).WebkitLineClamp = numberOfLines;
    (css as AnyStyle).WebkitBoxOrient = "vertical";
    css.overflow = "hidden";
  } else if (numberOfLines === 1) {
    css.whiteSpace = "nowrap";
    css.overflow = "hidden";
    css.textOverflow = "ellipsis";
  }
  if (onPress) css.cursor = "pointer";
  return (
    <span ref={ref} style={css} onClick={onPress}>
      {children}
    </span>
  );
});

// ── Pressable / TouchableOpacity ──────────────────────────────────────────────
type PressableStyle = RNStyle | ((state: { pressed: boolean }) => RNStyle);

export interface PressableProps {
  style?: PressableStyle;
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  accessibilityRole?: string;
  accessibilityLabel?: string;
  accessibilityState?: Record<string, unknown>;
  hitSlop?: number | object;
  className?: string;
}

function usePressed() {
  const [pressed, setPressed] = useState(false);
  const handlers = {
    onMouseDown: () => setPressed(true),
    onMouseUp: () => setPressed(false),
    onMouseLeave: () => setPressed(false),
    onTouchStart: () => setPressed(true),
    onTouchEnd: () => setPressed(false),
  };
  return { pressed, handlers };
}

export function Pressable({
  style,
  children,
  onPress,
  onLongPress,
  disabled,
  accessibilityRole,
  accessibilityLabel,
  className,
}: PressableProps) {
  const { pressed, handlers } = usePressed();
  const resolved = typeof style === "function" ? style({ pressed }) : style;
  const css: CSSProperties = {
    ...VIEW_BASE,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    ...resolveStyle(resolved),
  } as CSSProperties;
  return (
    <div
      role={accessibilityRole ?? "button"}
      aria-label={accessibilityLabel}
      aria-disabled={disabled}
      tabIndex={disabled ? undefined : 0}
      className={className}
      style={css}
      onClick={disabled ? undefined : onPress}
      onKeyDown={
        disabled || !onPress
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPress();
              }
            }
      }
      onContextMenu={onLongPress ? (e) => { e.preventDefault(); onLongPress(); } : undefined}
      {...handlers}
    >
      {typeof children === "function" ? children({ pressed }) : children}
    </div>
  );
}

export function TouchableOpacity({
  style,
  children,
  onPress,
  disabled,
  activeOpacity = 0.6,
  accessibilityRole,
  accessibilityLabel,
}: Omit<PressableProps, "style" | "children"> & {
  style?: RNStyle;
  children?: ReactNode;
  activeOpacity?: number;
}) {
  const { pressed, handlers } = usePressed();
  const css: CSSProperties = {
    ...VIEW_BASE,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : pressed ? activeOpacity : 1,
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    transition: "opacity 0.1s",
    ...resolveStyle(style),
  } as CSSProperties;
  return (
    <div
      role={accessibilityRole ?? "button"}
      aria-label={accessibilityLabel}
      style={css}
      onClick={disabled ? undefined : onPress}
      {...handlers}
    >
      {children}
    </div>
  );
}

// ── ScrollView ────────────────────────────────────────────────────────────────
export interface ScrollViewProps {
  style?: RNStyle;
  contentContainerStyle?: RNStyle;
  children?: ReactNode;
  horizontal?: boolean;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  keyboardShouldPersistTaps?: string;
  stickyHeaderIndices?: number[];
}

export const ScrollView = forwardRef(function ScrollView(
  { style, contentContainerStyle, children, horizontal, showsVerticalScrollIndicator, showsHorizontalScrollIndicator }: ScrollViewProps,
  ref: Ref<HTMLDivElement>,
) {
  const outer: CSSProperties = {
    ...VIEW_BASE,
    overflowX: horizontal ? "auto" : "hidden",
    overflowY: horizontal ? "hidden" : "auto",
    WebkitOverflowScrolling: "touch",
    ...resolveStyle(style),
  } as CSSProperties;
  if (showsVerticalScrollIndicator === false || showsHorizontalScrollIndicator === false) {
    (outer as AnyStyle).scrollbarWidth = "none";
  }
  const inner: CSSProperties = {
    display: "flex",
    flexDirection: horizontal ? "row" : "column",
    boxSizing: "border-box",
    ...(horizontal ? {} : { minHeight: "min-content" }),
    ...resolveStyle(contentContainerStyle),
  };
  return (
    <div ref={ref} style={outer}>
      <div style={inner}>{children}</div>
    </div>
  );
});

export const FlatList = function FlatList<T>({
  data,
  renderItem,
  keyExtractor,
  style,
  contentContainerStyle,
  horizontal,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
}: {
  data: ReadonlyArray<T> | null | undefined;
  renderItem: (info: { item: T; index: number }) => ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  style?: RNStyle;
  contentContainerStyle?: RNStyle;
  horizontal?: boolean;
  ListEmptyComponent?: ReactNode;
  ListHeaderComponent?: ReactNode;
  ListFooterComponent?: ReactNode;
}) {
  const items = data ?? [];
  return (
    <ScrollView style={style} contentContainerStyle={contentContainerStyle} horizontal={horizontal}>
      {ListHeaderComponent}
      {items.length === 0
        ? ListEmptyComponent
        : items.map((item, index) => (
            <div key={keyExtractor ? keyExtractor(item, index) : index} style={{ display: "flex", flexDirection: "column" }}>
              {renderItem({ item, index })}
            </div>
          ))}
      {ListFooterComponent}
    </ScrollView>
  );
};

// ── TextInput ─────────────────────────────────────────────────────────────────
export interface TextInputProps {
  style?: RNStyle;
  value?: string;
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  placeholderTextColor?: string;
  multiline?: boolean;
  numberOfLines?: number;
  secureTextEntry?: boolean;
  editable?: boolean;
  autoFocus?: boolean;
  autoCapitalize?: string;
  autoCorrect?: boolean;
  keyboardType?: "default" | "numeric" | "number-pad" | "decimal-pad" | "email-address" | "phone-pad";
  maxLength?: number;
  returnKeyType?: string;
  textAlignVertical?: string;
}

const KEYBOARD_INPUTMODE: Record<string, string> = {
  numeric: "numeric",
  "number-pad": "numeric",
  "decimal-pad": "decimal",
  "email-address": "email",
  "phone-pad": "tel",
};

export const TextInput = forwardRef(function TextInput(
  props: TextInputProps,
  ref: Ref<HTMLInputElement & HTMLTextAreaElement>,
) {
  const {
    style, value, defaultValue, onChangeText, onSubmitEditing, onFocus, onBlur,
    placeholder, placeholderTextColor, multiline, numberOfLines, secureTextEntry,
    editable = true, autoFocus, keyboardType, maxLength,
  } = props;
  const css: CSSProperties = {
    boxSizing: "border-box",
    outline: "none",
    border: "none",
    background: "transparent",
    appearance: "none",
    width: "100%",
    ...resolveStyle(style),
  } as CSSProperties;
  if (placeholderTextColor) (css as AnyStyle)["--rn-placeholder"] = placeholderTextColor;
  const common = {
    value,
    defaultValue,
    placeholder,
    autoFocus,
    maxLength,
    readOnly: !editable,
    onFocus,
    onBlur,
    className: "rn-input",
    style: css,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChangeText?.(e.target.value),
  };
  if (multiline) {
    return (
      <textarea
        ref={ref as Ref<HTMLTextAreaElement>}
        rows={numberOfLines ?? 4}
        {...common}
        style={{ ...css, resize: "none" }}
      />
    );
  }
  return (
    <input
      ref={ref as Ref<HTMLInputElement>}
      type={secureTextEntry ? "password" : "text"}
      inputMode={keyboardType ? (KEYBOARD_INPUTMODE[keyboardType] as never) : undefined}
      onKeyDown={onSubmitEditing ? (e) => { if (e.key === "Enter" && !multiline) onSubmitEditing(); } : undefined}
      {...common}
    />
  );
});

// ── LinearGradient ────────────────────────────────────────────────────────────
type Point = { x: number; y: number };

export function LinearGradient({
  colors,
  start = { x: 0.5, y: 0 },
  end = { x: 0.5, y: 1 },
  locations,
  style,
  children,
}: {
  colors: readonly string[];
  start?: Point;
  end?: Point;
  locations?: readonly number[];
  style?: RNStyle;
  children?: ReactNode;
}) {
  // Convert the start→end vector into a CSS gradient angle (0deg = up).
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const stops = colors
    .map((c, i) => (locations && locations[i] != null ? `${c} ${locations[i] * 100}%` : c))
    .join(", ");
  const css: CSSProperties = {
    ...VIEW_BASE,
    backgroundImage: `linear-gradient(${angle}deg, ${stops})`,
    ...resolveStyle(style),
  } as CSSProperties;
  return <div style={css}>{children}</div>;
}

// ── ActivityIndicator ─────────────────────────────────────────────────────────
export function ActivityIndicator({
  size = "small",
  color = "#7C3AED",
  style,
}: {
  size?: "small" | "large" | number;
  color?: string;
  style?: RNStyle;
}) {
  const dim = typeof size === "number" ? size : size === "large" ? 36 : 20;
  return (
    <div style={{ ...resolveStyle(style), width: dim, height: dim, display: "inline-flex" }}>
      <span
        className="rn-spinner"
        style={{
          width: dim,
          height: dim,
          border: `${Math.max(2, dim / 10)}px solid ${color}33`,
          borderTopColor: color,
          borderRadius: "50%",
          display: "block",
        }}
      />
    </div>
  );
}

// ── Image ─────────────────────────────────────────────────────────────────────
export function Image({
  source,
  style,
  resizeMode,
  accessibilityLabel,
}: {
  source: { uri: string } | string | number;
  style?: RNStyle;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  accessibilityLabel?: string;
}) {
  const src = typeof source === "string" ? source : typeof source === "object" ? source.uri : "";
  const objectFit = resizeMode === "stretch" ? "fill" : resizeMode === "center" ? "none" : resizeMode ?? "cover";
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={accessibilityLabel ?? ""} style={{ ...resolveStyle(style), objectFit } as CSSProperties} />;
}

// ── StyleSheet / Platform / Dimensions / Alert / Linking ──────────────────────
export const StyleSheet = {
  create<T extends Record<string, RNStyle>>(styles: T): T {
    return styles;
  },
  flatten: resolveStyle,
  hairlineWidth: 1,
  absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const,
  absoluteFillObject: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const,
};

export const Platform = {
  OS: "web" as "web" | "ios" | "android",
  select<T>(spec: { web?: T; default?: T; ios?: T; android?: T; native?: T }): T | undefined {
    return spec.web ?? spec.default;
  },
};

export const Dimensions = {
  get(_dim: "window" | "screen") {
    if (typeof window === "undefined") return { width: 390, height: 844, scale: 1, fontScale: 1 };
    return { width: window.innerWidth, height: window.innerHeight, scale: window.devicePixelRatio || 1, fontScale: 1 };
  },
  addEventListener() {
    return { remove() {} };
  },
};

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    const body = [title, message].filter(Boolean).join("\n\n");
    if (!buttons || buttons.length <= 1) {
      if (typeof window !== "undefined") window.alert(body);
      buttons?.[0]?.onPress?.();
      return;
    }
    // Map a 2-button alert onto window.confirm: cancel vs. the action button.
    const confirmBtn = buttons.find((b) => b.style !== "cancel") ?? buttons[buttons.length - 1];
    const cancelBtn = buttons.find((b) => b.style === "cancel");
    if (typeof window !== "undefined" && window.confirm(body)) confirmBtn?.onPress?.();
    else cancelBtn?.onPress?.();
  },
};

export const Linking = {
  async openURL(url: string) {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener");
  },
  createURL(path: string) {
    if (typeof window === "undefined") return path;
    return `${window.location.origin}/${path.replace(/^\//, "")}`;
  },
};

// ── Safe area (react-native-safe-area-context) ────────────────────────────────
// On web the centered column has no notch; insets are zero. Components that
// reserved space for the iOS home indicator/status bar simply get 0 here, and
// CSS env(safe-area-inset-*) handles real device chrome where present.
export function SafeAreaProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function useSafeAreaInsets() {
  return { top: 0, bottom: 0, left: 0, right: 0 };
}

// ── StatusBar (expo-status-bar) ───────────────────────────────────────────────
export function StatusBar(_props: { style?: string; backgroundColor?: string }) {
  return null;
}

// ── BlurView (expo-blur) → CSS backdrop blur ──────────────────────────────────
export function BlurView({
  children,
  style,
  intensity = 50,
  tint = "light",
}: {
  children?: ReactNode;
  style?: RNStyle;
  intensity?: number;
  tint?: "light" | "dark" | "default";
}) {
  const alpha = Math.min(0.85, intensity / 100);
  const bg = tint === "dark" ? `rgba(20,16,30,${alpha})` : `rgba(255,255,255,${alpha})`;
  const blur = `blur(${Math.round(intensity / 3)}px)`;
  return (
    <div
      style={{
        ...VIEW_BASE,
        backgroundColor: bg,
        backdropFilter: blur,
        WebkitBackdropFilter: blur,
        ...resolveStyle(style),
      } as CSSProperties}
    >
      {children}
    </div>
  );
}

// ── GestureHandlerRootView (react-native-gesture-handler) ──────────────────────
export const GestureHandlerRootView = View;

// ── Swipeable (react-native-gesture-handler/Swipeable) ────────────────────────
// Web has no edge-swipe; render the row with its trailing actions revealed as a
// trailing control so swipe-to-delete still works via a tap.
export function Swipeable({
  children,
  renderRightActions,
}: {
  children?: ReactNode;
  renderRightActions?: (progress?: unknown, drag?: unknown) => ReactNode;
  onSwipeableOpen?: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch", width: "100%" }}>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {renderRightActions ? <div style={{ display: "flex" }}>{renderRightActions()}</div> : null}
    </div>
  );
}
export default Swipeable;
