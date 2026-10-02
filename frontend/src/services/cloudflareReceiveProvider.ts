import {
  createRealtimeSessionRequest,
  publishRealtimeTracksRequest,
  renegotiateRealtimeSessionRequest,
} from "./realtimeApi";

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.cloudflare.com:3478",
    },
  ],
};

export type RemoteCloudflarePublication = {
  publisherSessionId: string;
  trackName: string;
};

export type ReceivedCloudflareTrack = {
  publisherSessionId: string;
  trackName: string;
  mid: string;
  track: MediaStreamTrack;
};

export type CloudflareReceiveConnection = {
  sessionId: string | null;

  peerConnection:
    RTCPeerConnection;

  negotiationQueue:
    Promise<void>;

  publicationsByMid:
    Map<
      string,
      RemoteCloudflarePublication
    >;
};

type RemoteTrackHandler = (
  remoteTrack:
    ReceivedCloudflareTrack
) => void;

/*
 * ------------------------------------------------
 * ICE GATHERING
 * ------------------------------------------------
 */

const waitForIceGatheringComplete =
  async (
    peerConnection:
      RTCPeerConnection,
    timeoutMs = 3000
  ) => {
    /*
      ICE tamamen bittiyse direkt devam et.
    */
    if (
      peerConnection.iceGatheringState ===
      "complete"
    ) {
      return;
    }

    await new Promise<void>(
      (resolve) => {
        let finished = false;

        let timeoutId:
          | number
          | undefined;

        let candidateTimeoutId:
          | number
          | undefined;

        const cleanup = () => {
          peerConnection.removeEventListener(
            "icegatheringstatechange",
            handleIceGatheringStateChange
          );

          peerConnection.removeEventListener(
            "icecandidate",
            handleIceCandidate
          );

          if (
            timeoutId !== undefined
          ) {
            window.clearTimeout(
              timeoutId
            );
          }

          if (
            candidateTimeoutId !==
            undefined
          ) {
            window.clearTimeout(
              candidateTimeoutId
            );
          }
        };

        const finish = () => {
          if (finished) {
            return;
          }

          finished = true;

          cleanup();

          resolve();
        };

        const handleIceGatheringStateChange =
          () => {
            if (
              peerConnection
                .iceGatheringState ===
              "complete"
            ) {
              finish();
            }
          };

        const handleIceCandidate = (
          event: RTCPeerConnectionIceEvent
        ) => {
          /*
            Kullanılabilir bir candidate
            oluştuğunda uzun süre
            beklemeye gerek yok.

            Çok hızlı kesmeyip kısa bir
            süre daha candidate topluyoruz.
          */
          if (event.candidate) {
            if (
              candidateTimeoutId !==
              undefined
            ) {
              window.clearTimeout(
                candidateTimeoutId
              );
            }

            candidateTimeoutId =
              window.setTimeout(
                finish,
                250
              );
          }
        };

        peerConnection.addEventListener(
          "icegatheringstatechange",
          handleIceGatheringStateChange
        );

        peerConnection.addEventListener(
          "icecandidate",
          handleIceCandidate
        );

        /*
          En kötü ihtimalle 3 saniye
          sonra devam et.
        */
        timeoutId =
          window.setTimeout(
            finish,
            timeoutMs
          );
      }
    );
  };

/*
 * ------------------------------------------------
 * RECEIVE CONNECTION
 * ------------------------------------------------
 */

export const createCloudflareReceiveConnection =
  (
    onRemoteTrack:
      RemoteTrackHandler
  ): CloudflareReceiveConnection => {
    const peerConnection =
      new RTCPeerConnection(
        RTC_CONFIGURATION
      );

    const connection:
      CloudflareReceiveConnection = {
        sessionId: null,

        peerConnection,

        negotiationQueue:
          Promise.resolve(),

        publicationsByMid:
          new Map(),
      };

    /*
     * Cloudflare'dan remote medya
     * geldiğinde çalışır.
     */
    peerConnection.addEventListener(
      "track",
      (event) => {
        const mid =
          event.transceiver.mid;

        if (mid === null) {
          console.warn(
            "Cloudflare remote track MID bulunamadı."
          );

          return;
        }

        const publication =
          connection
            .publicationsByMid
            .get(mid);

        if (!publication) {
          console.warn(
            `Cloudflare MID ${mid} için publication bulunamadı.`
          );

          return;
        }

        onRemoteTrack({
          publisherSessionId:
            publication
              .publisherSessionId,

          trackName:
            publication.trackName,

          mid,

          track:
            event.track,
        });
      }
    );

    return connection;
  };

/*
 * ------------------------------------------------
 * REMOTE TRACK SUBSCRIBE
 * GERÇEK İŞLEM
 * ------------------------------------------------
 */

