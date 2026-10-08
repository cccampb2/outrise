import { hasAdminAccess } from "@/constants/user-roles";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { AppText as Text } from "@/components/app-text";
import { Screen } from "@/components/screen";
import {
  AdminChoices,
  AdminField,
  adminAchievementStyles as styles,
} from "@/components/admin-achievement-ui";
import {
  accountStatuses,
  getAdminUser,
  setUserAccountStatus,
  setUserRole,
  clearAgeRejection,
  type AdminUser,
  type AccountStatusInput,
  type UserRoleInput,
} from "@/api/admin-users";
import type { AccountStatus } from "@/api/users";
import { ApiError } from "@/api/client";
import type { RootState } from "@/store/store";

function AgeReview({ user }: { user: AdminUser }) {
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const mutation = useMutation({
    mutationFn: () => clearAgeRejection(user._id, reason.trim()),
    onSuccess: async () => {
      await client.invalidateQueries();
    },
  });
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Age eligibility review</Text>
      <Text style={styles.text}>
        Clear a mistaken rejection after reviewing the support request. The user
        must enter their actual age again. This does not lift a ban or
        suspension.
      </Text>
      <AdminField
        label="REVIEW REASON"
        value={reason}
        onChange={setReason}
        disabled={mutation.isPending}
      />
      {mutation.isError && (
        <Text style={styles.error}>
          {mutation.error instanceof ApiError
            ? mutation.error.getDisplayMessage()
            : "Unable to clear restriction."}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={
          mutation.isPending || !reason.trim() || reason.trim().length > 900
        }
        style={styles.button}
        onPress={() =>
          Alert.alert(
            "Clear age restriction?",
            "Only continue after reviewing the account eligibility concern.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Clear restriction", onPress: () => mutation.mutate() },
            ],
          )
        }
      >
        <Text style={styles.action}>
          {mutation.isPending ? "SAVING..." : "CLEAR AGE RESTRICTION →"}
        </Text>
      </Pressable>
    </View>
  );
}

function ModerationForm({ user }: { user: AdminUser }) {
  const client = useQueryClient();
  const [status, setStatus] = useState<AccountStatus>(user.accountStatus);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("7");
  const [validationError, setValidationError] = useState("");
  const mutation = useMutation({
    mutationFn: (data: AccountStatusInput) =>
      setUserAccountStatus(user._id, data),
    onSuccess: async () => {
      await client.invalidateQueries();
    },
  });

  function applyStatus() {
    setValidationError("");
    if (!reason.trim() || reason.trim().length > 1000) {
      setValidationError(
        "Provide an admin-only reason of up to 1,000 characters.",
      );
      return;
    }
    const suspensionDays = Number(days);
    if (
      status === "suspended" &&
      (!/^\d+$/.test(days) || suspensionDays < 1 || suspensionDays > 365)
    ) {
      setValidationError("Choose a whole number of days from 1 to 365.");
      return;
    }
    const data: AccountStatusInput = {
      status,
      reason: reason.trim(),
      ...(status === "suspended" ? { suspensionDays } : {}),
    };
    const description =
      status === "active"
        ? "Restore account access and remove any flag or restriction."
        : status === "flagged"
          ? "Show a community-rules warning. The user can continue using OUTRISE."
          : status === "suspended"
            ? `Block access for ${suspensionDays} days, then automatically restore it.`
            : "Block account access indefinitely. An administrator can restore it later.";
    Alert.alert(`Set ${user.username} to ${status}?`, description, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: ["suspended", "banned"].includes(status)
          ? "destructive"
          : "default",
        onPress: () => mutation.mutate(data),
      },
    ]);
  }

  if (hasAdminAccess(user.role))
    return (
      <Text style={styles.text}>
        Administrator and owner accounts are protected from moderation here.
      </Text>
    );
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Change account status</Text>
      <AdminChoices
        label="New status"
        options={accountStatuses}
        value={status}
        onChange={setStatus}
      />
      {status === "suspended" && (
        <AdminField
          label="Suspension length (days)"
          value={days}
          onChange={setDays}
          numeric
        />
      )}
      <AdminField
        label="Reason (admin only)"
        value={reason}
        onChange={setReason}
        multiline
      />
      <Text style={styles.text}>
        The user sees a general community-rules message. This reason is kept in
        the admin history.
      </Text>
      {validationError && <Text style={styles.error}>{validationError}</Text>}
      {mutation.isError && (
        <Text style={styles.error}>
          {mutation.error instanceof ApiError
            ? mutation.error.getDisplayMessage()
            : "Unable to update account."}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={mutation.isPending}
        onPress={applyStatus}
        style={styles.button}
      >
        <Text style={styles.action}>
          {mutation.isPending ? "SAVING..." : "APPLY STATUS"}
        </Text>
      </Pressable>
    </View>
  );
}

