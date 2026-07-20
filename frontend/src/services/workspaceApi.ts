import type {
  ApiResponse,
  Category,
  Member,
  ServerInfo,
} from "../types/workspace";

const API_URL = "http://localhost:5000/api";

export const getServerInfo = async () => {
  const response = await fetch(`${API_URL}/workspace/server`);
  const result: ApiResponse<ServerInfo> = await response.json();

  return result.data;
};

export const getCategories = async () => {
  const response = await fetch(`${API_URL}/workspace/categories`);
  const result: ApiResponse<Category[]> = await response.json();

  return result.data;
};

export const getMembers = async () => {
  const response = await fetch(`${API_URL}/workspace/members`);
  const result: ApiResponse<Member[]> = await response.json();

  return result.data;
};