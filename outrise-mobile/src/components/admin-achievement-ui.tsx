import { AppText as Text, AppTextInput as TextInput } from "@/components/app-text";
import { Pressable, StyleSheet, View } from "react-native";
import { Colors, Fonts } from "@/constants/theme";

export const adminAchievementStyles = StyleSheet.create({
  page: { paddingTop: 8, paddingBottom: 32, gap: 16 },
  title: {
    fontFamily: Fonts.display, color: Colors.dark.text, fontSize: 24, fontWeight: "900" },
  text: { color: Colors.dark.textSecondary, fontSize: 12, lineHeight: 18 },
  label: {
    color: Colors.dark.textTechnical,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 8,
  },
  input: {
    color: Colors.dark.text,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    padding: 12,
    minHeight: 44,
  },
  card: {
    padding: 16,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
    gap: 10,
  },
  cardTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: "800" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.borderStrong,
  },
  selected: {
    borderColor: Colors.dark.accent,
    backgroundColor: Colors.dark.backgroundElement,
  },
  action: { color: Colors.dark.accent, fontWeight: "800", fontSize: 11 },
  error: { color: Colors.dark.danger, fontSize: 12 },
});
export function AdminField({
  label,
  value,
  onChange,
  numeric = false,
  multiline = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  multiline?: boolean;
  disabled?: boolean;
}) {
  return (
    <View>
      <Text style={adminAchievementStyles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={!disabled}
        style={adminAchievementStyles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        multiline={multiline}
      />
    </View>
  );
}
export function AdminChoices<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  disabled?: boolean;
  options: readonly T[];
  value: string;
  onChange: (value: T) => void;
}) {
  return (
    <View>
      <Text style={adminAchievementStyles.label}>{label}</Text>
      <View style={adminAchievementStyles.choices}>
        {options.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            disabled={disabled}
            accessibilityState={{ selected: option === value }}
            onPress={() => onChange(option)}
            style={[
              adminAchievementStyles.button,
              option === value && adminAchievementStyles.selected,
            ]}
          >
            <Text style={adminAchievementStyles.text}>
              {option.replaceAll("_", " ")}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