function RoleManagement({
  user,
  ownerId,
}: {
  user: AdminUser;
  ownerId: string;
}) {
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState("");
  const mutation = useMutation({
    mutationFn: (data: UserRoleInput) => setUserRole(user._id, data),
    onSuccess: async () => {
      setReason("");
      await client.invalidateQueries();
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: ["admin-user", user._id] });
    },
  });
  const protectedAccount = user.role === "owner" || user._id === ownerId;
  const promoting = user.role !== "admin";
  const needsActiveAccount = promoting && user.accountStatus !== "active";

  function confirmChange() {
    setValidationError("");
    if (!reason.trim() || reason.trim().length > 1000) {
      setValidationError(
        "Provide an internal reason of up to 1,000 characters.",
      );
      return;
    }
    if (mutation.isPending || protectedAccount || needsActiveAccount) return;
    const data: UserRoleInput = {
      role: promoting ? "admin" : "user",
      expectedRole: user.role,
      reason: reason.trim(),
    };
    Alert.alert(
      `${promoting ? "Promote" : "Demote"} ${user.username}?`,
      promoting
        ? "Give this account admin access to moderation, reports, achievements, and other app content."
        : "Remove admin access and return this account to a regular user. Their workouts and profile stay intact.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: promoting ? "Make admin" : "Demote to user",
          style: promoting ? "default" : "destructive",
          onPress: () => mutation.mutate(data),
        },
      ],
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Manage admin access</Text>
      {protectedAccount ? (
        <Text style={styles.text}>
          Owner accounts are protected. Their role cannot be changed here.
        </Text>
      ) : (
        <>
          <Text style={styles.text}>
            Only owners can promote accounts to admin or remove admin access.
          </Text>
          {needsActiveAccount && (
            <Text style={styles.text}>
              Restore this account to active before promoting it.
            </Text>
          )}
          <AdminField
            label="Reason (internal)"
            value={reason}
            onChange={setReason}
            multiline
          />
          {validationError && (
            <Text style={styles.error}>{validationError}</Text>
          )}
          {mutation.isError && (
            <Text style={styles.error}>
              {mutation.error instanceof ApiError
                ? mutation.error.getDisplayMessage()
                : "Unable to change this account's role."}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: mutation.isPending || needsActiveAccount,
            }}
            disabled={mutation.isPending || needsActiveAccount}
            onPress={confirmChange}
            style={[
              styles.button,
              (mutation.isPending || needsActiveAccount) && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.action}>
              {mutation.isPending
                ? "SAVING..."
                : promoting
                  ? "MAKE ADMIN"
                  : "DEMOTE TO USER"}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

export default function AdminUserScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const admin = useSelector((state: RootState) => state.auth.user);
  const isAdmin = hasAdminAccess(admin?.role);
  const query = useQuery({
    queryKey: ["admin-user", userId, admin?.id],
    queryFn: () => getAdminUser(userId),
    enabled: isAdmin && Boolean(userId),
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (isAdmin && userId) void refetch();
    }, [isAdmin, userId, refetch]),
  );
  return (
    <Screen scroll>
      <View style={styles.page}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.button}
        >
          <Text style={styles.action}>← BACK</Text>
        </Pressable>
        {!isAdmin ? (
          <Text style={styles.error}>Admin access required.</Text>
        ) : (
          <>
            <Text style={styles.title}>Manage account</Text>
            {query.isPending && <ActivityIndicator />}
            {query.isError && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void refetch();
                }}
                style={styles.button}
              >
                <Text style={styles.error}>
                  {query.error instanceof ApiError
                    ? query.error.getDisplayMessage()
                    : "Unable to load account."}{" "}
                  Tap to retry.
                </Text>
              </Pressable>
            )}
            {query.data && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {query.data.user.username}
                  </Text>
                  <Text style={styles.text}>{query.data.user.email}</Text>
                  <Text style={styles.text}>
                    {query.data.user.accountStatus.toUpperCase()} ·{" "}
                    {query.data.user.role.toUpperCase()}
                  </Text>
                  {query.data.user.suspendedUntil && (
                    <Text style={styles.text}>
                      Suspension lifts{" "}
                      {new Date(
                        query.data.user.suspendedUntil,
                      ).toLocaleString()}
                    </Text>
                  )}
                  {query.data.user.moderationReason && (
                    <Text style={styles.text}>
                      Admin reason: {query.data.user.moderationReason}
                    </Text>
                  )}
                </View>
                {query.data.user.ageEligibilityRejectedAt && (
                  <Text style={styles.error}>
                    Age eligibility restricted since{" "}
                    {new Date(
                      query.data.user.ageEligibilityRejectedAt,
                    ).toLocaleString()}
                  </Text>
                )}
                {admin?.role === "owner" &&
                  query.data.user.ageEligibilityRejectedAt && (
                    <AgeReview user={query.data.user} />
                  )}
                {admin?.role === "owner" && (
                  <RoleManagement
                    key={`${userId}:${query.data.user.role}`}
                    user={query.data.user}
                    ownerId={admin.id}
                  />
                )}
                <ModerationForm
                  key={`${userId}:${query.data.user.accountStatus}:${query.data.user.moderatedAt}`}
                  user={query.data.user}
                />
                <Text style={styles.cardTitle}>Recent role changes</Text>
                {(query.data.roleHistory ?? []).length === 0 && (
                  <Text style={styles.text}>No role changes recorded.</Text>
                )}
                {(query.data.roleHistory ?? []).map((action) => (
                  <View key={action._id} style={styles.card}>
                    <Text style={styles.text}>
                      {action.previousRole.toUpperCase()} →{" "}
                      {action.role.toUpperCase()}
                    </Text>
                    <Text style={styles.text}>{action.reason}</Text>
                    <Text style={styles.text}>
                      {action.owner?.username ?? "Former owner"} ·{" "}
                      {new Date(action.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))}
                <Text style={styles.cardTitle}>Recent moderation history</Text>
                {query.data.history.length === 0 && (
                  <Text style={styles.text}>
                    No moderation actions recorded.
                  </Text>
                )}
                {query.data.history.map((action) => (
                  <View key={action._id} style={styles.card}>
                    <Text style={styles.text}>
                      {action.previousStatus.toUpperCase()} →{" "}
                      {action.status.toUpperCase()}
                    </Text>
                    <Text style={styles.text}>{action.reason}</Text>
                    <Text style={styles.text}>
                      {action.admin?.username ?? "Former administrator"} ·{" "}
                      {new Date(action.createdAt).toLocaleString()}
                    </Text>
                    {action.suspendedUntil && (
                      <Text style={styles.text}>
                        Scheduled lift:{" "}
                        {new Date(action.suspendedUntil).toLocaleString()}
                      </Text>
                    )}
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}
