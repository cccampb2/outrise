import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import { Colors, TAB_BAR_HEIGHT } from "@/constants/theme";
import { TabBarProvider, useTabBar } from "@/context/tab-bar-context";
import { TabButton } from "@/components/tab-button";

function CustomTabBar() {
  const { translateY } = useTabBar();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: translateY.value,
      },
    ],
  }));

  const ICON_SIZE = 21;

  return (
    <Animated.View style={[styles.tabBarWrapper, animatedStyle]}>
      <View style={styles.navigationBackdrop} />

      <View style={styles.navigationRow}>
        <TabTrigger name="home" asChild>
          <TabButton
            label="HOME"
            icon={(color) => (
              <Ionicons name="home-outline" size={ICON_SIZE} color={color} />
            )}
          />
        </TabTrigger>

        <TabTrigger name="train" asChild>
          <TabButton
            label="TRAIN"
            icon={(color) => (
              <MaterialCommunityIcons
                name="lightning-bolt-outline"
                size={ICON_SIZE + 1}
                color={color}
              />
            )}
          />
        </TabTrigger>

        <TabTrigger name="community" asChild>
          <TabButton
            label="COMMUNITY"
            icon={(color) => (
              <FontAwesome6
                name="people-group"
                size={ICON_SIZE - 2}
                color={color}
              />
            )}
          />
        </TabTrigger>

        <TabTrigger name="rankings" asChild>
          <TabButton
            label="RANKINGS"
            icon={(color) => (
              <FontAwesome6
                name="ranking-star"
                size={ICON_SIZE - 2}
                color={color}
              />
            )}
          />
        </TabTrigger>

        <TabTrigger name="profile" asChild>
          <TabButton
            label="PROFILE"
            icon={(color) => (
              <MaterialCommunityIcons
                name="account-outline"
                size={ICON_SIZE + 1}
                color={color}
              />
            )}
          />
        </TabTrigger>
      </View>

      <View style={styles.systemRail}>
        <View style={styles.railLine} />

        <View style={styles.railCenter}>
          <View style={styles.railDot} />
        </View>

        <View style={styles.railLine} />
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  return (
    <TabBarProvider>
      <Tabs>
        <TabSlot />

        <CustomTabBar />

        <TabList style={styles.hiddenTabList}>
          <TabTrigger name="home" href="/" />
          <TabTrigger name="train" href="/train" />
          <TabTrigger name="community" href="/community" />
          <TabTrigger name="rankings" href="/rankings" />
          <TabTrigger name="profile" href="/profile" />
        </TabList>
      </Tabs>
    </TabBarProvider>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: "absolute",

    left: 12,
    right: 12,
    bottom: 10,

    height: TAB_BAR_HEIGHT,
  },

  navigationRow: {
    flex: 1,

    flexDirection: "row",
    alignItems: "flex-end",

    gap: 0,
  },

  systemRail: {
    height: 7,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 12,
    gap: 7,
  },

  railLine: {
    flex: 1,

    height: StyleSheet.hairlineWidth,

    backgroundColor: Colors.dark.borderSubtle,
  },

  railCenter: {
    width: 18,
    height: 7,

    alignItems: "center",
    justifyContent: "center",
  },

  railDot: {
    width: 3,
    height: 3,

    backgroundColor: Colors.dark.textDim,

    transform: [{ rotate: "45deg" }],
  },

  hiddenTabList: {
    display: "none",
  },
  navigationBackdrop: {
    position: "absolute",
    height: "125%",
    left: -12,
    right: -12,
    top: 0,
    bottom: -10,

    backgroundColor: Colors.dark.background,
  },
});
