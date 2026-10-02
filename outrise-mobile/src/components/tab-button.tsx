import { AppText as Text } from "@/components/app-text";
import type { TabTriggerSlotProps } from "expo-router/ui";
import { useEffect, type ReactNode } from "react";

import { Pressable, StyleSheet, View } from "react-native";

import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Fonts } from "@/constants/theme";

type TabButtonProps = TabTriggerSlotProps & {
  label: string;
  icon: (color: string) => ReactNode;
};

export function TabButton({
  label,
  icon,
  isFocused,
  ...props
}: TabButtonProps) {
  const focusProgress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    focusProgress.value = withSpring(isFocused ? 1 : 0, {
      damping: 16,
      stiffness: 180,
      mass: 0.7,
    });
  }, [isFocused, focusProgress]);

  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(focusProgress.value, [0, 1], [1, 1.05]),
        },
      ],
    };
  });

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: focusProgress.value,

      transform: [
        {
          scaleX: interpolate(focusProgress.value, [0, 1], [0.4, 1]),
        },
      ],
    };
  });

  const color = isFocused ? "#FFFFFF" : "#87939F";

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{
        ...props.accessibilityState,
        selected: Boolean(isFocused),
      }}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <View style={[styles.module, isFocused && styles.moduleFocused]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.activeIndicator, indicatorAnimatedStyle]}
        />

        <Animated.View style={[styles.iconArea, iconAnimatedStyle]}>
          {icon(color)}
        </Animated.View>

        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={[
            styles.label,
            {
              color,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    minHeight: 60,
    borderRadius: 4,
  },

  module: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 4,

    paddingTop: 9,
    paddingBottom: 5,
    paddingHorizontal: 2,
  },

  moduleFocused: {
    backgroundColor: "#111B26",
    borderColor: "#34414E",
  },

  activeIndicator: {
    position: "absolute",

    top: 5,
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#FFFFFF",
  },

  iconArea: {
    height: 26,

    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontFamily: Fonts.display,
    marginTop: 4,

    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
    maxWidth: "100%",

    letterSpacing: 0.1,
  },
  pressed: { opacity: 0.7 },
});
