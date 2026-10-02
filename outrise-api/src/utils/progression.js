import {
  ECHELON_LEVEL_BANDS,
  ECHELON_MILESTONES,
  LEVEL_BAND_SIZE,
  POST_CONFIGURED_START_XP,
  POST_CONFIGURED_BAND_INCREASE,
} from "../config/progression.js";

export const getXPRequiredForNextLevel = (currentLevel) => {
  if (!Number.isInteger(currentLevel) || currentLevel < 1) {
    throw new Error("Current level must be a positive whole number");
  }

  const configuredBand = ECHELON_LEVEL_BANDS.find(
    (levelBand) =>
      currentLevel >= levelBand.startLevel &&
      currentLevel <= levelBand.endLevel,
  );

  if (configuredBand) {
    const bandRange = configuredBand.endLevel - configuredBand.startLevel;

    const positionInBand = currentLevel - configuredBand.startLevel;

    const xpIncreasePerLevel =
      (configuredBand.endXP - configuredBand.startXP) / bandRange;

    const requiredXP =
      configuredBand.startXP + xpIncreasePerLevel * positionInBand;

    return Math.round(requiredXP);
  }

  const lastConfiguredBand =
    ECHELON_LEVEL_BANDS[ECHELON_LEVEL_BANDS.length - 1];

  if (!lastConfiguredBand) {
    throw new Error("No progression bands are configured");
  }
  const firstGeneratedLevel = lastConfiguredBand.endLevel + 1;

  const levelsPastConfigured = currentLevel - firstGeneratedLevel;

  const generatedBandIndex = Math.floor(levelsPastConfigured / LEVEL_BAND_SIZE);

  const generatedBandStartLevel =
    firstGeneratedLevel + generatedBandIndex * LEVEL_BAND_SIZE;

  const generatedBandStartXP =
    POST_CONFIGURED_START_XP +
    generatedBandIndex * POST_CONFIGURED_BAND_INCREASE;

  const generatedBandEndXP =
    generatedBandStartXP + POST_CONFIGURED_BAND_INCREASE;

  const positionInBand = currentLevel - generatedBandStartLevel;

  const bandRange = LEVEL_BAND_SIZE - 1;
  const xpIncreasePerLevel =
    (generatedBandEndXP - generatedBandStartXP) / bandRange;

  const requiredXP = generatedBandStartXP + xpIncreasePerLevel * positionInBand;

  return Math.round(requiredXP);
};

export const getEchelonForLevel = (level) => {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error("Level must be a positive whole number");
  }

  let earnedEchelon = null;

  for (let index = 0; index < ECHELON_MILESTONES.length; index += 1) {
    const milestoneLevel = ECHELON_MILESTONES[index];

    if (level >= milestoneLevel) {
      earnedEchelon = index + 1;
    } else {
      break;
    }
  }
  return earnedEchelon;
};

export const getProgressFromXP = (lifetimeXP) => {
  if (!Number.isInteger(lifetimeXP) || lifetimeXP < 0) {
    throw new Error("Lifetime XP must be a non-negative whole number");
  }

  let level = 1;
  let remainingXP = lifetimeXP;

  let xpRequiredForNextLevel = getXPRequiredForNextLevel(level);

  while (remainingXP >= xpRequiredForNextLevel) {
    remainingXP -= xpRequiredForNextLevel;

    level += 1;

    xpRequiredForNextLevel = getXPRequiredForNextLevel(level);
  }

  const xpIntoCurrentLevel = remainingXP;

  const xpRemaining = xpRequiredForNextLevel - xpIntoCurrentLevel;

  const progressPercent = (xpIntoCurrentLevel / xpRequiredForNextLevel) * 100;

  const echelon = getEchelonForLevel(level);

  return {
    level,
    echelon,
    xpIntoCurrentLevel,
    xpRequiredForNextLevel,
    xpRemaining,
    progressPercent: Math.round(progressPercent * 100) / 100,
  };
};