const subscribeCloudflareTrackNow =
  async (
    connection:
      CloudflareReceiveConnection,

    publication:
      RemoteCloudflarePublication
  ) => {
    const {
      peerConnection,
    } = connection;

    /*
     * Receiving session henüz yoksa,
     * ilk subscribe işlemine mümkün
     * olduğunca yakın oluştur.
     */
    if (!connection.sessionId) {
      const session =
        await createRealtimeSessionRequest();

      connection.sessionId =
        session.sessionId;
    }

    const sessionId =
      connection.sessionId;

    /*
     * Publisher'ın Cloudflare
     * session + trackName bilgisiyle
     * remote track'i iste.
     */
    const result =
      await publishRealtimeTracksRequest(
        sessionId,
        {
          tracks: [
            {
              location: "remote",

              sessionId:
                publication
                  .publisherSessionId,

              trackName:
                publication.trackName,
            },
          ],
        }
      );

    const trackResult =
      result.tracks?.[0];

    if (!trackResult) {
      throw new Error(
        "Cloudflare remote track sonucu döndürmedi."
      );
    }

    if (trackResult.errorCode) {
      throw new Error(
        trackResult.errorDescription ||
          `Cloudflare remote track hatası: ${trackResult.errorCode}`
      );
    }

    const mid =
      trackResult.mid;

    if (!mid) {
      throw new Error(
        "Cloudflare remote track MID döndürmedi."
      );
    }

    /*
     * ÖNEMLİ:
     *
     * setRemoteDescription çağrısı
     * track event'ini tetikleyebilir.
     *
     * Bu yüzden MID eşleşmesini
     * SDP offer uygulanmadan önce
     * kaydediyoruz.
     */
    connection
      .publicationsByMid
      .set(
        mid,
        publication
      );

    const offer =
      result.sessionDescription;

    if (
      !offer ||
      !offer.sdp
    ) {
      throw new Error(
        "Cloudflare remote track için SDP offer döndürmedi."
      );
    }

    if (
      offer.type !== "offer"
    ) {
      throw new Error(
        `Cloudflare remote track için beklenmeyen SDP tipi döndürdü: ${offer.type}`
      );
    }

    /*
     * Cloudflare SFU offer'ını
     * browser PeerConnection'a uygula.
     */
    await peerConnection
      .setRemoteDescription(
        offer
      );

    /*
     * Browser answer oluşturur.
     */
    const answer =
      await peerConnection
        .createAnswer();

    await peerConnection
      .setLocalDescription(
        answer
      );

    /*
     * Answer içindeki ICE
     * candidate'larını bekle.
     */
    await waitForIceGatheringComplete(
      peerConnection
    );

    const localDescription =
      peerConnection
        .localDescription;

    if (
      !localDescription ||
      !localDescription.sdp
    ) {
      throw new Error(
        "Cloudflare remote track SDP answer oluşturulamadı."
      );
    }

    /*
     * Browser'ın SDP answer'ını
     * backend üzerinden Cloudflare'a
     * gönder.
     */
    await renegotiateRealtimeSessionRequest(
      sessionId,
      {
        sessionDescription: {
          type: "answer",

          sdp:
            localDescription.sdp,
        },
      }
    );

    return {
      publisherSessionId:
        publication
          .publisherSessionId,

      trackName:
        publication.trackName,

      mid,
    };
  };

/*
 * ------------------------------------------------
 * REMOTE TRACK SUBSCRIBE
 * NEGOTIATION QUEUE
 * ------------------------------------------------
 */

export const subscribeCloudflareTrack =
  (
    connection:
      CloudflareReceiveConnection,

    publication:
      RemoteCloudflarePublication
  ) => {
    /*
     * Aynı receive session üzerinde
     * iki SDP işlemi aynı anda
     * çalışmasın.
     */
    const subscribeTask =
      connection
        .negotiationQueue
        .then(() =>
          subscribeCloudflareTrackNow(
            connection,
            publication
          )
        );

    /*
     * İşlem hata verse bile
     * queue kilitlenmesin.
     */
    connection.negotiationQueue =
      subscribeTask.then(
        () => undefined,
        () => undefined
      );

    return subscribeTask;
  };

/*
 * ------------------------------------------------
 * RECEIVE CONNECTION KAPAT
 * ------------------------------------------------
 */

export const closeCloudflareReceiveConnection =
  (
    connection:
      | CloudflareReceiveConnection
      | null
  ) => {
    if (!connection) {
      return;
    }

    connection.peerConnection
      .getReceivers()
      .forEach((receiver) => {
        receiver.track?.stop();
      });

    connection
      .publicationsByMid
      .clear();

    connection
      .peerConnection
      .close();

    connection.sessionId =
      null;
  };