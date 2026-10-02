import { createContext, forwardRef, useContext } from "react";
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  StyleSheet,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from "react-native";

type FontStyle = Pick<TextStyle, "fontWeight" | "fontStyle" | "fontFamily" | "letterSpacing">;
const FontContext = createContext<FontStyle>({ fontWeight: "400", fontStyle: "normal", fontFamily: "Barlow-Regular", letterSpacing: 0 });

function fontFamily({ fontWeight, fontStyle, fontFamily }: FontStyle) {
  const family = fontFamily?.startsWith("BarlowCondensed") ? "BarlowCondensed" : "Barlow";
  const weight = fontWeight === "bold" ? 700 : Number(fontWeight) || 400;
  const face = weight >= 900 ? "Black" : weight >= 800 ? "ExtraBold" : weight >= 700 ? "Bold" : weight >= 600 ? "SemiBold" : weight >= 500 ? "Medium" : "Regular";
  const variant = fontStyle === "italic" ? face === "Regular" ? "Italic" : `${face}Italic` : face;
  return `${family}-${variant}`;
}

function typographyStyle(font: FontStyle): TextStyle {
  const family = fontFamily(font);
  return {
    fontFamily: family,
    fontWeight: "normal",
    fontStyle: "normal",
    letterSpacing: (font.letterSpacing ?? 0) + (family.startsWith("BarlowCondensed") ? 1 : 0),
  };
}

export const AppText = forwardRef<NativeText, TextProps>(function AppText({ style, children, ...props }, ref) {
  const inherited = useContext(FontContext);
  const flattened = StyleSheet.flatten(style);
  const font = {
    fontWeight: flattened?.fontWeight ?? inherited.fontWeight,
    fontStyle: flattened?.fontStyle ?? inherited.fontStyle,
    fontFamily: flattened?.fontFamily ?? inherited.fontFamily,
    // Inherit the original spacing so nested text receives the bump only once.
    letterSpacing: flattened?.letterSpacing ?? inherited.letterSpacing,
  };
  return (
    <NativeText {...props} ref={ref} style={[style, typographyStyle(font)]}>
      <FontContext.Provider value={font}>{children}</FontContext.Provider>
    </NativeText>
  );
});

export const AppTextInput = forwardRef<NativeTextInput, TextInputProps>(function AppTextInput({ style, ...props }, ref) {
  const flattened = StyleSheet.flatten(style);
  return <NativeTextInput {...props} ref={ref} style={[style, typographyStyle(flattened ?? {})]} />;
});
