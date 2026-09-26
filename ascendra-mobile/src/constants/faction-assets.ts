import type { FactionSlug } from "@/api/factions";

export const factionEmblems: Record<FactionSlug, number> = {
  helix: require("../../assets/images/factions/emblem-helix.png"),
  aegis: require("../../assets/images/factions/emblem-aegis.png"),
  nova: require("../../assets/images/factions/emblem-nova.png"),
  rally: require("../../assets/images/factions/emblem-rally.png"),
};
