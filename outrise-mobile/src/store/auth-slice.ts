import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { CurrentUser } from "@/api/users";
import type { AccountRestriction } from "@/api/client";

type AuthState = {
  user: CurrentUser | null;
  accountNotice: AccountRestriction | null;
  emailVerificationResendAt: number | null;
};

const initialState: AuthState = {
  user: null,
  accountNotice: null,
  emailVerificationResendAt: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCurrentUser(state, action: PayloadAction<CurrentUser>) {
      if (state.user?.id !== action.payload.id)
        state.emailVerificationResendAt = null;
      state.user = {
        ...action.payload,
        emailVerified: action.payload.emailVerified === true,
      };
      state.accountNotice = null;
    },
    clearCurrentUser(state) {
      state.user = null;
      state.accountNotice = null;
      state.emailVerificationResendAt = null;
    },
    setAccountRestriction(state, action: PayloadAction<AccountRestriction>) {
      state.user = null;
      state.accountNotice = action.payload;
      state.emailVerificationResendAt = null;
    },
    clearAccountNotice(state) {
      state.accountNotice = null;
    },
    setAgeEligibilityRequired(state) {
      if (state.user) state.user.ageEligibilityConfirmedAt = null;
    },
    setEmailVerificationRequired(state) {
      if (state.user) state.user.emailVerified = false;
    },
    setEmailVerificationResendAt(state, action: PayloadAction<number>) {
      state.emailVerificationResendAt = action.payload;
    },
  },
});

export const {
  setCurrentUser,
  clearCurrentUser,
  setAccountRestriction,
  clearAccountNotice,
  setEmailVerificationRequired,
  setAgeEligibilityRequired,
  setEmailVerificationResendAt,
} = authSlice.actions;

export default authSlice.reducer;
