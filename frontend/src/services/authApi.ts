import type { ApiResponse, AuthUser, LoginData } from "../types/auth";

const API_URL = "http://localhost:5000/api";

export const registerRequest = async (
  username: string,
  email: string,
  password: string
) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  });

  const result: ApiResponse<AuthUser> = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Kayıt başarısız.");
  }

  return result;
};

export const loginRequest = async (email: string, password: string) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const result: ApiResponse<LoginData> = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Giriş başarısız.");
  }

  return result;
};