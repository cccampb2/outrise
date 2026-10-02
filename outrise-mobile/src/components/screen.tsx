import { ReactNode } from "react";
import { StyleSheet, View, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedScrollHandler,
  withTiming,
} from "react-native-reanimated";
import { useOptionalTabBar } from "@/context/tab-bar-context";
import { Colors } from "@/constants/theme";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  hideTabBarOnScroll?: boolean;
  bottomInSet?: number;
};
type ScrollContext = {
  previousY: number;
  accumulatedDistance: number;
  direction: "up" | "down" | null;
};

export function Screen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  hideTabBarOnScroll = false,
  bottomInSet = 0,
}: ScreenProps) {
  const tabBar = useOptionalTabBar();
  const tabBarTranslateY = tabBar?.translateY;
  const scrollHandler = useAnimatedScrollHandler<ScrollContext>({
    onBeginDrag: (event, context) => {
      context.previousY = event.contentOffset.y;
      context.accumulatedDistance = 0;
      context.direction = null;
    },
    onScroll: (event, context) => {
      if (!hideTabBarOnScroll || !tabBarTranslateY) {
        return;
      }

      const currentY = event.contentOffset.y;

      const previousY = context.previousY ?? currentY;

      const difference = currentY - previousY;

      if (currentY <= 0) {
        tabBarTranslateY.value = withTiming(0, {
          duration: 200,
        });
        context.accumulatedDistance = 0;
        context.direction = null;
        context.previousY = currentY;

        return;
      }

      const newDirection =
        difference > 0 ? "down" : difference < 0 ? "up" : context.direction;

      if (newDirection !== context.direction) {
        context.accumulatedDistance = 0;

        context.direction = newDirection;
      }

      context.accumulatedDistance += Math.abs(difference);

      if (context.direction === "down" && context.accumulatedDistance >= 10) {
        tabBarTranslateY.value = withTiming(100, {
          duration: 200,
        });

        context.accumulatedDistance = 0;
      }

      if (context.direction === "up" && context.accumulatedDistance >= 10) {
        tabBarTranslateY.value = withTiming(0, {
          duration: 200,
        });

        context.accumulatedDistance = 0;
      }

      context.previousY = currentY;
    },
  });
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
    <View style={[styles.content, tabBar && { paddingTop: 72 }]}>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  screenBody: {
    flex: 1,
  },
});
