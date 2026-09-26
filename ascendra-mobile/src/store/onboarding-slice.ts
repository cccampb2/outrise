import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Faction } from "@/api/factions";

type OnboardingState = {
  recommendedFaction: Faction | null;
};

const initialState: OnboardingState = {
  recommendedFaction: null,
};

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    setRecommendedFaction(state, action: PayloadAction<Faction>) {
      state.recommendedFaction = action.payload;
    },
  },
});

export const { setRecommendedFaction } = onboardingSlice.actions;
export default onboardingSlice.reducer;
