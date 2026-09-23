import {
  closeRealtimeTracksRequest,
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
  sessionId: string | null;
  peerConnection: RTCPeerConnection;

  /*
   * Aynı Cloudflare session üzerinde
   * iki SDP negotiation işleminin
   * aynı anda çalışmasını engeller.
   */
  negotiationQueue: Promise<void>;
};

export type PublishedCloudflareTrack = {
  location: "local";
  mid: string;
  trackName: string;
};

const waitForIceGatheringComplete = async (
  peerConnection: RTCPeerConnection,
  timeoutMs = 10000
) => {
  if (
    peerConnection.iceGatheringState ===
    "complete"
  ) {
    return;
  }

  await new Promise<void>((resolve) => {
    let finished = false;

    let timeoutId:
      | number
      | undefined;

    const cleanup = () => {
      peerConnection.removeEventListener(
        "icegatheringstatechange",
        handleIceGatheringStateChange
      );

      if (timeoutId !== undefined) {
        window.clearTimeout(
          timeoutId
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
          peerConnection.iceGatheringState ===
          "complete"
        ) {
          finish();
        }
      };

    peerConnection.addEventListener(
      "icegatheringstatechange",
      handleIceGatheringStateChange
    );

    timeoutId =
      window.setTimeout(
        finish,
        timeoutMs
      );
  });
};

/*
 * ------------------------------------------------
 * CLOUDFLARE MEDIA CONNECTION
 * ------------------------------------------------
 */

export const createCloudflareMediaConnection =
  async (): Promise<CloudflareMediaConnection> => {
    /*
     * Session'ı burada hemen oluşturmuyoruz.
     *
     * Önce browser tarafındaki
     * PeerConnection hazırlanıyor.
     *
     * Cloudflare session ilk publish
     * işlemine mümkün olduğunca yakın
     * oluşturulacak.
     */
    const peerConnection =
      new RTCPeerConnection(
        RTC_CONFIGURATION
      );

    return {
      sessionId: null,
      peerConnection,
      negotiationQueue:
        Promise.resolve(),
    };
  };

/*
 * ------------------------------------------------
 * TRACK PUBLISH
 * GERÇEK İŞLEM
 * ------------------------------------------------
 */

const publishCloudflareTracksNow =
  async (
    connection: CloudflareMediaConnection,
    tracks: MediaStreamTrack[]
  ): Promise<
    PublishedCloudflareTrack[]
  > => {
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
      peerConnection,
    } = connection;

    /*
     * Her local track için
     * sendonly transceiver oluştur.
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
     * Browser SDP offer oluşturur.
     */
    const offer =
      await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
      offer
    );

    /*
     * ICE candidate gathering'i bekle.
     *
     * Bazı ağlarda "complete" uzun
     * sürebildiği için timeout var.
     */
    await waitForIceGatheringComplete(
      peerConnection
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
     * Cloudflare'a gönderilecek
     * track bilgilerini hazırla.
     */
    const realtimeTracks:
      RealtimeTrack[] =
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
              trackName:
                senderTrack.id,
            };
          }
        );

    /*
     * İlk publish ise Cloudflare
     * session'ı şimdi oluştur.
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
     * Backend üzerinden:
     *
     * POST
     * /sessions/{sessionId}/tracks/new
     */
    const result =
      await publishRealtimeTracksRequest(
        sessionId,
        {
          sessionDescription: {
            type: "offer",
            sdp: localDescription.sdp,
          },

          tracks:
            realtimeTracks,
        }
      );

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

    if (
      answer.type !== "answer"
    ) {
      throw new Error(
        `Cloudflare beklenmeyen SDP tipi döndürdü: ${answer.type}`
      );
    }

    /*
     * Cloudflare SDP answer'ını uygula.
     */
    await peerConnection.setRemoteDescription(
      answer
    );

    return realtimeTracks.map(
      (track) => ({
        location: "local",
        mid: track.mid!,
        trackName:
          track.trackName,
      })
    );
  };

/*
 * ------------------------------------------------
 * TRACK PUBLISH
 * NEGOTIATION QUEUE
 * ------------------------------------------------
 */

export const publishCloudflareTracks =
  (
    connection:
      CloudflareMediaConnection,
    tracks: MediaStreamTrack[]
  ): Promise<
    PublishedCloudflareTrack[]
  > => {
    /*
     * Mikrofon, kamera ve ekran paylaşımı
     * hızlı açılırsa SDP işlemleri
     * birbirine girmesin.
     */
    const publishTask =
      connection.negotiationQueue.then(
        () =>
          publishCloudflareTracksNow(
            connection,
            tracks
          )
      );

    /*
     * Publish hata verse bile
     * queue kilitlenmemeli.
     */
    connection.negotiationQueue =
      publishTask.then(
        () => undefined,
        () => undefined
      );

    return publishTask;
  };

