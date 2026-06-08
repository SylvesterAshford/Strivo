"use client";

// Thin wrapper over lucide-react so the rest of the app refers to icons by
// semantic name and never imports the icon lib directly. Outline only.
import {
  Home,
  FileText,
  PieChart,
  User,
  Mic,
  Bell,
  Pin,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Square,
  ArrowLeft,
  Clock,
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  Tag,
  Package,
  Megaphone,
  Rocket,
  Lightbulb,
  ShieldCheck,
  LineChart,
  Eye,
  EyeOff,
  LogIn,
  Pencil,
  FileSpreadsheet,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { colors } from "@/theme/tokens";

// lucide ships no brand icons; render the multi-colour Google "G" inline.
function GoogleMark({ size = 22 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 8.1 29.3 6 24 6 14.1 6 6 14.1 6 24s8.1 18 18 18c10.5 0 17.6-7.5 17.6-18 0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 8.1 29.3 6 24 6 16.3 6 9.7 10.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 42c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 32.9 26.7 34 24 34c-5.2 0-9.6-3.3-11.2-8l-6.6 5.1C9.6 37.6 16.2 42 24 42z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C39.9 36 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

const REGISTRY: Record<string, LucideIcon | typeof GoogleMark> = {
  home: Home,
  reports: FileText,
  analytics: PieChart,
  profile: User,
  mic: Mic,
  bell: Bell,
  pin: Pin,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  "chevron-down": ChevronDown,
  x: X,
  square: Square,
  "arrow-left": ArrowLeft,
  clock: Clock,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  sparkles: Sparkles,
  "alert-triangle": AlertTriangle,
  tag: Tag,
  package: Package,
  speakerphone: Megaphone,
  rocket: Rocket,
  bulb: Lightbulb,
  "shield-check": ShieldCheck,
  "chart-line": LineChart,
  eye: Eye,
  "eye-off": EyeOff,
  login: LogIn,
  google: GoogleMark,
  pencil: Pencil,
  spreadsheet: FileSpreadsheet,
  plus: Plus,
};

export type IconName = keyof typeof REGISTRY;

export function Icon({
  name,
  size = 22,
  color = colors.text.secondary,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const Cmp = REGISTRY[name];
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
