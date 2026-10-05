import { useState } from "react";
import { View } from "react-native";
import { useSelector } from "react-redux";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RootState } from "@/store/store";
import {
  getSuggestions,
  updateSuggestion,
  suggestionStatuses,
  type SuggestionStatus,
} from "@/api/suggestions";
import { AppText as Text } from "@/components/app-text";
import {
  AdminPage,
  AdminButton,
  AdminPagination,
  AdminQueryState,
  adminError,
} from "@/components/admin-content-ui";
import {
  AdminChoices,
  adminAchievementStyles as styles,
} from "@/components/admin-achievement-ui";

export default function SuggestionsScreen() {
  const owner = useSelector(
    (state: RootState) => state.auth.user?.role === "owner",
  );
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("new");
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["owner-suggestions", page, status],
    queryFn: () => getSuggestions(page, status),
    enabled: owner,
  });
  const mutation = useMutation({
    mutationFn: ({
      id,
      status,
      revision,
    }: {
      id: string;
      status: SuggestionStatus;
      revision: number;
    }) => updateSuggestion(id, status, revision),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["owner-suggestions"] });
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: ["owner-suggestions"] });
    },
  });
  return (
    <AdminPage title="SUGGESTIONS" busy={mutation.isPending}>
      {!owner ? (
        <Text style={styles.error}>Only the owner can view suggestions.</Text>
      ) : (
        <>
          <Text style={styles.text}>
            Private feedback from Outrise members.
          </Text>
          <AdminChoices
            label="STATUS"
            options={["all", ...suggestionStatuses]}
            value={status}
            disabled={mutation.isPending}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
              mutation.reset();
            }}
          />
          <AdminQueryState query={query} />
          {mutation.isError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {adminError(mutation.error)}
            </Text>
          )}
          {query.data && !query.isError && (
            <>
              {query.data.suggestions.length === 0 && (
                <Text style={styles.text}>
                  No suggestions in this category yet.
                </Text>
              )}
              {query.data.suggestions.map((suggestion) => (
                <View key={suggestion._id} style={styles.card}>
                  <Text style={styles.cardTitle}>{suggestion.title}</Text>
                  <Text style={styles.text}>
                    {suggestion.user?.username ?? "Deleted account"} ·{" "}
                    {new Date(suggestion.createdAt).toLocaleDateString()}
                  </Text>
                  {suggestion.user?.email && (
                    <Text style={styles.text}>{suggestion.user.email}</Text>
                  )}
                  <Text style={styles.text}>{suggestion.message}</Text>
                  <Text style={styles.label}>
                    STATUS: {suggestion.status.toUpperCase()}
                  </Text>
                  <View style={styles.choices}>
                    {suggestionStatuses.map((nextStatus) => (
                      <AdminButton
                        key={nextStatus}
                        label={nextStatus.toUpperCase()}
                        disabled={
                          mutation.isPending || nextStatus === suggestion.status
                        }
                        onPress={() =>
                          mutation.mutate({
                            id: suggestion._id,
                            status: nextStatus,
                            revision: suggestion.revision,
                          })
                        }
                      />
                    ))}
                  </View>
                </View>
              ))}
              <AdminPagination
                page={page}
                totalPages={query.data.pagination.totalPages}
                busy={query.isFetching || mutation.isPending}
                onChange={setPage}
              />
            </>
          )}
        </>
      )}
    </AdminPage>
  );
}
