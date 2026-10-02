import { createContext, type ReactNode, useContext } from "react";
import {
  type SharedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type TabBarContextValue = {
  translateY: SharedValue<number>;
  hideTabBar: () => void;
  showTabBar: () => void;
};

const TabBarContext = createContext<TabBarContextValue | null>(null);

type TabBarProviderProps = {
  children: ReactNode;
};

export function TabBarProvider({ children }: TabBarProviderProps) {
  const translateY = useSharedValue(0);

  function hideTabBar() {
    translateY.value = withTiming(100, {
      duration: 200,
    });
  }

  function showTabBar() {
    translateY.value = withTiming(0, {
      duration: 200,
    });
  }

  return (
    <TabBarContext.Provider
      value={{
        translateY,
        hideTabBar,
        showTabBar,
      }}
    >
      {children}
    </TabBarContext.Provider>
  );
}

export function useTabBar() {
  const context = useContext(TabBarContext);

  if (!context) {
    throw new Error("useTabBar must be used inside TabBarProvider");
  }

  return context;
}

export function useOptionalTabBar() {
  return useContext(TabBarContext);
}
