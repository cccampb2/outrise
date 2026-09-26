const API_URL = "http://192.168.1.144:3000";
import { getToken } from "@/storage/auth-storage";

export type ValidationErrorDetail = {
  segment: string;
  field: string;
  message: string;
};

export class ApiError extends Error {
  status: number;
  details?: ValidationErrorDetail[];

  constructor(
    message: string,
    status: number,
    details?: ValidationErrorDetail[],
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  getDisplayMessage() {
    if (this.details && this.details.length > 0) {
      return this.details.map((detail) => detail.message).join("\n");
    }
    return this.message;
  }
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = await getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json();

    throw new ApiError(
      data.message || "Request failed",
      response.status,
      data.details,
    );
  }

  return response;
}
