import type {
  ApiResponse,
  Category,
  Member,
  ServerInfo,
} from "../types/workspace";

const API_URL =
  "http://localhost:5000/api";

export type ServerRole =
  | "owner"
  | "admin"
  | "moderator"
  | "member";

type CreateChannelInput = {
  categoryId: number;
  name: string;
  type: string;
};

type CreatedChannel = {
  id: number;
  categoryId: number;
  name: string;
  type: string;
};

type CreateChannelResponse = {
  success: boolean;
  message?: string;
  data?: CreatedChannel;
};

type UpdateRoleResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    username: string;
    role: ServerRole;
  };
};

export const getServerInfo =
  async () => {
    const response =
      await fetch(
        `${API_URL}/workspace/server`
      );

    const result:
      ApiResponse<ServerInfo> =
      await response.json();

    return result.data;
  };

export const getCategories =
  async () => {
    const response =
      await fetch(
        `${API_URL}/workspace/categories`
      );

    const result:
      ApiResponse<Category[]> =
      await response.json();

    return result.data;
  };

export const getMembers =
  async () => {
    const response =
      await fetch(
        `${API_URL}/workspace/members`
      );

    const result:
      ApiResponse<Member[]> =
      await response.json();

    return result.data;
  };

/*
  ========================================
  ODA OLUŞTUR
  ========================================
*/
export const createChannel =
  async (
    input: CreateChannelInput
  ) => {
    const token =
      localStorage.getItem(
        "voiceconnect_token"
      );

    const response =
      await fetch(
        `${API_URL}/workspace/channels`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body:
            JSON.stringify(
              input
            ),
        }
      );

    const result:
      CreateChannelResponse =
      await response.json();

    if (
      !response.ok ||
      !result.success ||
      !result.data
    ) {
      throw new Error(
        result.message ||
          "Oda oluşturulamadı."
      );
    }

    return result.data;
  };

/*
  ========================================
  KULLANICI ROLÜ DEĞİŞTİR
  ========================================
*/
export const updateMemberRole =
  async (
    userId: number,
    role: ServerRole
  ) => {
    const token =
      localStorage.getItem(
        "voiceconnect_token"
      );

    if (!token) {
      throw new Error(
        "Oturum bulunamadı."
      );
    }

    const response =
      await fetch(
        `${API_URL}/workspace/members/${userId}/role`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            role,
          }),
        }
      );

    const result:
      UpdateRoleResponse =
      await response.json();

    if (
      !response.ok ||
      !result.success ||
      !result.data
    ) {
      throw new Error(
        result.message ||
          "Rol güncellenemedi."
      );
    }

    return result.data;
  };
  export type ChannelRole =
  | "owner"
  | "admin"
  | "moderator"
  | "member";

export type ChannelMember = {
  id: number;
  username: string;
  role: ChannelRole;
};

/*
  ODA ÜYELERİNİ GETİR
*/
export const getChannelMembers = async (
  channelId: number
) => {
  const token =
    localStorage.getItem(
      "voiceconnect_token"
    );

  const response = await fetch(
    `${API_URL}/workspace/channels/${channelId}/members`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();

  if (
    !response.ok ||
    !result.success
  ) {
    throw new Error(
      result.message ||
        "Oda üyeleri alınamadı."
    );
  }

  return result.data as ChannelMember[];
};

/*
  ODA İÇİ ROL DEĞİŞTİR
*/
export const updateChannelMemberRole =
  async (
    channelId: number,
    userId: number,
    role: ChannelRole
  ) => {
    const token =
      localStorage.getItem(
        "voiceconnect_token"
      );

    const response = await fetch(
      `${API_URL}/workspace/channels/${channelId}/members/${userId}/role`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          role,
        }),
      }
    );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result.message ||
          "Oda rolü güncellenemedi."
      );
    }

    return result.data;
  };