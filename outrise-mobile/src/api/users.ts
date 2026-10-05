import type { UserRole } from "@/constants/user-roles";
import { apiRequest } from "./client";
import type { FactionColors, FactionSlug } from "./factions";
import { File } from "expo-file-system";
import type { FriendshipRelationship } from "./friends";

export type UserProgression = {
  level: number;
  echelon: number | null;
  xpIntoCurrentLevel: number;
  xpRequiredForNextLevel: number;
  xpRemaining: number;
  progressPercent: number;
};

export type UserRanking = {
  globalRank: number | null;
  zenithRank: number | null;
};

export type AccountStatus = "active" | "flagged" | "suspended" | "banned";

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  accountStatus: AccountStatus;
  faction: string | null;
  lifetimeXP: number;
  totalWorkouts: number;
  createdAt: string;
  progression: UserProgression;
  ranking: UserRanking;
  firstName: string;
  lastName: string;
  nameVisibility: "public" | "friends" | "private";
  bio: string;
  profileImage: {
    url: string | null;
    publicId: string | null;
  };
};

export type PublicUserFaction = {
  _id: string;
  slug: FactionSlug;
  name: string;
  colors: FactionColors;
};

export type PublicUser = {
  relationship: FriendshipRelationship;
  id: string;
  username: string;
  role: UserRole;
  faction: PublicUserFaction | null;
  lifetimeXP: number;
  totalWorkouts: number;
  createdAt: string;
  progression: UserProgression;
  ranking: UserRanking;
  firstName: string | null;
  lastName: string | null;
  bio: string;
  profileImage: {
    url: string | null;
    publicId: string | null;
  };
};

export type PublicUserResponse = {
  user: PublicUser;
};

export type UserSearchProgression = {
  level: number;
  echelon: number | null;
};

export type UserSearchResult = {
  id: string;
  username: string;
  role: UserRole;
  faction: PublicUserFaction | null;
  lifetimeXP: number;
  progression: UserSearchProgression;
};

export type UserSearchResponse = {
  users: UserSearchResult[];
  pagination: {
    page: number;
    limit: number;
    totalUsers: number;
    totalPages: number;
  };
};

export type SearchUsersParams = {
  query: string;
  page?: number;
  limit?: number;
};

export async function getCurrentUser(
  signal?: AbortSignal,
): Promise<CurrentUser> {
  const response = await apiRequest("/users/me", { signal });

  return await response.json();
}

export async function getPublicUser(
  userId: string,
): Promise<PublicUserResponse> {
  const response = await apiRequest(`/users/${userId}`);

  return await response.json();
}

export async function searchUsers({
  query,
  page = 1,
  limit = 25,
}: SearchUsersParams): Promise<UserSearchResponse> {
  const searchParams = new URLSearchParams({
    query,
    page: String(page),
    limit: String(limit),
  });

  const response = await apiRequest(`/users/search?${searchParams.toString()}`);

  return await response.json();
}

export type UpdateProfileData = {
  firstName?: string;
  lastName?: string;
  nameVisibility?: "public" | "friends" | "private";
  bio?: string;
};

export async function updateProfile(
  data: UpdateProfileData,
): Promise<CurrentUser> {
  const response = await apiRequest("/users/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  return await response.json();
}

export type ProfileImageAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export async function updateProfileImage(
  image: ProfileImageAsset,
): Promise<CurrentUser> {
  const formData = new FormData();

  const file = new File(image.uri);

  formData.append("profileImage", file);

  const response = await apiRequest("/users/me/profile-image", {
    method: "PATCH",
    body: formData,
  });

  return await response.json();
}

export async function removeProfileImage(): Promise<CurrentUser> {
  const response = await apiRequest("/users/me/profile-image", {
    method: "DELETE",
  });

  return await response.json();
}
