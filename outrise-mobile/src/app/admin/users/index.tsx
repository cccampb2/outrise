import { hasAdminAccess } from "@/constants/user-roles";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { AppText as Text } from "@/components/app-text";
import { Screen } from "@/components/screen";
import {
  AdminChoices,
  AdminField,
  adminAchievementStyles as styles,
} from "@/components/admin-achievement-ui";
import { accountStatuses, getAdminUsers } from "@/api/admin-users";
import { ApiError } from "@/api/client";
import type { RootState } from "@/store/store";

export default function AdminUsersScreen() {
  const admin = useSelector((state: RootState) => state.auth.user);
  const isAdmin = hasAdminAccess(admin?.role);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const query = useInfiniteQuery({
    queryKey: ["admin-users", admin?.id, appliedSearch, status],
    queryFn: ({ pageParam }) => getAdminUsers(pageParam, appliedSearch, status),
    initialPageParam: 1,
    getNextPageParam: (page) =>
      page.pagination.page < page.pagination.totalPages
        ? page.pagination.page + 1
        : undefined,
    enabled: isAdmin,
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (isAdmin) void refetch();
    }, [isAdmin, refetch]),
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
            <Text style={styles.title}>Account moderation</Text>
            <Text style={styles.text}>
              Review accounts, issue warnings, suspend access, or ban users.
              Reasons are visible only to administrators.
            </Text>
            <AdminField
              label="Search by username or email"
              value={search}
              onChange={setSearch}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setAppliedSearch(search.trim())}
              style={styles.button}
            >
              <Text style={styles.action}>SEARCH</Text>
            </Pressable>
            <AdminChoices
              label="Account status"
              options={["all", ...accountStatuses]}
              value={status}
              onChange={setStatus}
            />
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
                    : "Unable to load users."}{" "}
                  Tap to retry.
                </Text>
              </Pressable>
            )}
            {query.data?.pages[0]?.pagination.total === 0 && (
              <Text style={styles.text}>No accounts found.</Text>
            )}
            {query.data?.pages
              .flatMap((page) => page.users)
              .map((user) => (
                <Pressable
                  key={user._id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/admin/users/[userId]",
                      params: { userId: user._id },
                    })
                  }
                  style={styles.card}
                >
                  <Text style={styles.cardTitle}>{user.username}</Text>
                  <Text style={styles.text}>{user.email}</Text>
                  <Text style={styles.text}>
                    {user.accountStatus.toUpperCase()} ·{" "}
                    {user.role.toUpperCase()}
                  </Text>
                  {user.suspendedUntil && (
                    <Text style={styles.text}>
                      Lifts {new Date(user.suspendedUntil).toLocaleString()}
                    </Text>
                  )}
                  {user.moderationReason && (
                    <Text style={styles.text}>
                      Admin reason: {user.moderationReason}
                    </Text>
                  )}
                  <Text style={styles.action}>MANAGE ACCOUNT →</Text>
                </Pressable>
              ))}
            {query.hasNextPage && (
              <Pressable
                accessibilityRole="button"
                disabled={query.isFetching}
                onPress={() => {
                  void query.fetchNextPage();
                }}
                style={styles.button}
              >
                <Text style={styles.action}>
                  {query.isFetchingNextPage ? "LOADING..." : "VIEW MORE"}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}
