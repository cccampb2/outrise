import type { UserRole } from "@/constants/user-roles";
import { apiRequest } from "./client";

type LoginCredentials = {
  email: string;
  password: string;
};

type AuthUser = {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  ageEligibilityConfirmedAt: string | null;
  ageEligibilityRejectedAt?: string | null;
  legalAcceptanceRequired?: boolean;
  legalAcceptance?: {
    acceptedAt: string;
    termsVersion: string;
    privacyVersion: string;
  } | null;
  role: UserRole;
  faction: string | null;
};

type LoginResponse = {
  message: string;
  token: string;
  user: AuthUser;
};

type RegisterCredentials = {
  accepted: true;
  termsVersion: string;
  privacyVersion: string;
  age: number;
  username: string;
  email: string;
  password: string;
};

type RegisterResponse = {
  message: string;
  requestId: string;
  expiresInMinutes: number;
  resendAfterSeconds: number;
};

export async function login(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const response = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  return await response.json();
}

export async function register(
  credentials: RegisterCredentials,
): Promise<RegisterResponse> {
  const response = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  return await response.json();
}

type PasswordResetRequestResponse = {
  message: string;
  expiresInMinutes: number;
  resendAfterSeconds: number;
};

export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetRequestResponse> {
  const response = await apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return await response.json();
}

export async function resetPassword(credentials: {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  const response = await apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  return await response.json();
}

type EmailVerificationRequestResponse =
  | {
      message: string;
      emailVerified: false;
      expiresInMinutes: number;
      resendAfterSeconds: number;
    }
  | {
      message: string;
      emailVerified: true;
      alreadyVerified?: true;
    };

export async function requestEmailVerification(
  signal?: AbortSignal,
): Promise<EmailVerificationRequestResponse> {
  const response = await apiRequest("/auth/email-verification/request", {
    method: "POST",
    body: JSON.stringify({}),
    signal,
  });
  return await response.json();
}

export async function confirmEmailVerification(
  code: string,
  signal?: AbortSignal,
): Promise<{ message: string; emailVerified: true }> {
  const response = await apiRequest("/auth/email-verification/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
    signal,
  });
  return await response.json();
}

export async function confirmAgeEligibility(
  age: number,
  signal?: AbortSignal,
): Promise<{
  ageEligibilityConfirmedAt: string | null;
  ageEligibilityRejectedAt?: string | null;
  legalAcceptanceRequired?: boolean;
  legalAcceptance?: {
    acceptedAt: string;
    termsVersion: string;
    privacyVersion: string;
  } | null;
}> {
  const response = await apiRequest("/auth/age-eligibility", {
    method: "POST",
    body: JSON.stringify({ age }),
    signal,
  });
  return await response.json();
}

export async function resendRegistration(input: {
  requestId: string;
  email: string;
}): Promise<RegisterResponse> {
  const response = await apiRequest("/auth/register/resend", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return await response.json();
}
export async function confirmRegistration(
  input: { requestId: string; email: string; code: string },
  signal?: AbortSignal,
): Promise<{ token: string; user: AuthUser }> {
  const response = await apiRequest("/auth/register/confirm", {
    method: "POST",
    body: JSON.stringify(input),
    signal,
  });
  return await response.json();
}
