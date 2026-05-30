// Thin wrapper over @tabler/icons-react-native so the rest of the app refers to
// icons by semantic name and never imports the icon lib directly. Outline only.
import {
  IconHome2,
  IconFileText,
  IconChartPie,
  IconUser,
  IconMicrophone,
  IconBell,
  IconPin,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconX,
  IconSquare,
  IconArrowLeft,
  IconClock,
  IconTrendingUp,
  IconTrendingDown,
  IconSparkles,
  IconAlertTriangle,
  IconTag,
  IconPackage,
  IconSpeakerphone,
  IconRocket,
  IconBulb,
  IconShieldCheck,
  IconChartLine,
  IconEye,
  IconEyeOff,
  IconLogin2,
  IconBrandGoogle,
  IconPencil,
  IconFileSpreadsheet,
  IconPlus,
  type IconProps,
} from "@tabler/icons-react-native";
import { colors } from "@/theme/tokens";

const REGISTRY = {
  home: IconHome2,
  reports: IconFileText,
  analytics: IconChartPie,
  profile: IconUser,
  mic: IconMicrophone,
  bell: IconBell,
  pin: IconPin,
  "chevron-right": IconChevronRight,
  "chevron-up": IconChevronUp,
  "chevron-down": IconChevronDown,
  x: IconX,
  square: IconSquare,
  "arrow-left": IconArrowLeft,
  clock: IconClock,
  "trending-up": IconTrendingUp,
  "trending-down": IconTrendingDown,
  sparkles: IconSparkles,
  "alert-triangle": IconAlertTriangle,
  tag: IconTag,
  package: IconPackage,
  speakerphone: IconSpeakerphone,
  rocket: IconRocket,
  bulb: IconBulb,
  "shield-check": IconShieldCheck,
  "chart-line": IconChartLine,
  eye: IconEye,
  "eye-off": IconEyeOff,
  login: IconLogin2,
  google: IconBrandGoogle,
  pencil: IconPencil,
  spreadsheet: IconFileSpreadsheet,
  plus: IconPlus,
} as const;

export type IconName = keyof typeof REGISTRY;

export function Icon({
  name,
  size = 22,
  color = colors.text.secondary,
  ...rest
}: { name: IconName } & IconProps) {
  const Cmp = REGISTRY[name];
  return <Cmp size={size} color={color} strokeWidth={1.75} {...rest} />;
}
