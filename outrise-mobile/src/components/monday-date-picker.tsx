import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { AppText as Text } from "@/components/app-text";
import { Colors } from "@/constants/theme";

const colors = Colors.dark;
const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function MondayDatePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const offset = (month.getDay() + 6) % 7;
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cells = Math.ceil((offset + count) / 7) * 7;
  function showCalendar() {
    if (value) {
      const [year, selectedMonth] = value.split("-").map(Number);
      setMonth(new Date(year, selectedMonth - 1, 1));
    }
    setOpen(true);
  }
  return (
    <View style={styles.field}>
      <Text style={styles.label}>START WEEK</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          value ? `Change start date, ${value}` : "Choose a Monday"
        }
        disabled={disabled}
        onPress={showCalendar}
        style={[styles.trigger, disabled && styles.disabled]}
      >
        <Text style={styles.text}>{value || "Choose a Monday"}</Text>
        <Text style={styles.text}>▦</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.calendar} accessibilityViewIsModal>
            <Text style={styles.title}>CHOOSE START WEEK</Text>
            <Text style={styles.hint}>
              Only Mondays can be selected · New York time
            </Text>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
                style={styles.arrow}
              >
                <Text style={styles.title}>‹</Text>
              </Pressable>
              <Text style={styles.text}>
                {month.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
                style={styles.arrow}
              >
                <Text style={styles.title}>›</Text>
              </Pressable>
            </View>
            <View style={styles.grid}>
              {weekdays.map((day) => (
                <View key={day} style={styles.cell}>
                  <Text style={styles.weekday}>{day}</Text>
                </View>
              ))}
              {Array.from({ length: cells }, (_, index) => {
                const day = index - offset + 1;
                if (day < 1 || day > count)
                  return <View key={index} style={styles.cell} />;
                const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const monday = index % 7 === 0;
                const selected = date === value;
                return (
                  <Pressable
                    key={index}
                    disabled={!monday || disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`${date}${monday ? ", Monday" : ", unavailable"}`}
                    accessibilityState={{
                      disabled: !monday || disabled,
                      selected,
                    }}
                    onPress={() => {
                      onChange(date);
                      setOpen(false);
                    }}
                    style={styles.cell}
                  >
                    <View
                      style={[
                        styles.day,
                        monday && styles.monday,
                        selected && styles.selected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.text,
                          !monday && styles.muted,
                          selected && styles.selectedText,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={styles.close}
            >
              <Text style={styles.text}>CANCEL</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { color: colors.textSecondary, fontSize: 13 },
  trigger: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundElement,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  disabled: { opacity: 0.5 },
  text: { color: colors.text, fontSize: 16 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 20,
  },
  calendar: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    padding: 16,
    backgroundColor: colors.backgroundElement,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  title: { color: colors.text, fontSize: 22 },
  hint: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  arrow: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.285714%",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  weekday: { color: colors.textSecondary, fontSize: 11 },
  day: {
    width: "90%",
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  monday: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundSelected,
  },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  selectedText: { color: "#FFFFFF" },
  muted: { color: colors.textDim },
  close: {
    minHeight: 48,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
