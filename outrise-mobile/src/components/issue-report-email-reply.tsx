import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useMutation } from "@tanstack/react-query";

import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-text";
import { adminAchievementStyles as styles } from "@/components/admin-achievement-ui";
import { ApiError } from "@/api/client";
import {
  retryIssueReportReply,
  sendIssueReportReply,
  type IssueReportDetail,
  type IssueReportReplyInput,
} from "@/api/issue-reports";

type Props = {
  report: IssueReportDetail["report"];
  onUpdated: (report: IssueReportDetail["report"]) => Promise<void>;
  onRefresh: () => Promise<unknown>;
};

export function IssueReportEmailReply({ report, onUpdated, onRefresh }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [subject, setSubject] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState<IssueReportReplyInput | null>(null);
  const subjectValue = subject ?? `Re: ${report.subject}`.slice(0, 120);
  const sendMutation = useMutation({
    mutationFn: (data: IssueReportReplyInput) =>
      sendIssueReportReply(report._id, data),
    onSuccess: async ({ report: updated }) => {
      setAttempt(null);
      setSubject(null);
      setMessage("");
      await onUpdated(updated);
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        (error.status === 400 ||
          error.status === 503 ||
          (error.status === 409 &&
            error.message.startsWith("Another administrator")))
      )
        setAttempt(null);
      void onRefresh();
    },
  });
  const retryMutation = useMutation({
    mutationFn: (replyId: string) => retryIssueReportReply(report._id, replyId),
    onSuccess: async ({ report: updated }) => {
      if (
        attempt &&
        updated.replies?.some(
          (reply) =>
            reply.status === "sent" &&
            reply.subject === attempt.subject &&
            reply.message === attempt.message,
        )
      ) {
        setAttempt(null);
        setSubject(null);
        setMessage("");
      }
      await onUpdated(updated);
    },
    onError: () => {
      void onRefresh();
    },
  });
  const busy = sendMutation.isPending || retryMutation.isPending;
  const replies = report.replies ?? [];
  const awaitingReply = replies.some((reply) => reply.status === "pending");
  const error = sendMutation.error || retryMutation.error;

  function send() {
    if (busy) return;
    const data = attempt ?? {
      subject: subjectValue.trim(),
      message: message.trim(),
      expectedRevision: report.revision,
    };
    setAttempt(data);
    retryMutation.reset();
    sendMutation.mutate(data);
  }

  function discard() {
    setAttempt(null);
    setSubject(null);
    setMessage("");
    sendMutation.reset();
    retryMutation.reset();
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Email the reporter</Text>
        <Text selectable style={styles.text}>
          To: {report.email}
        </Text>
        <Text style={styles.text}>
          Send a response to the email address on this report. Internal notes
          are kept private.
        </Text>
        <Text style={styles.label}>SUBJECT</Text>
        <TextInput
          accessibilityLabel="Email subject"
          value={subjectValue}
          onChangeText={setSubject}
          maxLength={120}
          editable={!busy && !attempt}
          style={styles.input}
        />
        <Text style={styles.label}>RESPONSE</Text>
        <TextInput
          accessibilityLabel="Email response"
          placeholder="Write your response to the reporter"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={2000}
          editable={!busy && !attempt}
          style={[styles.input, { minHeight: 160, textAlignVertical: "top" }]}
        />
        <Text style={styles.text}>{message.length}/2,000</Text>
        <View style={styles.choices}>
          <Pressable
            accessibilityRole="button"
            disabled={
              busy ||
              (!attempt && awaitingReply) ||
              !subjectValue.trim() ||
              !message.trim()
            }
            onPress={send}
            style={[
              styles.button,
              styles.selected,
              {
                opacity:
                  busy ||
                  (!attempt && awaitingReply) ||
                  !subjectValue.trim() ||
                  !message.trim()
                    ? 0.5
                    : 1,
              },
            ]}
          >
            <Text style={styles.action}>
              {sendMutation.isPending
                ? "SENDING EMAIL..."
                : attempt
                  ? "RETRY EMAIL"
                  : "SEND EMAIL"}
            </Text>
          </Pressable>
          {attempt && !busy && (
            <Pressable
              accessibilityRole="button"
              onPress={discard}
              style={styles.button}
            >
              <Text style={styles.action}>DISCARD DRAFT</Text>
            </Pressable>
          )}
        </View>
        {awaitingReply && !busy && (
          <Text style={styles.text}>
            A reply is awaiting confirmation. Check its email history before
            composing another.
          </Text>
        )}
        {sendMutation.isSuccess && (
          <Text style={styles.text}>
            Your response was accepted for sending.
          </Text>
        )}
        {retryMutation.isSuccess && (
          <Text style={styles.text}>The reply was confirmed as sent.</Text>
        )}
        {error && (
          <Text style={styles.error}>
            {error instanceof ApiError
              ? error.getDisplayMessage()
              : "The email's send status could not be confirmed. Retry the same reply."}
          </Text>
        )}
      </View>
      <Text style={styles.cardTitle}>Email history</Text>
      {replies.length === 0 && (
        <Text style={styles.text}>No email replies yet.</Text>
      )}
      {[...replies].reverse().map((reply) => {
        const retryExpired =
          now - new Date(reply.createdAt).getTime() >= 23 * 60 * 60 * 1000;
        return (
          <View key={reply._id} style={styles.card}>
            <Text style={styles.cardTitle}>{reply.subject}</Text>
            <Text style={styles.text}>
              {reply.status === "sent"
                ? "SENT"
                : reply.status === "pending"
                  ? "AWAITING CONFIRMATION"
                  : "NOT CONFIRMED"}{" "}
              · {new Date(reply.sentAt ?? reply.createdAt).toLocaleString()}
            </Text>
            <Text selectable style={styles.text}>
              To: {reply.to}
            </Text>
            <Text selectable style={styles.text}>
              {reply.message}
            </Text>
            <Text style={styles.text}>
              By {reply.admin?.username ?? "Former administrator"}
            </Text>
            {reply.error && <Text style={styles.error}>{reply.error}</Text>}
            {reply.status !== "sent" &&
              (retryExpired ? (
                <Text style={styles.text}>
                  Check this email in Resend before composing a new reply.
                </Text>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => {
                    sendMutation.reset();
                    retryMutation.mutate(reply._id);
                  }}
                  style={styles.button}
                >
                  <Text style={styles.action}>RETRY THIS REPLY</Text>
                </Pressable>
              ))}
          </View>
        );
      })}
    </>
  );
}
