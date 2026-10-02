export const echelonEmblem = require("../../assets/images/echelons/echelon-emblem.png");

export const echelonNumerals = {
  1: require("../../assets/images/echelons/echelon-1.png"),
  2: require("../../assets/images/echelons/echelon-2.png"),
  3: require("../../assets/images/echelons/echelon-3.png"),
  4: require("../../assets/images/echelons/echelon-4.png"),
  5: require("../../assets/images/echelons/echelon-5.png"),
  6: require("../../assets/images/echelons/echelon-6.png"),
  7: require("../../assets/images/echelons/echelon-7.png"),
  8: require("../../assets/images/echelons/echelon-8.png"),
  9: require("../../assets/images/echelons/echelon-9.png"),
  10: require("../../assets/images/echelons/echelon-10.png"),
} as const;

export type EchelonNumber = keyof typeof echelonNumerals;
