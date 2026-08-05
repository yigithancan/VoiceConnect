export type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: string;
};

export type LoginData = {
  token: string;
  user: AuthUser;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};