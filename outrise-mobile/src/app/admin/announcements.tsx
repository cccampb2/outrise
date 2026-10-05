import { useRef, useState } from "react";
import { Alert } from "react-native";
import { useSelector } from "react-redux";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RootState } from "@/store/store";
import { AppText as Text } from "@/components/app-text";
import {
  AdminField,
  adminAchievementStyles as styles,
} from "@/components/admin-achievement-ui";
import {
  AdminPage,
  AdminButton,
  AdminPagination,
  AdminQueryState,
  adminError,
} from "@/components/admin-content-ui";
import { SystemMessageCard } from "@/components/system-message-card";
import {
  getOwnerSystemMessages,
  publishSystemMessage,
  type AnnouncementInput,
} from "@/api/system-messages";

export default function AdminAnnouncementsScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const owner = user?.role === "owner";
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [validationError, setValidationError] = useState("");
  const [publishedTitle, setPublishedTitle] = useState("");
  const attempt = useRef<AnnouncementInput | null>(null);
  const busy = useRef(false);
  const query = useQuery({
    queryKey: ["owner-system-messages", user?.id, page],
    queryFn: () => getOwnerSystemMessages(page),
    enabled: owner,
  });
  const mutation = useMutation({
    mutationFn: publishSystemMessage,
    retry: false,
    onSuccess: async (result) => {
      attempt.current = null;
      setPublishedTitle(result.systemMessage.title);
      setTitle("");
      setText("");
      setPage(1);
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["owner-system-messages", user?.id],
        }),
        client.invalidateQueries({ queryKey: ["system-messages", user?.id] }),
        client.invalidateQueries({ queryKey: ["notifications", user?.id] }),
        client.invalidateQueries({ queryKey: ["conversations", user?.id] }),
      ]);
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const publish = () => {
    if (busy.current || !owner) return;
    setValidationError("");
    setPublishedTitle("");
    const trimmedTitle = title.trim();
    const trimmedText = text.trim();
    if (
      !trimmedTitle ||
      trimmedTitle.length > 120 ||
      !trimmedText ||
      trimmedText.length > 4000
    ) {
      setValidationError(
        "Add a title of 1–120 characters and a message of 1–4,000 characters.",
      );
      return;
    }
    if (
      attempt.current?.title !== trimmedTitle ||
      attempt.current?.text !== trimmedText
    ) {
      attempt.current = {
        title: trimmedTitle,
        text: trimmedText,
        idempotencyKey: `announcement:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}:${Math.random().toString(36).slice(2)}`,
      };
    }
    const input = attempt.current;
    busy.current = true;
    Alert.alert(
      "Publish announcement?",
      `“${input.title}” will be sent to all current Outrise members. Published announcements cannot be edited.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            busy.current = false;
          },
        },
        { text: "Publish", onPress: () => mutation.mutate(input) },
      ],
      { cancelable: false },
    );
  };
  return (
    <AdminPage title="ANNOUNCEMENTS" busy={mutation.isPending}>
      {!owner ? (
        <Text style={styles.error}>
          Only the owner can publish announcements.
        </Text>
      ) : (
        <>
          <Text style={styles.text}>
            Send an official update to every current member’s Outrise inbox and
            notifications.
          </Text>
          <AdminField
            label={`TITLE (${title.length}/120)`}
            value={title}
            onChange={setTitle}
            disabled={mutation.isPending}
          />
          <AdminField
            label={`MESSAGE (${text.length}/4,000)`}
            value={text}
            onChange={setText}
            multiline
            disabled={mutation.isPending}
          />
          {validationError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {validationError}
            </Text>
          )}
          {mutation.isError && (
            <Text accessibilityRole="alert" style={styles.error}>
              {adminError(mutation.error)} Your draft is kept so you can retry.
            </Text>
          )}
          {publishedTitle && (
            <Text accessibilityRole="alert" style={styles.text}>
              Published: {publishedTitle}
            </Text>
          )}
          <AdminButton
            label={
              mutation.isPending
                ? "PUBLISHING…"
                : mutation.isError
                  ? "RETRY PUBLISH"
                  : "PUBLISH ANNOUNCEMENT"
            }
            disabled={mutation.isPending || !title.trim() || !text.trim()}
            onPress={publish}
          />
          <Text style={styles.cardTitle}>Published announcements</Text>
          <AdminQueryState query={query} />
          {query.data && !query.isError && (
            <>
              {query.data.messages.length === 0 && (
                <Text style={styles.text}>No announcements published yet.</Text>
              )}
              {query.data.messages.map((message) => (
                <SystemMessageCard
                  key={message._id}
                  message={message}
                  showUnread={false}
                />
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
