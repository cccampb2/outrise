import {
  checkLevelReachedAchievements,
  checkEchelonReachedAchievements,
} from "./achievement.service.js";

import { processEchelonRewards } from "./xp.service.js";

export const processProgressionAchievements = async ({
  userId,
  mongoSession = null,
}) => {
  const unlockedAchievements = [];

  const echelonRewards = [];

  let shouldCheckAgain = true;

  while (shouldCheckAgain) {
    shouldCheckAgain = false;

    const levelAchievements = await checkLevelReachedAchievements({
      userId,
      mongoSession,
    });

    unlockedAchievements.push(...levelAchievements);

    if (levelAchievements.length > 0) {
      shouldCheckAgain = true;
    }

    const newEchelonRewards = await processEchelonRewards({
      userId,
      mongoSession,
    });
    echelonRewards.push(...newEchelonRewards);

    if (newEchelonRewards.length > 0) {
      shouldCheckAgain = true;
    }

    const echelonAchievements = await checkEchelonReachedAchievements({
      userId,
      mongoSession,
    });

    unlockedAchievements.push(...echelonAchievements);

    if (echelonAchievements.length > 0) {
      shouldCheckAgain = true;
    }
  }

  return {
    unlockedAchievements,
    echelonRewards,
  };
};
