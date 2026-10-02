import { Image, StyleSheet, View } from "react-native";

import {
  zenithEmblem,
  zenithNumerals,
  type ZenithNumeral,
} from "@/constants/zenith-assets";

type ZenithEmblemProps = {
  rank: number;
  size?: number;
};

export function ZenithEmblem({ rank, size = 300 }: ZenithEmblemProps) {
  const digits = String(rank).split("").map(Number) as ZenithNumeral[];

  const hasTwoDigits = digits.length === 2;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
      ]}
    >
      <Image source={zenithEmblem} style={styles.emblem} resizeMode="contain" />

      <View
        style={[
          styles.numeralContainer,
          {
            left: rank !== 1 && rank !== 4 ? "43.5%" : "42.5%",
          },
          hasTwoDigits ? styles.twoDigitContainer : null,
        ]}
      >
        {digits.map((digit, index) => (
          <Image
            key={`${digit}-${index}`}
            source={zenithNumerals[digit]}
            style={[
              styles.numeral,
              hasTwoDigits ? styles.twoDigitNumeral : null,
            ]}
            resizeMode="contain"
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },

  emblem: {
    width: "100%",
    height: "100%",
  },

  numeralContainer: {
    position: "absolute",
    width: "15%",
    height: "13%",

    top: "61%",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  twoDigitContainer: {
    width: "22%",
    left: "39%",
  },

  numeral: {
    width: "100%",
    height: "100%",
  },

  twoDigitNumeral: {
    width: "50%",
  },
});
