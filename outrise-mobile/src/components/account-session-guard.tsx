import { useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { onAccountRestricted, onSessionExpired, type AccountRestriction } from "@/api/client";
import { getCurrentUser } from "@/api/users";
import { deleteToken } from "@/storage/auth-storage";
import { setAccountRestriction, setCurrentUser, clearCurrentUser } from "@/store/auth-slice";
import { store, type AppDispatch, type RootState } from "@/store/store";

export function AccountSessionGuard() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const dispatch = useDispatch<AppDispatch>();
  const client = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let handlingRestriction = false;
    let refreshing = false;

    async function endSession(restriction?: AccountRestriction) {
      if (handlingRestriction || store.getState().auth.user?.id !== userId) return;
      handlingRestriction = true;
      dispatch(restriction ? setAccountRestriction(restriction) : clearCurrentUser());
      await client.cancelQueries();
      client.clear();
      try {
        await deleteToken();
      } finally {
        router.replace(restriction ? "/login" : { pathname: "/login", params: { sessionExpired: "true" } });
      }
    }

    const unsubscribe = onAccountRestricted((restriction) => {
      void endSession(restriction).catch(console.error);
    });

    const unsubscribeSession = onSessionExpired(() => {
      void endSession().catch(console.error);
    });

    async function refreshAccount() {
      if (refreshing || cancelled || handlingRestriction) return;
      refreshing = true;
      try {
        const user = await getCurrentUser();
        if (!cancelled && !handlingRestriction && store.getState().auth.user?.id === userId) {
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
      clearInterval(interval);
      subscription.remove();
      unsubscribe();
      unsubscribeSession();
    };
  }, [userId, dispatch, client]);
  return null;
}
