import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Faction } from "@/api/factions";
import { clearCurrentUser, setAccountRestriction } from "./auth-slice";

type OnboardingState = {
  recommendedFaction: Faction | null;
  selectedFaction: Faction | null;
};

const initialState: OnboardingState = {
  recommendedFaction: null,
  selectedFaction: null,
};

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    setRecommendedFaction(state, action: PayloadAction<Faction>) {
      state.recommendedFaction = action.payload;
      state.selectedFaction = action.payload;
    },
    setSelectedFaction(state, action: PayloadAction<Faction>) {
      state.selectedFaction = action.payload;
    },
    resetOnboarding() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(clearCurrentUser, () => initialState);
    builder.addCase(setAccountRestriction, () => initialState);
  },
});

export const { setRecommendedFaction, setSelectedFaction, resetOnboarding } =
  onboardingSlice.actions;
export default onboardingSlice.reducer;
