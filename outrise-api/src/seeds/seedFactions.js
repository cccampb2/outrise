import "dotenv/config";
import { connectDB } from "../config/db.js";
import Faction from "../models/Faction.js";
import logger from "../utils/logger.js";

const factions = [
  {
    // Human-readable faction name.

    name: "Helix",

    // URL-friendly identifier.

    slug: "helix",

    // Explain the faction's identity.

    description:
      "A faction built around growth, adaptation, discipline, and constant self-improvement.",

    // Store the faction's primary motto.

    motto: "Move. Adapt. Overcome. Evolve.",

    // Store the faction's secondary tagline.

    tagline: "Never Finished. Always Evolving.",

    // Store the faction's core values.

    values: ["Growth", "Adaptability", "Discipline", "Curiosity", "Mastery"],

    // Store the faction's UI color palette.

    colors: {
      primary: "#19E6C1",
      hover: "#4FFFE0",
      deep: "#0B8F7A",
      darkSurface: "#071C1A",
      border: "#24BFA5",
      glow: "#7CFFEA",
    },
  },

  {
    // Human-readable faction name.

    name: "Aegis",

    // URL-friendly identifier.

    slug: "aegis",

    // Explain the faction's identity.

    description:
      "A faction centered on resilience, discipline, integrity, and strength through consistency.",

    // Store the faction's primary motto.

    motto: "Protect. Endure. Elevate.",

    // Store the faction's secondary tagline.

    tagline: "Strength Through Stability.",

    // Store the faction's core values.

    values: [
      "Discipline",

      "Resilience",

      "Integrity",

      "Reliability",

      "Fortitude",
    ],

    // Store the faction's UI color palette.

    colors: {
      primary: "#D8A63C",

      hover: "#F5C75B",

      deep: "#8C671B",

      darkSurface: "#1B1710",

      border: "#B98B2E",

      glow: "#FFE29A",
    },
  },

  {
    // Human-readable faction name.

    name: "Nova",

    // URL-friendly identifier.

    slug: "nova",

    // Explain the faction's identity.

    description:
      "A faction driven by ambition, intensity, courage, and breakthrough performance.",

    // Store the faction's primary motto.

    motto: "Ignite. Progress. Transcend.",

    // Store the faction's secondary tagline.

    tagline: "Higher. Further. Brighter.",

    // Store the faction's core values.

    values: ["Ambition", "Courage", "Intensity", "Initiative", "Excellence"],

    // Store the faction's UI color palette.

    colors: {
      primary: "#FF7A18",

      hover: "#FF9D42",

      deep: "#B94A0B",

      darkSurface: "#211009",

      border: "#E86512",

      glow: "#FFC27A",
    },
  },

  {
    // Human-readable faction name.

    name: "Rally",

    // URL-friendly identifier.

    slug: "rally",

    // Explain the faction's identity.

    description:
      "A faction focused on unity, loyalty, accountability, and becoming stronger together.",

    // Store the faction's primary motto.

    motto: "Stronger Together.",

    // Store the faction's secondary tagline.

    tagline: "Train. Compete. Support. Belong.",

    // Store the faction's core values.

    values: [
      "Unity",

      "Loyalty",

      "Encouragement",

      "Accountability",

      "Camaraderie",
    ],

    // Store the faction's UI color palette.

    colors: {
      primary: "#27B9FF",

      hover: "#66D0FF",

      deep: "#126EAA",

      darkSurface: "#081825",

      border: "#2196D3",

      glow: "#9DE3FF",
    },
  },
];

const seedFactions = async () => {
  try {
    await connectDB();

    for (const factionData of factions) {
      await Faction.findOneAndUpdate({ slug: factionData.slug }, factionData, {
        upsert: true,
        runValidators: true,
        new: true,
      });
    }

    logger.info("Faction seeded successfully");

    process.exit(0);
  } catch (error) {
    logger.error("Faction seed failed", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

seedFactions();
