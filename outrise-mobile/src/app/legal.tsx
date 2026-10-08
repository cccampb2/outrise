import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getLegalDocuments } from "@/api/legal";
import { AppText as Text } from "@/components/app-text";
import { Screen } from "@/components/screen";
import { LegalLinks } from "@/components/legal-acceptance";
import { Colors, Fonts } from "@/constants/theme";
export default function LegalScreen() {
  const { document } = useLocalSearchParams<{ document?: string }>();
  const query = useQuery({
    queryKey: ["legal-documents"],
    queryFn: getLegalDocuments,
    staleTime: 0,
  });
  const policy =
    document === "privacy" ? query.data?.privacy : query.data?.terms;
  return (
    <Screen scroll>
      <View style={styles.page}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/")
          }
          style={styles.back}
        >
          <Text style={styles.text}>← BACK</Text>
        </Pressable>
        <LegalLinks />
        {query.isPending && <ActivityIndicator color={Colors.dark.text} />}
        {query.isError && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void query.refetch();
            }}
            style={styles.back}
          >
            <Text style={styles.text}>
              Unable to load the documents. RETRY →
            </Text>
          </Pressable>
        )}
        {policy && (
          <>
            <Text style={styles.title}>{policy.title}</Text>
            <Text style={styles.text}>
              Effective {policy.effectiveDate} · Version {policy.version}
            </Text>
            {policy.sections.map((section, index) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.heading}>
                  {index + 1}. {section.title}
                </Text>
                <Text selectable style={styles.text}>
                  {section.body}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  page: { gap: 18, paddingBottom: 32 },
  back: { minHeight: 44, justifyContent: "center" },
  title: { fontFamily: Fonts.display, fontSize: 32, color: Colors.dark.text },
  heading: { fontSize: 18, color: Colors.dark.text, fontWeight: "700" },
  text: { fontSize: 14, lineHeight: 23, color: Colors.dark.textSecondary },
  section: { gap: 8 },
});
