import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { CurrentUser } from "@/api/users";
import type { AccountRestriction } from "@/api/client";

type AuthState = {
  user: CurrentUser | null;
  accountNotice: AccountRestriction | null;
};

const initialState: AuthState = {
  user: null,
  accountNotice: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCurrentUser(state, action: PayloadAction<CurrentUser>) {
      state.user = action.payload;
      state.accountNotice = null;
    },
    clearCurrentUser(state) {
      state.user = null;
      state.accountNotice = null;
    },
    setAccountRestriction(state, action: PayloadAction<AccountRestriction>) {
      state.user = null;
      state.accountNotice = action.payload;
    },
    clearAccountNotice(state) {
      state.accountNotice = null;
    },
  },
});

export const { setCurrentUser, clearCurrentUser, setAccountRestriction, clearAccountNotice } = authSlice.actions;

export default authSlice.reducer;
