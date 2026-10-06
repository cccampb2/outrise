import Suggestion from "../models/Suggestion.js";
import NotFoundError from "../errors/NotFoundError.js";
import ConflictError from "../errors/ConflictError.js";

export const createSuggestion = async ({ userId, title, message }) => {
  const suggestion = await Suggestion.create({ user: userId, title, message });
  return suggestion;
};

export const listSuggestions = async ({
  page = 1,
  limit = 20,
  status = "new",
}) => {
  const filter = status === "all" ? {} : { status };
  const [suggestions, total] = await Promise.all([
    Suggestion.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username email")
      .lean(),
    Suggestion.countDocuments(filter),
  ]);
  return {
    suggestions,
    pagination: { page, total, totalPages: Math.ceil(total / limit) },
  };
};

export const updateSuggestion = async ({
  suggestionId,
  status,
  expectedRevision,
}) => {
  const suggestion = await Suggestion.findOneAndUpdate(
    { _id: suggestionId, revision: expectedRevision },
    {
      $set: { status, closedAt: status === "closed" ? new Date() : null },
      $inc: { revision: 1 },
    },
    { returnDocument: "after", runValidators: true },
  )
    .populate("user", "username email")
    .lean();
  if (!suggestion) {
    const existingSuggestion = await Suggestion.exists({ _id: suggestionId });
    if (!existingSuggestion) {
      throw new NotFoundError("Suggestion not found");
    }
    throw new ConflictError(
      "This suggestion changed. Refresh before saving again.",
    );
  }
  return suggestion;
};
