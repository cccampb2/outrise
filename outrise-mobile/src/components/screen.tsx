import { ReactNode } from "react";
import { StyleSheet, View, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { useTabBarScroll } from "@/hooks/use-tab-bar-scroll";
import { useOptionalTabBar } from "@/context/tab-bar-context";
import { Colors } from "@/constants/theme";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  hideTabBarOnScroll?: boolean;
  bottomInSet?: number;
};

export function Screen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  hideTabBarOnScroll = false,
  bottomInSet = 0,
}: ScreenProps) {
  const tabBar = useOptionalTabBar();
  const scrollHandler = useTabBarScroll(hideTabBarOnScroll);
  const content = scroll ? (
    <Animated.ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: bottomInSet,
          paddingTop: tabBar ? 72 : 0,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScroll={scrollHandler}
      scrollEventThrottle={16}
    >
      {children}
    </Animated.ScrollView>
  ) : (
    <View style={[styles.content, styles.staticContent, tabBar && { paddingTop: 72 }]}>
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.screenBody}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  staticContent: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  screenBody: {
    flex: 1,
  },
});
