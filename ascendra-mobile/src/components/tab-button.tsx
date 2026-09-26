import type { TabTriggerSlotProps } from "expo-router/ui";
import type { ReactNode } from "react";

import { Pressable, StyleSheet, Text, View } from "react-native";

import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "@/constants/theme";

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

  focusProgress.value = withSpring(isFocused ? 1 : 0, {
    damping: 16,
    stiffness: 180,
    mass: 0.7,
  });

  const moduleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(focusProgress.value, [0, 1], [0, -7]),
        },
      ],
    };
  });

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isFocused ? 1 : 0, {
        duration: 180,
      }),

      transform: [
        {
          scale: interpolate(focusProgress.value, [0, 1], [0.4, 1]),
        },
        {
          rotate: "45deg",
        },
      ],
    };
  });

  const accentRailAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isFocused ? 1 : 0, {
        duration: 180,
      }),

      transform: [
        {
          scaleX: interpolate(focusProgress.value, [0, 1], [0.15, 1]),
        },
      ],
    };
  });

  const color = isFocused ? Colors.dark.accent : Colors.dark.textMuted;

  return (
    <Pressable {...props} style={styles.pressable}>
      <Animated.View
        style={[
          styles.module,
          isFocused && styles.moduleFocused,
          moduleAnimatedStyle,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.focusDiamond, indicatorAnimatedStyle]}
        />

        <Animated.View
          pointerEvents="none"
          style={[styles.accentRail, accentRailAnimatedStyle]}
        />

        <View style={styles.iconArea}>{icon(color)}</View>

        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color,
            },
          ]}
        >
          {label}
        </Text>

        <View style={styles.lowerDetail}>
          <View
            style={[styles.lowerLine, isFocused && styles.lowerLineFocused]}
          />

          <View
            style={[styles.lowerNode, isFocused && styles.lowerNodeFocused]}
          />

          <View
            style={[styles.lowerLine, isFocused && styles.lowerLineFocused]}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },

  module: {
    height: 60,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: Colors.dark.backgroundElement,

    borderWidth: 1,
    borderColor: Colors.dark.border,

    paddingTop: 7,
    paddingBottom: 5,
  },

  moduleFocused: {
    backgroundColor: Colors.dark.backgroundSelected,

    borderColor: Colors.dark.borderStrong,
  },

  focusDiamond: {
    position: "absolute",

    top: -4,

    width: 7,
    height: 7,

    backgroundColor: Colors.dark.accent,
  },

  accentRail: {
    position: "absolute",

    top: 0,
    left: 10,
    right: 10,

    height: 2,

    backgroundColor: Colors.dark.accent,
  },

  iconArea: {
    height: 25,

    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    marginTop: 3,

    fontSize: 8,
    fontWeight: "800",

    letterSpacing: 0.8,
  },

  lowerDetail: {
    position: "absolute",

    left: 9,
    right: 9,
    bottom: 4,

    flexDirection: "row",
    alignItems: "center",

    gap: 3,
  },

  lowerLine: {
    flex: 1,

    height: StyleSheet.hairlineWidth,

    backgroundColor: Colors.dark.borderSubtle,
  },

  lowerLineFocused: {
    backgroundColor: Colors.dark.borderStrong,
  },

  lowerNode: {
    width: 2,
    height: 2,

    backgroundColor: Colors.dark.textDim,
  },

  lowerNodeFocused: {
    backgroundColor: Colors.dark.accent,
  },
});
