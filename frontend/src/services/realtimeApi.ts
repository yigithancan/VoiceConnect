const API_URL = "/api/realtime";

export type RealtimeSession = {
  sessionId: string;
};

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

export type PublishRealtimeTracksPayload = {
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

type RealtimeSessionResponse = {
  success: boolean;
  message: string;
  data: RealtimeSession;
};

type PublishRealtimeTracksResponse = {
  success: boolean;
  message: string;

  data: {
    sessionDescription?: RealtimeSessionDescription;
    tracks?: unknown[];
  };
};

type CloseRealtimeTracksResponse = {
  success: boolean;
  message: string;

  data: {
    sessionDescription?: RealtimeSessionDescription;
    tracks?: unknown[];
  };
};

const getToken = () => {
  const token =
    localStorage.getItem(
      "voiceconnect_token"
    );

  if (!token) {
    throw new Error(
      "Oturum bilgisi bulunamadı."
    );
  }

  return token;
};

export const createRealtimeSessionRequest =
  async () => {
    const token = getToken();

    const response = await fetch(
      `${API_URL}/session`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",
        },
      }
    );

    const result =
      (await response.json()) as
        RealtimeSessionResponse;

    if (!response.ok) {
      throw new Error(
        result.message ||
          "Realtime session oluşturulamadı."
      );
    }

    return result.data;
  };

export const publishRealtimeTracksRequest =
  async (
    sessionId: string,
    payload: PublishRealtimeTracksPayload
  ) => {
    const token = getToken();

    const response = await fetch(
      `${API_URL}/session/${sessionId}/tracks`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(payload),
      }
    );

    const result =
      (await response.json()) as
        PublishRealtimeTracksResponse;

    if (!response.ok) {
      throw new Error(
        result.message ||
          "Realtime track işlemi başarısız."
      );
    }

    return result.data;
  };

export const closeRealtimeTracksRequest =
  async (
    sessionId: string,
    payload: CloseRealtimeTracksPayload
  ) => {
    const token = getToken();

    const response = await fetch(
      `${API_URL}/session/${sessionId}/tracks/close`,
      {
        method: "PUT",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(payload),
      }
    );

    const result =
      (await response.json()) as
        CloseRealtimeTracksResponse;

    if (!response.ok) {
      throw new Error(
        result.message ||
          "Realtime track kapatma işlemi başarısız."
      );
    }

    return result.data;
  };