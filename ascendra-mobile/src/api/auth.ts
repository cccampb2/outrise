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
  role: UserRole;
  faction: string | null;
};

type LoginResponse = {
  message: string;
  token: string;
  user: AuthUser;
};

type RegisterCredentials = {
  username: string;
  email: string;
  password: string;
};

type RegisterResponse = {
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    faction: string | null;
  };
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
