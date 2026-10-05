import { useAnimatedScrollHandler, withTiming } from "react-native-reanimated";

import { useOptionalTabBar } from "@/context/tab-bar-context";

type ScrollContext = {
  previousY: number;
  accumulatedDistance: number;
  direction: "up" | "down" | null;
};

export function useTabBarScroll(enabled = true) {
  const tabBar = useOptionalTabBar();
  const tabBarTranslateY = tabBar?.translateY;
  return useAnimatedScrollHandler<ScrollContext>({
    onBeginDrag: (event, context) => {
      context.previousY = event.contentOffset.y;
      context.accumulatedDistance = 0;
      context.direction = null;
    },
    onScroll: (event, context) => {
      if (!enabled || !tabBarTranslateY) {
        return;
      }

      const currentY = event.contentOffset.y;

      const previousY = context.previousY ?? currentY;

      const difference = currentY - previousY;

      if (currentY <= 0) {
        tabBarTranslateY.set(
          withTiming(0, {
            duration: 200,
          }),
        );
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
        tabBarTranslateY.set(
          withTiming(100, {
            duration: 200,
          }),
        );

        context.accumulatedDistance = 0;
      }

      if (context.direction === "up" && context.accumulatedDistance >= 10) {
        tabBarTranslateY.set(
          withTiming(0, {
            duration: 200,
          }),
        );

        context.accumulatedDistance = 0;
      }

      context.previousY = currentY;
    },
  });
}
