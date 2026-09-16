import Faction from "../models/Faction.js";
import { factionAssessmentQuestions } from "../config/factionAssessment.js";
import {
  calculateFactionAssessment,
  confirmFaction,
} from "../services/faction.service.js";

export const getFactions = async (req, res, next) => {
  try {
    const factions = await Faction.find();

    res.status(200).json({
      factions,
    });
  } catch (error) {
    next(error);
  }
};

export const getFactionAssessment = (req, res, next) => {
  try {
    const questions = factionAssessmentQuestions.map((question) => {
      return {
        id: question.id,
        question: question.question,
        options: question.options.map((option) => {
          return {
            id: option.id,
            text: option.text,
          };
        }),
      };
    });
    res.status(200).json({
      questions,
    });
  } catch (error) {
    next(error);
  }
};

export const submitFactionAssessment = async (req, res, next) => {
  try {
    const { answers } = req.body;
    const result = calculateFactionAssessment(answers);

    res.status(200).json({
      scores: result.scores,
      recommendedFaction: result.recommendedFaction,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmUserFaction = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { factionSlug } = req.body;

    const result = await confirmFaction({
      userId,
      factionSlug,
    });

    res.status(200).json({
      message: "Faction confirmed successfully",

      faction: {
        id: result.faction._id,
        name: result.faction.name,
        slug: result.faction.slug,
      },
    });
  } catch (error) {
    next(error);
  }
};
