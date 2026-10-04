import { factionAssessmentQuestions } from "../config/factionAssessment.js";
import BadRequestError from "../errors/BadRequestError.js";
import Faction from "../models/Faction.js";
import User from "../models/User.js";
import NotFoundError from "../errors/NotFoundError.js";
import ForbiddenError from "../errors/ForbiddenError.js";

export const calculateFactionAssessment = (answers) => {
  const scores = {
    helix: 0,
    aegis: 0,
    nova: 0,
    rally: 0,
  };

  for (const question of factionAssessmentQuestions) {
    const selectedOptionId = answers.find((answerId) =>
      answerId.startsWith(`${question.id}-`),
    );

    if (!selectedOptionId) {
      throw new BadRequestError(`Missing answer for question ${question.id}`);
    }

    const selectedOption = question.options.find(
      (option) => option.id === selectedOptionId,
    );

    if (!selectedOption) {
      throw new BadRequestError(`Invalid answer for question ${question.id}`);
    }
    scores[selectedOption.faction] += selectedOption.points;
  }

  const recommendedFaction = Object.entries(scores).reduce(
    (highest, current) => {
      if (current[1] > highest[1]) {
        return current;
      }
      return highest;
    },
  );

  return {
    scores,
    recommendedFaction: recommendedFaction[0],
  };
};

export const confirmFaction = async ({ userId, factionSlug }) => {
  const faction = await Faction.findOne({
    slug: factionSlug,
  });

  if (!faction) {
    throw new NotFoundError("Faction not found");
  }

  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      faction: null,
    },
    { faction: faction._id },
    { returnDocument: "after", runValidators: true },
  );

  if (!user) {
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      throw new NotFoundError("User not found");
    }
    throw new ForbiddenError("Faction already confirmed");
  }

  return {
    user,
    faction,
  };
};
