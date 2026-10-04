import { apiRequest } from "./client";
export const suggestionStatuses = ["new", "reviewing", "planned", "closed"] as const;
export type SuggestionStatus = typeof suggestionStatuses[number];
export type Suggestion = {
  _id: string; title: string; message: string; status: SuggestionStatus; revision: number;
  user: { _id: string; username: string; email: string } | null; createdAt: string;
};
export async function submitSuggestion(data: { title: string; message: string }): Promise<{ message: string }> {
  const response = await apiRequest("/suggestions", { method: "POST", body: JSON.stringify(data) });
  return response.json();
}
export async function getSuggestions(page: number, status: string): Promise<{
  suggestions: Suggestion[]; pagination: { page: number; total: number; totalPages: number };
}> {
  const params = new URLSearchParams({ page: String(page), limit: "20", status });
  const response = await apiRequest(`/owner/suggestions?${params}`);
  return response.json();
}
export async function updateSuggestion(id: string, status: SuggestionStatus, expectedRevision: number): Promise<{ suggestion: Suggestion }> {
  const response = await apiRequest(`/owner/suggestions/${id}`, {
    method: "PATCH", body: JSON.stringify({ status, expectedRevision }),
  });
  return response.json();
}