/*
 * ------------------------------------------------
 * TRACK KAPAT
 * GERÇEK İŞLEM
 * ------------------------------------------------
 */

const closeCloudflareTracksNow =
  async (
    connection:
      CloudflareMediaConnection,
    tracks:
      PublishedCloudflareTrack[]
  ): Promise<void> => {
    if (!connection.sessionId) {
      throw new Error(
        "Cloudflare session bulunamadı."
      );
    }

    if (tracks.length === 0) {
      return;
    }

    const {
      peerConnection,
      sessionId,
    } = connection;

    /*
     * Kapatacağımız Cloudflare track'lerinin
     * MID değerlerini önceden sakla.
     */
    const mids =
      tracks.map(
        (track) =>
          track.mid
      );

    /*
     * Aynı MID'lere sahip browser
     * transceiver'larını bul.
     */
    const transceivers =
      peerConnection
        .getTransceivers()
        .filter(
          (transceiver) =>
            transceiver.mid !==
              null &&
            mids.includes(
              transceiver.mid
            )
        );

    if (
      transceivers.length === 0
    ) {
      throw new Error(
        "Kapatılacak Cloudflare transceiver bulunamadı."
      );
    }

    /*
     * Cloudflare negotiated close akışında
     * ilgili transceiver önce durdurulur.
     *
     * MID değerlerini bundan önce
     * sakladığımız için kaybetmiyoruz.
     */
    transceivers.forEach(
      (transceiver) => {
        transceiver.stop();
      }
    );

    /*
     * Kapanan transceiver'ları içeren
     * yeni SDP offer oluştur.
     */
    const offer =
      await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
      offer
    );

    await waitForIceGatheringComplete(
      peerConnection
    );

    const localDescription =
      peerConnection.localDescription;

    if (
      !localDescription ||
      !localDescription.sdp
    ) {
      throw new Error(
        "Cloudflare track kapatma SDP offer'ı oluşturulamadı."
      );
    }

    /*
     * Backend üzerinden:
     *
     * PUT
     * /sessions/{sessionId}/tracks/close
     */
    const result =
      await closeRealtimeTracksRequest(
        sessionId,
        {
          tracks:
            mids.map(
              (mid) => ({
                mid,
              })
            ),

          sessionDescription: {
            type: "offer",
            sdp: localDescription.sdp,
          },

          force: false,
        }
      );

    const answer =
      result.sessionDescription;

    /*
     * force:false kullandığımız için
     * Cloudflare'ın SDP answer
     * döndürmesini bekliyoruz.
     */
    if (
      !answer ||
      !answer.sdp
    ) {
      throw new Error(
        "Cloudflare track kapatma SDP answer döndürmedi."
      );
    }

    if (
      answer.type !== "answer"
    ) {
      throw new Error(
        `Cloudflare track kapatma işleminde beklenmeyen SDP tipi döndü: ${answer.type}`
      );
    }

    /*
     * Close negotiation'ı tamamla.
     */
    await peerConnection.setRemoteDescription(
      answer
    );
  };

/*
 * ------------------------------------------------
 * TRACK KAPAT
 * NEGOTIATION QUEUE
 * ------------------------------------------------
 */

export const closeCloudflareTracks =
  (
    connection:
      CloudflareMediaConnection,
    tracks:
      PublishedCloudflareTrack[]
  ): Promise<void> => {
    /*
     * Close işlemini publish işlemleriyle
     * aynı queue'ya koyuyoruz.
     *
     * Böylece:
     *
     * publish
     * close
     * publish
     *
     * işlemleri aynı anda SDP değiştiremez.
     */
    const closeTask =
      connection.negotiationQueue.then(
        () =>
          closeCloudflareTracksNow(
            connection,
            tracks
          )
      );

    /*
     * Close hata verse bile
     * queue kilitlenmemeli.
     */
    connection.negotiationQueue =
      closeTask.then(
        () => undefined,
        () => undefined
      );

    return closeTask;
  };

/*
 * ------------------------------------------------
 * BÜTÜN CLOUDFLARE BAĞLANTISINI KAPAT
 * ------------------------------------------------
 */

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

    connection.sessionId =
      null;
  };