import { BrandHeader } from "@/components/brand-header";
import { hasAdminAccess } from "@/constants/user-roles";
import { AppText as Text } from "@/components/app-text";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";

import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";

type RootState = {
  auth: {
    user: {
      role: string;
    } | null;
  };
};

type AdminOptionProps = {
  code: string;
  title: string;
  description: string;
  status?: string;
  disabled?: boolean;
  onPress?: () => void;
};

function AdminOption({
  code,
  title,
  description,
  status,
  disabled = false,
  onPress,
}: AdminOptionProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        disabled ? styles.optionDisabled : null,
        pressed && !disabled ? styles.optionPressed : null,
      ]}
    >
      <View style={styles.optionTop}>
        <Text style={styles.optionCode}>{code}</Text>

        {status ? (
          <Text
            style={[
              styles.optionStatus,
              disabled ? styles.optionStatusDisabled : null,
            ]}
          >
            {status}
          </Text>
        ) : null}
      </View>

      <Text style={styles.optionTitle}>{title}</Text>

      <Text style={styles.optionDescription}>{description}</Text>

      <View style={styles.optionBottom}>
        <View style={styles.optionLine} />

        <Text
          style={[
            styles.optionAction,
            disabled ? styles.optionActionDisabled : null,
          ]}
        >
          {disabled ? "NOT_AVAILABLE" : "OPEN →"}
        </Text>
      </View>
    </Pressable>
  );
}

export default function AdminScreen() {
  const user = useSelector((state: RootState) => state.auth.user);

  const isAdmin = hasAdminAccess(user?.role);

  if (!isAdmin) {
    return (
      <Screen>
        <View style={styles.denied}>
          <Text style={styles.deniedCode}>ACCESS // RESTRICTED</Text>

          <Text style={styles.deniedTitle}>ADMIN_ACCESS_REQUIRED</Text>

          <Text style={styles.deniedDescription}>
            This area is restricted to Outrise administrators.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.returnButton,
              pressed ? styles.optionPressed : null,
            ]}
          >
            <Text style={styles.returnText}>← RETURN</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.page}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? styles.optionPressed : null,
          ]}
        >
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        <View style={styles.header}>
          <BrandHeader label="ADMINISTRATION" style={styles.brandLabelLayout} />

          <Text style={styles.title}>ADMIN_CENTER</Text>

          <Text style={styles.subtitle}>
            SYSTEM_CONTROL // AUTHORIZED_ACCESS
          </Text>
        </View>

        <View style={styles.systemStatus}>
          <View>
            <Text style={styles.systemLabel}>ACCESS_LEVEL</Text>

            <Text style={styles.systemValue}>ADMINISTRATOR</Text>
          </View>

          <View style={styles.onlineStatus}>
            <View style={styles.onlineDot} />

            <Text style={styles.onlineText}>AUTHORIZED</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>ADMIN_TOOLS</Text>

            <Text style={styles.sectionSubtitle}>SYSTEM_MANAGEMENT</Text>
          </View>

          <Text style={styles.sectionNumber}>01</Text>
        </View>

        <View style={styles.options}>
          {user?.role === "owner" && <AdminOption code="OWNER" title="SUGGESTIONS"
            description="Read member suggestions in your private developer inbox." status="OWNER ONLY"
            onPress={() => router.push("/admin/suggestions")} />}
          <AdminOption
            code="SUPPORT"
            title="ISSUE_REPORTS"
            description="Review member issues and account appeals in a shared admin inbox."
            status="ACTIVE"
            onPress={() => router.push("/admin/issue-reports")}
          />
          <AdminOption
            code="USERS"
            title="ACCOUNT_MODERATION"
            description="Review users, flag accounts, suspend access, ban users, and restore accounts."
            status="ACTIVE"
            onPress={() => router.push("/admin/users")}
          />
          <AdminOption
            code="ACHIEVEMENT"
            title="ACHIEVEMENTS"
            description="Create and manage achievement rules, rewards, and availability."
            status="ACTIVE"
            onPress={() => router.push("/admin/achievements")}
          />
          <AdminOption
            code="VERIFY"
            title="VERIFICATIONS"
            description="Review submitted performance proof and approve or reject verification requests."
            status="ACTIVE"
            onPress={() => router.push("/admin/verifications")}
          />

          <AdminOption
            code="EXERCISE"
            title="EXERCISE_LIBRARY"
            description="Create, update, archive, and manage exercises available throughout Outrise."
            status="ACTIVE"
            onPress={() => router.push("/admin/exercises")}
          />

          <AdminOption
            code="WOTW"
            title="WORKOUT_OF_THE_WEEK"
            description="Manage weekly challenges, difficulty, scheduling, and workout configuration."
            status="ACTIVE"
            onPress={() => router.push("/admin/wotw")}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>OUTRISE // ADMIN_SYSTEM</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandLabelLayout: {
    marginBottom: 10,
  },

  page: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 28,
  },

  backButton: {
    alignSelf: "flex-start",
    minHeight: 34,
    justifyContent: "center",
    marginBottom: 14,
  },

  backText: {
    color: Colors.dark.textMuted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  header: {
    paddingBottom: 24,
  },

  title: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "900",
    letterSpacing: -0.7,
  },

  subtitle: {
    color: Colors.dark.textMuted,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: 9,
  },

  systemStatus: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },

  systemLabel: {
    color: Colors.dark.textTechnical,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 1,
  },

  systemValue: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 6,
  },

  onlineStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  onlineDot: {
    width: 5,
    height: 5,
    backgroundColor: Colors.dark.accent,
  },

  onlineText: {
    color: Colors.dark.textMuted,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 36,
    marginBottom: 12,
  },

  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  sectionSubtitle: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 5,
  },

  sectionNumber: {
    color: Colors.dark.borderStrong,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },

  options: {
    gap: 10,
  },

  option: {
    minHeight: 155,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    backgroundColor: Colors.dark.backgroundElement,
  },

  optionDisabled: {
    opacity: 0.48,
  },

  optionPressed: {
    opacity: 0.6,
  },

  optionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  optionCode: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  optionStatus: {
    color: Colors.dark.textSecondary,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  optionStatusDisabled: {
    color: Colors.dark.textDim,
  },

  optionTitle: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 16,
  },

  optionDescription: {
    color: Colors.dark.textMuted,
    fontSize: 9,
    lineHeight: 15,
    fontWeight: "500",
    marginTop: 8,
    maxWidth: 300,
  },

  optionBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },

  optionLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.borderSubtle,
  },

  optionAction: {
    color: Colors.dark.accent,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginLeft: 12,
  },

  optionActionDisabled: {
    color: Colors.dark.textDim,
  },

  denied: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 60,
  },

  deniedCode: {
    color: Colors.dark.danger,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  deniedTitle: {
    fontFamily: Fonts.display,
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12,
  },

  deniedDescription: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    lineHeight: 17,
    marginTop: 10,
  },

  returnButton: {
    alignSelf: "flex-start",
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 22,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },

  returnText: {
    color: Colors.dark.textSecondary,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1,
  },

  footer: {
    marginTop: 44,
    alignItems: "center",
  },

  footerLine: {
    width: 36,
    height: 1,
    backgroundColor: Colors.dark.borderStrong,
    marginBottom: 12,
  },

  footerText: {
    color: Colors.dark.textDim,
    fontSize: 6,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
