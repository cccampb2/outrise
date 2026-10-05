import {
  createSuggestion,
  listSuggestions,
  updateSuggestion,
} from "../services/suggestion.service.js";

export const createSuggestionController = async (req, res, next) => {
  try {
    await createSuggestion({
      userId: req.user.userId,
      title: req.body.title,
      message: req.body.message,
    });
    res.status(201).json({
      message:
        "Thanks for helping improve Outrise. Your suggestion has been sent to the developer.",
    });
  } catch (error) {
    next(error);
  }
};

export const listSuggestionsController = async (req, res, next) => {
  try {
    const result = await listSuggestions(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateSuggestionController = async (req, res, next) => {
  try {
    const suggestion = await updateSuggestion({
      suggestionId: req.params.suggestionId,
      ...req.body,
    });
    res.status(200).json({ suggestion });
  } catch (error) {
    next(error);
  }
};
