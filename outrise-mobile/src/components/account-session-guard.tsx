import { useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import {
  onAccountRestricted,
  onSessionExpired,
  onEmailVerificationRequired,
  onAgeEligibilityRequired,
  type AccountRestriction,
} from "@/api/client";
import { getCurrentUser } from "@/api/users";
import { deleteToken } from "@/storage/auth-storage";
import {
  setAccountRestriction,
  setCurrentUser,
  clearCurrentUser,
  setEmailVerificationRequired,
  setAgeEligibilityRequired,
} from "@/store/auth-slice";
import { store, type AppDispatch, type RootState } from "@/store/store";

export function AccountSessionGuard() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const emailVerified = useSelector(
    (state: RootState) => state.auth.user?.emailVerified,
  );
  const ageEligibilityConfirmedAt = useSelector(
    (state: RootState) => state.auth.user?.ageEligibilityConfirmedAt,
  );
  const dispatch = useDispatch<AppDispatch>();
  const client = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let handlingRestriction = false;
    let refreshing = false;
    const controller = new AbortController();

    async function endSession(restriction?: AccountRestriction) {
      if (handlingRestriction || store.getState().auth.user?.id !== userId)
        return;
      handlingRestriction = true;
      dispatch(
        restriction ? setAccountRestriction(restriction) : clearCurrentUser(),
      );
      await client.cancelQueries();
      client.clear();
      try {
        await deleteToken();
      } finally {
        router.replace(
          restriction
            ? "/login"
            : { pathname: "/login", params: { sessionExpired: "true" } },
        );
      }
    }

    const unsubscribe = onAccountRestricted((restriction) => {
      void endSession(restriction).catch(console.error);
    });

    const unsubscribeSession = onSessionExpired(() => {
      void endSession().catch(console.error);
    });

    const unsubscribeVerification = onEmailVerificationRequired(() => {
      if (
        cancelled ||
        handlingRestriction ||
        store.getState().auth.user?.id !== userId
      )
        return;
      dispatch(setEmailVerificationRequired());
      void client.cancelQueries().catch(console.error);
    });

    const unsubscribeAge = onAgeEligibilityRequired(() => {
      if (
        cancelled ||
        handlingRestriction ||
        store.getState().auth.user?.id !== userId
      )
        return;
      dispatch(setAgeEligibilityRequired());
      void client.cancelQueries().catch(console.error);
    });

    async function refreshAccount() {
      if (refreshing || cancelled || handlingRestriction) return;
      refreshing = true;
      try {
        const user = await getCurrentUser(controller.signal);
        const currentUser = store.getState().auth.user;
        if (
          !cancelled &&
          !handlingRestriction &&
          currentUser?.id === userId &&
          currentUser?.emailVerified === emailVerified &&
          currentUser?.ageEligibilityConfirmedAt === ageEligibilityConfirmedAt
        ) {
          dispatch(setCurrentUser(user));
        }
      } catch {
        // Restrictions and revoked sessions are handled by API listeners; connectivity failures keep the session.
      } finally {
        refreshing = false;
      }
    }

    const interval = setInterval(() => {
      if (AppState.currentState === "active") void refreshAccount();
    }, 30000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshAccount();
    });
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
      subscription.remove();
      unsubscribe();
      unsubscribeSession();
      unsubscribeVerification();
      unsubscribeAge();
    };
  }, [userId, emailVerified, ageEligibilityConfirmedAt, dispatch, client]);
  return null;
}
