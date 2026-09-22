import {
  createRealtimeSessionRequest,
  publishRealtimeTracksRequest,
  type RealtimeTrack,
} from "./realtimeApi";

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.cloudflare.com:3478",
    },
  ],
};

export type CloudflareMediaConnection = {
  sessionId: string;
  peerConnection: RTCPeerConnection;
};

export type PublishedCloudflareTrack = {
  location: "local";
  mid: string;
  trackName: string;
};

export const createCloudflareMediaConnection =
  async (): Promise<CloudflareMediaConnection> => {
    const session =
      await createRealtimeSessionRequest();

    const peerConnection =
      new RTCPeerConnection(
        RTC_CONFIGURATION
      );

    return {
      sessionId: session.sessionId,
      peerConnection,
    };
  };

export const publishCloudflareTracks =
  async (
    connection: CloudflareMediaConnection,
    tracks: MediaStreamTrack[]
  ): Promise<PublishedCloudflareTrack[]> => {
    if (!connection) {
      throw new Error(
        "Cloudflare medya bağlantısı bulunamadı."
      );
    }

    if (tracks.length === 0) {
      throw new Error(
        "Yayınlanacak medya track'i bulunamadı."
      );
    }

    const {
      sessionId,
      peerConnection,
    } = connection;

    /*
     * Cloudflare resmi örneğinde addTrack yerine
     * addTransceiver kullanılıyor.
     *
     * Böylece her medya track'i için:
     * - sender
     * - transceiver
     * - mid
     *
     * bilgisini kontrol edebiliyoruz.
     */
    const transceivers =
      tracks.map((track) =>
        peerConnection.addTransceiver(
          track,
          {
            direction: "sendonly",
          }
        )
      );

    /*
     * Local SDP offer oluştur.
     */
    const offer =
      await peerConnection.createOffer();

    /*
     * Offer'ı local description olarak uygula.
     *
     * Bu işlemden sonra transceiver.mid
     * değerleri atanmış olur.
     */
    await peerConnection.setLocalDescription(
      offer
    );

    const localDescription =
      peerConnection.localDescription;

    if (
      !localDescription ||
      !localDescription.sdp
    ) {
      throw new Error(
        "WebRTC local SDP offer oluşturulamadı."
      );
    }

    /*
     * Cloudflare'a göndereceğimiz
     * local track listesini hazırla.
     */
    const realtimeTracks: RealtimeTrack[] =
      transceivers.map(
        (transceiver) => {
          const senderTrack =
            transceiver.sender.track;

          const mid =
            transceiver.mid;

          if (!senderTrack) {
            throw new Error(
              "WebRTC sender track bulunamadı."
            );
          }

          if (mid === null) {
            throw new Error(
              "WebRTC transceiver MID oluşturulamadı."
            );
          }

          return {
            location: "local",
            mid,
            trackName: senderTrack.id,
          };
        }
      );

    /*
     * Backend üzerinden Cloudflare:
     *
     * POST
     * /sessions/{sessionId}/tracks/new
     *
     * çağrısını yap.
     */
    const result =
      await publishRealtimeTracksRequest(
        sessionId,
        {
          sessionDescription: {
            type: "offer",
            sdp: localDescription.sdp,
          },

          tracks: realtimeTracks,
        }
      );

    /*
     * Publish işleminde Cloudflare'ın
     * SDP answer dönmesi gerekiyor.
     */
    const answer =
      result.sessionDescription;

    if (
      !answer ||
      !answer.sdp
    ) {
      throw new Error(
        "Cloudflare SDP answer döndürmedi."
      );
    }

    if (answer.type !== "answer") {
      throw new Error(
        `Cloudflare beklenmeyen SDP tipi döndürdü: ${answer.type}`
      );
    }

    /*
     * Cloudflare'ın answer'ını
     * PeerConnection'a uygula.
     *
     * Bundan sonra browser ↔ Cloudflare SFU
     * WebRTC bağlantısı kurulmaya başlayacak.
     */
    await peerConnection.setRemoteDescription(
      answer
    );

    /*
     * Sonraki aşamada bu bilgiler
     * diğer kullanıcılara Socket.IO üzerinden
     * bildirilecek.
     */
    return realtimeTracks.map(
      (track) => ({
        location: "local",
        mid: track.mid!,
        trackName: track.trackName,
      })
    );
  };

export const closeCloudflareMediaConnection =
  (
    connection:
      | CloudflareMediaConnection
      | null
  ) => {
    if (!connection) {
      return;
    }

    connection.peerConnection
      .getSenders()
      .forEach((sender) => {
        sender.track?.stop();
      });

    connection.peerConnection
      .getReceivers()
      .forEach((receiver) => {
        receiver.track?.stop();
      });

    connection.peerConnection.close();
  };