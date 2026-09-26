import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { CurrentUser } from "@/api/users";

type AuthState = {
  user: CurrentUser | null;
};

const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCurrentUser(state, action: PayloadAction<CurrentUser>) {
      state.user = action.payload;
    },
    clearCurrentUser(state) {
      state.user = null;
    },
  },
});

export const { setCurrentUser, clearCurrentUser } = authSlice.actions;

export default authSlice.reducer;
