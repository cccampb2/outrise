import { getToken } from "@/storage/auth-storage";

export const API_URL = "http://192.168.1.144:3000";

export type ValidationErrorDetail = {
  segment: string;
  field: string;
  message: string;
};

export type AccountRestriction = {
  code: "ACCOUNT_SUSPENDED" | "ACCOUNT_BANNED";
  accountStatus: "suspended" | "banned";
  suspendedUntil: string | null;
  message: string;
};

const sessionExpiredListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void) {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

const legalAcceptanceListeners = new Set<() => void>();
export function onLegalAcceptanceRequired(listener: () => void) {
  legalAcceptanceListeners.add(listener);
  return () => {
    legalAcceptanceListeners.delete(listener);
  };
}

const ageEligibilityListeners = new Set<() => void>();

export function onAgeEligibilityRequired(listener: () => void) {
  ageEligibilityListeners.add(listener);
  return () => {
    ageEligibilityListeners.delete(listener);
  };
}

const emailVerificationListeners = new Set<() => void>();

export function onEmailVerificationRequired(listener: () => void) {
  emailVerificationListeners.add(listener);
  return () => {
    emailVerificationListeners.delete(listener);
  };
}

const restrictionListeners = new Set<
  (restriction: AccountRestriction) => void
>();

export function onAccountRestricted(
  listener: (restriction: AccountRestriction) => void,
) {
  restrictionListeners.add(listener);
  return () => {
    restrictionListeners.delete(listener);
  };
}

export function accountRestrictionMessage(restriction: AccountRestriction) {
  if (restriction.accountStatus !== "suspended" || !restriction.suspendedUntil)
    return restriction.message;
  return `${restriction.message} Your suspension will lift on ${new Date(restriction.suspendedUntil).toLocaleString(undefined, { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}.`;
}

export class ApiError extends Error {
  status: number;
  details?: ValidationErrorDetail[];
  accountRestriction?: AccountRestriction;
  code?: string;
  retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    details?: ValidationErrorDetail[],
    accountRestriction?: AccountRestriction,
    code?: string,
    retryAfterSeconds?: number,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.accountRestriction = accountRestriction;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
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
  const authenticatedEndpoint =
    !endpoint.startsWith("/auth/") ||
    endpoint.startsWith("/auth/email-verification/") ||
    endpoint === "/auth/age-eligibility" ||
    endpoint === "/auth/legal/accept";

  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json();
    const restriction: AccountRestriction | undefined = [
      "ACCOUNT_SUSPENDED",
      "ACCOUNT_BANNED",
    ].includes(data.code)
      ? {
          code: data.code,
          accountStatus: data.accountStatus,
          suspendedUntil: data.suspendedUntil ?? null,
          message: data.message,
        }
      : undefined;
    if (
      restriction &&
      token &&
      authenticatedEndpoint &&
      token === (await getToken())
    ) {
      restrictionListeners.forEach((listener) => listener(restriction));
    }

    if (
      ["SESSION_EXPIRED", "ACCOUNT_DELETION_PENDING"].includes(data.code) &&
      token &&
      authenticatedEndpoint &&
      token === (await getToken())
    ) {
      sessionExpiredListeners.forEach((listener) => listener());
    }

    if (
      data.code === "EMAIL_VERIFICATION_REQUIRED" &&
      token &&
      token === (await getToken())
    ) {
      emailVerificationListeners.forEach((listener) => listener());
    }

    if (
      data.code === "AGE_ELIGIBILITY_REQUIRED" &&
      token &&
      authenticatedEndpoint &&
      token === (await getToken())
    ) {
      ageEligibilityListeners.forEach((listener) => listener());
    }

    if (
      data.code === "LEGAL_ACCEPTANCE_REQUIRED" &&
      token &&
      authenticatedEndpoint &&
      token === (await getToken())
    )
      legalAcceptanceListeners.forEach((listener) => listener());

    const retryAfter = Number(
      data.retryAfterSeconds ?? response.headers.get("Retry-After"),
    );

    throw new ApiError(
      data.message || "Request failed",
      response.status,
      data.details,
      restriction,
      typeof data.code === "string" ? data.code : undefined,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    );
  }

  return response;
}
