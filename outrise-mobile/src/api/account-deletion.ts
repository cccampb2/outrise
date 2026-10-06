import { apiRequest } from "./client";
export async function requestAccountDeletion(
  password: string,
  confirmation: string,
  signal?: AbortSignal,
): Promise<{ status: "pending" | "completed"; message: string }> {
  const response = await apiRequest("/users/me", {
    method: "DELETE",
    signal,
    body: JSON.stringify({ password, confirmation }),
  });
  return await response.json();
}
