import { Image, StyleSheet, View } from "react-native";

import {
  echelonEmblem,
  echelonNumerals,
  type EchelonNumber,
} from "@/constants/echelon-assets";

type EchelonEmblemProps = {
  echelon: EchelonNumber;
  size?: number;
};

export function EchelonEmblem({ echelon, size = 300 }: EchelonEmblemProps) {
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
      <Image
        source={echelonEmblem}
        style={styles.emblem}
        resizeMode="contain"
      />

      <Image
        source={echelonNumerals[echelon]}
        style={styles.numeral}
        resizeMode="contain"
      />
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

  numeral: {
    position: "absolute",
    width: "23%",
    height: "20%",
    left: "38.5%",
    top: "28.5%",
  },
});
