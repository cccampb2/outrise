import { useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  StyleSheet,
  View,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TextInput,
  type ScrollView,
  type KeyboardEvent,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, {
  useAnimatedRef,
  useScrollOffset,
} from "react-native-reanimated";
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
  bottomInSet = 32,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const tabBar = useOptionalTabBar();
  const scrollHandler = useTabBarScroll(hideTabBarOnScroll);
  const scrollRef = useAnimatedRef<ScrollView>();
  const scrollOffset = useScrollOffset(
    scroll && keyboardAvoiding ? scrollRef : null,
  );
  const focusedInput =
    useRef<ReturnType<typeof TextInput.State.currentlyFocusedInput>>(null);
  const keyboardTop = useRef<number | null>(null);

  const revealFocusedInput = useCallback(() => {
    const input = focusedInput.current;
    const viewport = scrollRef.current;
    if (
      !scroll ||
      !keyboardAvoiding ||
      !input ||
      !viewport ||
      !Keyboard.isVisible() ||
      input !== TextInput.State.currentlyFocusedInput()
    ) {
      return;
    }
    const nativeViewport = viewport.getNativeScrollRef();
    if (!nativeViewport) return;
    nativeViewport.measureInWindow((_, viewportY, __, viewportHeight) => {
      if (focusedInput.current !== input || scrollRef.current !== viewport)
        return;
      input.measureInWindow((_, inputY, __, inputHeight) => {
        if (
          focusedInput.current !== input ||
          input !== TextInput.State.currentlyFocusedInput() ||
          scrollRef.current !== viewport ||
          !Keyboard.isVisible()
        ) {
          return;
        }
        const visibleBottom = Math.min(
          viewportY + viewportHeight,
          keyboardTop.current ?? Keyboard.metrics()?.screenY ?? Infinity,
        );
        const overflow = inputY + inputHeight + 24 - visibleBottom;
        if (overflow > 0) {
          viewport.scrollTo({
            y: Math.max(0, scrollOffset.get() + overflow),
            animated: true,
          });
        }
      });
    });
  }, [scroll, keyboardAvoiding, scrollRef, scrollOffset]);

  useEffect(() => {
    if (!scroll || !keyboardAvoiding) return;
    const handleKeyboardChange = (event: KeyboardEvent) => {
      keyboardTop.current = event.endCoordinates.screenY;
      revealFocusedInput();
    };
    const subscriptions = [
      Keyboard.addListener("keyboardDidShow", handleKeyboardChange),
      Keyboard.addListener("keyboardDidHide", () => {
        keyboardTop.current = null;
      }),
    ];
    if (Platform.OS === "ios") {
      subscriptions.push(
        Keyboard.addListener("keyboardDidChangeFrame", handleKeyboardChange),
      );
    }
    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      focusedInput.current = null;
    };
  }, [scroll, keyboardAvoiding, revealFocusedInput]);
  const content = scroll ? (
    <Animated.ScrollView
      ref={scrollRef}
      automaticallyAdjustKeyboardInsets={
        keyboardAvoiding && Platform.OS === "ios"
      }
      onFocus={() => {
        focusedInput.current = TextInput.State.currentlyFocusedInput();
        revealFocusedInput();
      }}
      onBlur={() => {
        focusedInput.current = null;
      }}
      onLayout={revealFocusedInput}
      style={styles.scrollView}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: bottomInSet + insets.bottom,
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
    <View
      style={[
        styles.content,
        styles.staticContent,
        tabBar && { paddingTop: 72 },
      ]}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {keyboardAvoiding && !(scroll && Platform.OS === "ios") ? (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={insets.top + (scroll ? 0 : 24)}
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
