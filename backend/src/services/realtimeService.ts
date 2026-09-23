import { env } from "../config/env";

const REALTIME_BASE_URL =
  "https://rtc.live.cloudflare.com/v1";

export type RealtimeSessionDescription = {
  type: "offer" | "answer";
  sdp: string;
};

export type RealtimeTrack = {
  location: "local" | "remote";
  mid?: string;
  trackName: string;
  sessionId?: string;
};

export type AddRealtimeTracksPayload = {
  sessionDescription?: RealtimeSessionDescription;
  tracks?: RealtimeTrack[];
  autoDiscover?: boolean;
};

export type CloseRealtimeTracksPayload = {
  tracks: {
    mid: string;
  }[];

  sessionDescription?: RealtimeSessionDescription;

  force?: boolean;
};

const getRealtimeConfig = () => {
  const appId =
    env.CLOUDFLARE_REALTIME_APP_ID;

  const appSecret =
    env.CLOUDFLARE_REALTIME_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "Cloudflare Realtime bilgileri eksik."
    );
  }

  return {
    appId,
    appSecret,
  };
};

const realtimeRequest = async (
  path: string,
  options: RequestInit
) => {
  const {
    appId,
    appSecret,
  } = getRealtimeConfig();

  const response = await fetch(
    `${REALTIME_BASE_URL}/apps/${appId}${path}`,
    {
      ...options,

      headers: {
        Authorization:
          `Bearer ${appSecret}`,

        "Content-Type":
          "application/json",

        ...options.headers,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Cloudflare Realtime API hatası:",
      data
    );

    throw new Error(
      `Cloudflare Realtime isteği başarısız: ${response.status}`
    );
  }

  return data;
};

export const createRealtimeSession =
  async () => {
    return realtimeRequest(
      "/sessions/new",
      {
        method: "POST",
      }
    );
  };

export const addRealtimeTracks =
  async (
    sessionId: string,
    payload: AddRealtimeTracksPayload
  ) => {
    if (!sessionId) {
      throw new Error(
        "Realtime session ID bulunamadı."
      );
    }

    return realtimeRequest(
      `/sessions/${sessionId}/tracks/new`,
      {
        method: "POST",

        body: JSON.stringify(payload),
      }
    );
  };
  export const closeRealtimeTracks =
  async (
    sessionId: string,
    payload: CloseRealtimeTracksPayload
  ) => {
    if (!sessionId) {
      throw new Error(
        "Realtime session ID bulunamadı."
      );
    }

    return realtimeRequest(
      `/sessions/${sessionId}/tracks/close`,
      {
        method: "PUT",

        body: JSON.stringify(payload),
      }
    );
  };