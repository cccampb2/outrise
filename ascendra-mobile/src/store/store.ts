import { configureStore } from "@reduxjs/toolkit";

import onboardingReducer from "./onboarding-slice";
import authReducer from "./auth-slice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    onboarding: onboardingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
