import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Faction } from "@/api/factions";

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
  },
});

export const { setRecommendedFaction, setSelectedFaction } = onboardingSlice.actions;
export default onboardingSlice.reducer;
