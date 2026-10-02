export const zenithEmblem = require("../../assets/images/zenith/zenith-emblem.png");

export const zenithNumerals = {
  0: require("../../assets/images/zenith/zenith-0.png"),
  1: require("../../assets/images/zenith/zenith-1.png"),
  2: require("../../assets/images/zenith/zenith-2.png"),
  3: require("../../assets/images/zenith/zenith-3.png"),
  4: require("../../assets/images/zenith/zenith-4.png"),
  5: require("../../assets/images/zenith/zenith-5.png"),
  6: require("../../assets/images/zenith/zenith-6.png"),
  7: require("../../assets/images/zenith/zenith-7.png"),
  8: require("../../assets/images/zenith/zenith-8.png"),
  9: require("../../assets/images/zenith/zenith-9.png"),
} as const;

export type ZenithNumeral = keyof typeof zenithNumerals;
