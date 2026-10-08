import { File } from "expo-file-system";

import { apiRequest } from "./client";
import type { MeasurementType } from "./workout-sessions";

export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

export type VerificationMeasurementType = Exclude<MeasurementType, "intervals">;

export type VerificationPerformance = {
  reps?: number | null;
  weightLbs?: number | null;
  distanceMiles?: number | null;
  timeSeconds?: number | null;
};

export type VerificationProof = {
  type: "video";
  url: string;
  publicId: string;
};

export type VerificationUser = {
  _id: string;
  username: string;
};

export type VerificationExercise = {
  _id: string;
  name: string;
  slug?: string;
  measurementType: VerificationMeasurementType;
};

export type Verification = {
  _id: string;

  user: string | VerificationUser;

  exercise: string | VerificationExercise;

  measurementType: VerificationMeasurementType;

  performance: VerificationPerformance;

  proof: VerificationProof | null;

  proofDeletedAt: string | null;

  expiredAt: string | null;

  pendingExpiresAt: string | null;

  status: VerificationStatus;

  reviewedBy: string | null;

  reviewedAt: string | null;

  rejectionReason: string | null;

  createdAt: string;

  updatedAt: string;

  __v: number;
};

export type VerificationResponse = {
  verification: Verification;
};

export type VerificationListResponse = {
  verifications: Verification[];

  pagination: {
    page: number;
    limit: number;
    totalVerifications: number;
    totalPages: number;
  };
};

export type VerificationVideo = {
  uri: string;
  name: string;
  type: string;
};

export type CreateVerificationInput = {
  idempotencyKey: string;
  exerciseId: string;
  performance: VerificationPerformance;
  video: VerificationVideo;
};

export type RejectVerificationInput = {
  verificationId: string;
  rejectionReason: string;
};

/*
 * USER VERIFICATION REQUESTS
 */

export async function createVerification(
  input: CreateVerificationInput,
): Promise<VerificationResponse> {
  const formData = new FormData();

  formData.append("exercise", input.exerciseId);
  formData.append("idempotencyKey", input.idempotencyKey);

  formData.append("performance", JSON.stringify(input.performance));

  const videoFile = new File(input.video.uri);

  formData.append("proof", videoFile);

  const response = await apiRequest("/verifications", {
    method: "POST",
    body: formData,
  });

  return await response.json();
}

export async function getVerifications(
  page = 1,
  limit = 20,
  status?: VerificationStatus,
): Promise<VerificationListResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status) {
    searchParams.set("status", status);
  }

  const response = await apiRequest(
    `/verifications?${searchParams.toString()}`,
  );

  return await response.json();
}

export async function getVerification(
  verificationId: string,
): Promise<VerificationResponse> {
  const response = await apiRequest(`/verifications/${verificationId}`);

  return await response.json();
}

/*
 * ADMIN VERIFICATION REQUESTS
 */

export async function getAdminVerifications(
  page = 1,
  limit = 20,
  status?: VerificationStatus,
): Promise<VerificationListResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status) {
    searchParams.set("status", status);
  }

  const response = await apiRequest(
    `/verifications/admin?${searchParams.toString()}`,
  );

  return await response.json();
}

export async function getAdminVerification(
  verificationId: string,
): Promise<VerificationResponse> {
  const response = await apiRequest(`/verifications/admin/${verificationId}`);

  return await response.json();
}

export async function approveVerification(verificationId: string) {
  const response = await apiRequest(
    `/verifications/admin/${verificationId}/approve`,
    {
      method: "PATCH",
    },
  );

  return await response.json();
}

export async function rejectVerification(input: RejectVerificationInput) {
  const response = await apiRequest(
    `/verifications/admin/${input.verificationId}/reject`,
    {
      method: "PATCH",

      body: JSON.stringify({
        rejectionReason: input.rejectionReason,
      }),
    },
  );

  return await response.json();
}
