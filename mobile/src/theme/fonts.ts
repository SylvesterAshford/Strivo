// Font loading via @expo-google-fonts packages — no manual TTF management.
// Family keys here MUST match fonts.* in tokens.ts.
import { useFonts } from "expo-font";
import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import { NotoSansMyanmar_400Regular, NotoSansMyanmar_500Medium } from "@expo-google-fonts/noto-sans-myanmar";

export function useAppFonts() {
  const [loaded, error] = useFonts({
    InstrumentSerif: InstrumentSerif_400Regular,
    "InstrumentSerif-Italic": InstrumentSerif_400Regular_Italic,
    Inter: Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    JetBrainsMono: JetBrainsMono_500Medium,
    NotoSansMyanmar: NotoSansMyanmar_400Regular,
    "NotoSansMyanmar-Medium": NotoSansMyanmar_500Medium,
  });
  return { fontsLoaded: loaded, fontError: error };
}
