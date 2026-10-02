import { BrandHeader } from "@/components/brand-header";
import { AppText as Text } from "@/components/app-text";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { getFactions, type Faction } from "@/api/factions";
import { Screen } from "@/components/screen";
import { Colors, Fonts } from "@/constants/theme";
import { factionEmblems } from "@/constants/faction-assets";
import { setSelectedFaction } from "@/store/onboarding-slice";
import type { AppDispatch, RootState } from "@/store/store";

export default function FactionSelectionScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { recommendedFaction, selectedFaction } = useSelector((state: RootState) => state.onboarding);
  const query = useQuery({ queryKey: ["factions"], queryFn: getFactions });

  function selectFaction(faction: Faction) {
    dispatch(setSelectedFaction(faction));
    if (router.canGoBack()) router.back();
    else router.replace("/(onboarding)/reveal");
  }

  return (
    <Screen scroll>
      <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/(onboarding)/reveal")} style={styles.back}><Text style={styles.backText}>← BACK</Text></Pressable>
      <BrandHeader label="FACTION_SELECTION" style={styles.brandLabelLayout} />
      <Text style={styles.title}>CHOOSE YOUR FACTION</Text>
      <Text style={styles.description}>Your assessment recommends a faction. You can choose any faction before confirming. Once confirmed, your allegiance is permanent.</Text>
      {query.isPending ? <ActivityIndicator color={Colors.dark.accent} style={styles.state} /> : query.isError ? <View style={styles.state}><Text style={styles.description}>Unable to load factions.</Text><Pressable accessibilityRole="button" onPress={() => { void query.refetch(); }} style={styles.button}><Text style={styles.buttonText}>RETRY</Text></Pressable></View> : query.data.factions.length === 0 ? <Text style={styles.description}>No factions available.</Text> : query.data.factions.map((faction) => (
        <View key={faction._id} style={[styles.card, { borderColor: faction.colors.border }]}>
          <View style={styles.identity}>
            <Image source={factionEmblems[faction.slug]} style={styles.emblem} resizeMode="contain" />
            <View style={styles.identityText}>
              <Text style={[styles.name, { color: faction.colors.primary }]}>{faction.name.toUpperCase()}</Text>
              <Text style={styles.tagline}>{faction.tagline}</Text>
              {recommendedFaction?.slug === faction.slug && <Text style={styles.badge}>ASSESSMENT_RECOMMENDATION</Text>}
              {(selectedFaction ?? recommendedFaction)?.slug === faction.slug && <Text style={styles.badge}>CURRENT_SELECTION</Text>}
            </View>
          </View>
          <Text style={styles.description}>{faction.description}</Text>
          <Text style={styles.motto}>{faction.motto}</Text>
          <Text style={styles.values}>{faction.values.join(" // ")}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Select ${faction.name}`} onPress={() => selectFaction(faction)} style={({ pressed }) => [styles.button, { borderColor: faction.colors.primary }, pressed && styles.pressed]}><Text style={[styles.buttonText, { color: faction.colors.primary }]}>SELECT {faction.name.toUpperCase()} →</Text></Pressable>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandLabelLayout: {
    marginTop: 12,
  },

  back: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  backText: { color: Colors.dark.textSecondary, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  title: {
    fontFamily: Fonts.display, color: Colors.dark.text, fontSize: 24, fontWeight: "900", marginVertical: 12 },
  description: { color: Colors.dark.textSecondary, fontSize: 13, lineHeight: 20 },
  card: { borderWidth: 1, backgroundColor: Colors.dark.backgroundElement, padding: 16, marginTop: 20, gap: 12 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  identityText: { flex: 1, gap: 5 },
  emblem: { width: 64, height: 64 },
  name: {
    fontFamily: Fonts.display, fontSize: 22, fontWeight: "900", letterSpacing: 1.2 },
  tagline: { color: Colors.dark.text, fontSize: 12, lineHeight: 18 },
  badge: { color: Colors.dark.textTechnical, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  motto: { color: Colors.dark.text, fontSize: 12, fontStyle: "italic", lineHeight: 18 },
  values: { color: Colors.dark.textMuted, fontSize: 10, lineHeight: 16 },
  button: { minHeight: 48, borderWidth: 1, borderColor: Colors.dark.borderStrong, justifyContent: "center", alignItems: "center", marginTop: 4 },
  buttonText: { color: Colors.dark.accent, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  pressed: { opacity: 0.5 },
  state: { paddingVertical: 30, gap: 12 },
});
