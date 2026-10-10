import { useEffect, useRef, useState } from "react";
import { socket } from "../services/socket";

import {
  createCloudflareMediaConnection,
  publishCloudflareTracks,
  closeCloudflareTracks,
  closeCloudflareMediaConnection,
  type CloudflareMediaConnection,
  type PublishedCloudflareTrack,
} from "../services/cloudflareMediaProvider";

import {
  createCloudflareReceiveConnection,
  subscribeCloudflareTrack,
  closeCloudflareReceiveConnection,
  type CloudflareReceiveConnection,
} from "../services/cloudflareReceiveProvider";

type MediaRoomProps = {
  username: string;

  // DashboardPage şu an bunu gönderdiği için
  // geriye uyumluluk amacıyla bırakıyoruz.
  remoteUsername?: string;
};

type ChannelUser = {
  socketId: string;
  username: string;
};

type RemoteMediaState = {
  connected: boolean;
  camera: boolean;
  microphone: boolean;
  screenSharing: boolean;
};

type RemoteMediaStates = Record<
  string,
  RemoteMediaState
>;

type RemoteStreams = Record<
  string,
  MediaStream
>;

const EMPTY_REMOTE_STATE: RemoteMediaState = {
  connected: false,
  camera: false,
  microphone: false,
  screenSharing: false,
};

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

type RemoteUserCardProps = {
  username: string;
  stream?: MediaStream;
  state: RemoteMediaState;
};

function RemoteUserCard({
  username,
  stream,
  state,
}: RemoteUserCardProps) {
  const videoRef =
  useRef<HTMLVideoElement | null>(null);

const audioRef =
  useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
  const videoElement =
    videoRef.current;

  const audioElement =
    audioRef.current;

  let retryAudioPlayback:
    (() => void) | null =
    null;

  const removeAudioRetryListeners =
    () => {
      if (!retryAudioPlayback) {
        return;
      }

      window.removeEventListener(
        "pointerdown",
        retryAudioPlayback
      );

      window.removeEventListener(
        "keydown",
        retryAudioPlayback
      );

      retryAudioPlayback =
        null;
    };

  /*
    Kamera / ekran görüntüsü.

    Video muted olduğu için
    uzaktaki mikrofon sesi buradan
    ikinci kez çalmaz.
  */
  if (videoElement) {
    videoElement.srcObject =
      stream ?? null;

    if (
      stream &&
      (state.camera ||
        state.screenSharing)
    ) {
      void videoElement
        .play()
        .catch((error) => {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Uzak video oynatılamadı:",
            error
          );
        });
    }
  }

  /*
    Mikrofon sesi ayrı audio
    elementinden oynatılıyor.
  */
  if (audioElement) {
    audioElement.srcObject =
      stream ?? null;

    if (
      stream &&
      state.microphone
    ) {
      void audioElement
        .play()
        .catch((error) => {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "NotAllowedError"
          ) {
            /*
              Tarayıcı otomatik sesi
              engellerse kullanıcının
              ilk tıklamasında tekrar dene.
            */
            retryAudioPlayback =
              () => {
                void audioElement
                  .play()
                  .catch(
                    (retryError) => {
                      console.error(
                        "Uzak ses tekrar oynatılamadı:",
                        retryError
                      );
                    }
                  );

                removeAudioRetryListeners();
              };

            window.addEventListener(
              "pointerdown",
              retryAudioPlayback
            );

            window.addEventListener(
              "keydown",
              retryAudioPlayback
            );

            return;
          }

          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Uzak ses oynatılamadı:",
            error
          );
        });
    } else {
      audioElement.pause();
    }
  }

  return () => {
    removeAudioRetryListeners();
  };
}, [
  stream,
  state.camera,
  state.microphone,
  state.screenSharing,
]);

  const shouldShowVideo =
    state.connected &&
    Boolean(stream) &&
    (state.camera ||
      state.screenSharing);

  return (
    <div className="rounded-xl bg-zinc-800 p-4">
      <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-lg bg-zinc-700">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${
            shouldShowVideo
              ? "block"
              : "hidden"
          }`}
        />

        <audio
  ref={audioRef}
  autoPlay
  className="hidden"
/>

        {!state.connected && (
          <span className="text-zinc-400">
            Bağlantı kuruluyor...
          </span>
        )}

        {state.connected &&
          !state.camera &&
          !state.screenSharing && (
            <span className="text-zinc-400">
              Kamera Kapalı
            </span>
          )}

        {state.connected &&
          state.screenSharing && (
            <span className="absolute left-3 top-3 rounded-full bg-orange-600 px-3 py-1 text-xs text-white">
              Ekran Paylaşıyor
            </span>
          )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">
            {username}
          </p>

          {state.connected && (
            <p className="mt-1 text-xs text-zinc-400">
              {state.microphone
                ? "Mikrofon Açık"
                : "Mikrofon Kapalı"}
            </p>
          )}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs ${
            state.connected
              ? "bg-green-600/20 text-green-300"
              : "bg-zinc-700 text-zinc-300"
          }`}
        >
          {state.connected
            ? "Bağlı"
            : "Bekleniyor"}
        </span>
      </div>
    </div>
  );
}

function MediaRoom({
  username,
}: MediaRoomProps) {
  const cameraVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const screenVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const localStreamRef =
    useRef<MediaStream | null>(null);

  const screenStreamRef =
    useRef<MediaStream | null>(null);
  
    const cloudflareConnectionRef =
  useRef<CloudflareMediaConnection | null>(
    null
  );

  const cloudflareMicConnectionRef =
  useRef<CloudflareMediaConnection | null>(
    null
  );

const cloudflareCameraConnectionRef =
  useRef<CloudflareMediaConnection | null>(
    null
  );

const cloudflareScreenConnectionRef =
  useRef<CloudflareMediaConnection | null>(
    null
  );

  const cloudflareMicTrackRef =
  useRef<PublishedCloudflareTrack | null>(
    null
  );

const cloudflareCameraTrackRef =
  useRef<PublishedCloudflareTrack | null>(
    null
  );

const cloudflareScreenTrackRef =
  useRef<PublishedCloudflareTrack | null>(
    null
  );
  const cloudflareReceiveConnectionRef =
  useRef<CloudflareReceiveConnection | null>(
    null
  );

  const cloudflareRemotePublicationMapRef =
  useRef<
    Map<
      string,
      {
        publisherSocketId: string;
        kind:
          | "microphone"
          | "camera"
          | "screen";
      }
    >
  >(new Map());

  const cloudflareRemoteTracksRef =
  useRef<
    Map<
      string,
      {
        microphone?: MediaStreamTrack;
        camera?: MediaStreamTrack;
        screen?: MediaStreamTrack;
      }
    >
  >(new Map());

  /*
    ARTIK TEK PEER YOK.

    Her Socket ID için ayrı bir
    RTCPeerConnection tutuyoruz.
  */
  const peerConnectionsRef =
    useRef<
      Map<string, RTCPeerConnection>
    >(new Map());

  const remoteStreamsRef =
    useRef<
      Map<string, MediaStream>
    >(new Map());

  const audioSendersRef =
    useRef<
      Map<string, RTCRtpSender>
    >(new Map());

  const videoSendersRef =
    useRef<
      Map<string, RTCRtpSender>
    >(new Map());

  const pendingIceCandidatesRef =
    useRef<
      Map<
        string,
        RTCIceCandidateInit[]
      >
    >(new Map());

  const isMicOpenRef =
    useRef(false);

  const isCameraOpenRef =
    useRef(false);

  const isScreenSharingRef =
    useRef(false);

  const [isMicOpen, setIsMicOpen] =
    useState(false);

  const [
    isCameraOpen,
    setIsCameraOpen,
  ] = useState(false);

  const [
    isScreenSharing,
    setIsScreenSharing,
  ] = useState(false);

  const [
    channelUsers,
    setChannelUsers,
  ] = useState<ChannelUser[]>([]);

  const [
    remoteStreams,
    setRemoteStreams,
  ] = useState<RemoteStreams>({});

  const [
    remoteMediaStates,
    setRemoteMediaStates,
  ] = useState<RemoteMediaStates>(
    {}
  );

  /*
    ------------------------------------------------
    YEREL MEDIA STREAM
    ------------------------------------------------
  */

  const getLocalStream = () => {
    if (!localStreamRef.current) {
      localStreamRef.current =
        new MediaStream();
    }

    return localStreamRef.current;
  };

  const showCameraStream = async (
    stream: MediaStream
  ) => {
    if (!cameraVideoRef.current) {
      return;
    }

    cameraVideoRef.current.srcObject =
      stream;

    try {
      await cameraVideoRef.current.play();
    } catch (error) {
      console.error(
        "Kamera videosu oynatılamadı:",
        error
      );
    }
  };

  /*
    ------------------------------------------------
    UZAK KULLANICI STATE
    ------------------------------------------------
  */

  const updateRemoteMediaState = (
    socketId: string,
    state: Partial<RemoteMediaState>
  ) => {
    setRemoteMediaStates(
      (previous) => ({
        ...previous,

        [socketId]: {
          ...EMPTY_REMOTE_STATE,
          ...previous[socketId],
          ...state,
        },
      })
    );
  };

  const rebuildCloudflareRemoteStream =
  (
    publisherSocketId: string
  ) => {
    const remoteTracks =
      cloudflareRemoteTracksRef.current.get(
        publisherSocketId
      );

    if (!remoteTracks) {
      return;
    }

    const selectedTracks:
      MediaStreamTrack[] = [];

    /*
      Mikrofon varsa her zaman stream'de
      tutuyoruz ki ses kaybolmasın.
    */
    if (
      remoteTracks.microphone &&
      remoteTracks.microphone.readyState ===
        "live"
    ) {
      selectedTracks.push(
        remoteTracks.microphone
      );
    }

    /*
      Ekran paylaşımı varsa kameradan
      öncelikli olarak ekranı göster.

      Ekran paylaşımı yoksa kameraya dön.
    */
    if (
      remoteTracks.screen &&
      remoteTracks.screen.readyState ===
        "live"
    ) {
      selectedTracks.push(
        remoteTracks.screen
      );
    } else if (
      remoteTracks.camera &&
      remoteTracks.camera.readyState ===
        "live"
    ) {
      selectedTracks.push(
        remoteTracks.camera
      );
    }

    const updatedStream =
      new MediaStream(
        selectedTracks
      );

    remoteStreamsRef.current.set(
      publisherSocketId,
      updatedStream
    );

    setRemoteStreams(
      (previous) => ({
        ...previous,

        [publisherSocketId]:
          updatedStream,
      })
    );
  };

  /*
    ------------------------------------------------
    MEDIA STATE SOCKET.IO
    ------------------------------------------------
  */

  const sendCurrentMediaState = (
    target: string
  ) => {
    socket.emit("media-state", {
      target,

      camera:
        isCameraOpenRef.current,

      microphone:
        isMicOpenRef.current,

      screenSharing:
        isScreenSharingRef.current,
    });
  };

  const sendCurrentMediaStateToAll =
    () => {
      peerConnectionsRef.current.forEach(
        (_peerConnection, socketId) => {
          sendCurrentMediaState(
            socketId
          );
        }
      );
    };

  /*
    ------------------------------------------------
    ICE
    ------------------------------------------------
  */

  const addPendingIceCandidate = (
    socketId: string,
    candidate: RTCIceCandidateInit
  ) => {
    const current =
      pendingIceCandidatesRef.current.get(
        socketId
      ) ?? [];

    current.push(candidate);

    pendingIceCandidatesRef.current.set(
      socketId,
      current
    );
  };

  const flushPendingIceCandidates =
    async (
      socketId: string,
      peerConnection: RTCPeerConnection
    ) => {
      const candidates =
        pendingIceCandidatesRef.current.get(
          socketId
        ) ?? [];

      for (const candidate of candidates) {
        try {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(
              candidate
            )
          );
        } catch (error) {
          console.error(
            "Bekleyen ICE candidate eklenemedi:",
            error
          );
        }
      }

      pendingIceCandidatesRef.current.delete(
        socketId
      );
    };

  /*
    ------------------------------------------------
    TEK BİR PEER BAĞLANTISINI KAPAT
    ------------------------------------------------
  */

  const closePeerConnection = (
    socketId: string
  ) => {
    const peerConnection =
      peerConnectionsRef.current.get(
        socketId
      );

    if (peerConnection) {
      peerConnection.onicecandidate =
        null;

      peerConnection.ontrack =
        null;

      peerConnection.onconnectionstatechange =
        null;

      peerConnection.close();
    }

    peerConnectionsRef.current.delete(
      socketId
    );

    audioSendersRef.current.delete(
      socketId
    );

    videoSendersRef.current.delete(
      socketId
    );

    pendingIceCandidatesRef.current.delete(
      socketId
    );

    const remoteStream =
      remoteStreamsRef.current.get(
        socketId
      );

    if (remoteStream) {
      remoteStream
        .getTracks()
        .forEach((track) => {
          track.stop();
        });
    }

    remoteStreamsRef.current.delete(
      socketId
    );

    setRemoteStreams(
      (previous) => {
        const next = {
          ...previous,
        };

        delete next[socketId];

        return next;
      }
    );

    setRemoteMediaStates(
      (previous) => {
        const next = {
          ...previous,
        };

        delete next[socketId];

        return next;
      }
    );
  };

  /*
    ------------------------------------------------
    BÜTÜN PEER BAĞLANTILARINI KAPAT
    ------------------------------------------------
  */

  const closeAllPeerConnections =
    () => {
      Array.from(
        peerConnectionsRef.current.keys()
      ).forEach((socketId) => {
        closePeerConnection(
          socketId
        );
      });
    };

  /*
    ------------------------------------------------
    PEER CONNECTION OLUŞTUR
    ------------------------------------------------
  */

  const createPeerConnection = (
    remoteSocketId: string
  ) => {
    const existing =
      peerConnectionsRef.current.get(
        remoteSocketId
      );

    if (existing) {
      return existing;
    }

    const peerConnection =
      new RTCPeerConnection(RTC_CONFIGURATION);

    peerConnectionsRef.current.set(
      remoteSocketId,
      peerConnection
    );

    /*
      Her kullanıcı için ayrı
      uzak MediaStream.
    */
    const remoteStream =
      new MediaStream();

    remoteStreamsRef.current.set(
      remoteSocketId,
      remoteStream
    );

    setRemoteStreams(
      (previous) => ({
        ...previous,

        [remoteSocketId]:
          remoteStream,
      })
    );

    updateRemoteMediaState(
      remoteSocketId,
      {
        connected: false,
      }
    );

    /*
      Mikrofon açıksa bu peer'e gönder.
    */
    const audioTrack =
      localStreamRef.current
        ?.getAudioTracks()[0];

    if (
      audioTrack &&
      audioTrack.readyState === "live"
    ) {
      const sender =
        peerConnection.addTrack(
          audioTrack,
          localStreamRef.current as MediaStream
        );

      audioSendersRef.current.set(
        remoteSocketId,
        sender
      );
    }

    /*
      Video olarak ekran paylaşımı
      açıksa ekranı, değilse kamerayı
      ekle.
    */
    const screenTrack =
      screenStreamRef.current
        ?.getVideoTracks()[0];

    const cameraTrack =
      localStreamRef.current
        ?.getVideoTracks()[0];

    if (
      isScreenSharingRef.current &&
      screenTrack &&
      screenTrack.readyState === "live"
    ) {
      const sender =
        peerConnection.addTrack(
          screenTrack,
          screenStreamRef.current as MediaStream
        );

      videoSendersRef.current.set(
        remoteSocketId,
        sender
      );
    } else if (
      cameraTrack &&
      cameraTrack.readyState === "live"
    ) {
      const sender =
        peerConnection.addTrack(
          cameraTrack,
          localStreamRef.current as MediaStream
        );

      videoSendersRef.current.set(
        remoteSocketId,
        sender
      );
    }

    /*
      ICE candidate oluşunca
      yalnızca ilgili kullanıcıya gönder.
    */
    peerConnection.onicecandidate = (
      event
    ) => {
      if (!event.candidate) {
        return;
      }

      socket.emit(
        "webrtc-ice-candidate",
        {
          target:
            remoteSocketId,

          candidate:
            event.candidate.toJSON(),
        }
      );
    };

    /*
      Karşı kullanıcıdan medya geldi.
    */
    /*
  Eski P2P bağlantısı şu an
  sadece geçiş sürecinde tutuluyor.

  Remote ses, kamera ve ekran
  artık Cloudflare SFU üzerinden
  alınacağı için P2P track'ini
  arayüze eklemiyoruz.
*/
peerConnection.ontrack = (
  event
) => {
  console.log(
    "P2P remote track yok sayıldı:",
    {
      remoteSocketId,
      kind: event.track.kind,
    }
  );
};

    peerConnection.onconnectionstatechange =
      () => {
        console.log(
          `WebRTC ${remoteSocketId}:`,
          peerConnection.connectionState
        );

        if (
          peerConnection.connectionState ===
          "connected"
        ) {
          updateRemoteMediaState(
            remoteSocketId,
            {
              connected: true,
            }
          );
        }

        if (
          peerConnection.connectionState ===
            "failed" ||
          peerConnection.connectionState ===
            "closed"
        ) {
          updateRemoteMediaState(
            remoteSocketId,
            {
              connected: false,
            }
          );
        }

        if (
          peerConnection.connectionState ===
          "disconnected"
        ) {
          updateRemoteMediaState(
            remoteSocketId,
            {
              connected: false,
            }
          );
        }
      };

    return peerConnection;
  };

  /*
    ------------------------------------------------
    OFFER
    ------------------------------------------------
  */

  
  /*
    ------------------------------------------------
    TEK PEER İÇİN YENİDEN GÖRÜŞME
    ------------------------------------------------
  */

  const renegotiatePeer = async (
    remoteSocketId: string
  ) => {
    const peerConnection =
      peerConnectionsRef.current.get(
        remoteSocketId
      );

    if (!peerConnection) {
      return;
    }

    if (
      peerConnection.signalingState !==
      "stable"
    ) {
      return;
    }

    try {
      const offer =
        await peerConnection.createOffer();

      await peerConnection.setLocalDescription(
        offer
      );

      socket.emit(
        "webrtc-offer",
        {
          target:
            remoteSocketId,

          offer,
        }
      );
    } catch (error) {
      console.error(
        `WebRTC yeniden görüşme hatası (${remoteSocketId}):`,
        error
      );
    }
  };

  /*
    ------------------------------------------------
    YENİ MİKROFON TRACK'İNİ
    BÜTÜN KULLANICILARA GÖNDER
    ------------------------------------------------
  */

  const sendAudioTrackToAllPeers =
    async (
      track: MediaStreamTrack,
      stream: MediaStream
    ) => {
      for (const [
        socketId,
        peerConnection,
      ] of peerConnectionsRef.current) {
        const sender =
          audioSendersRef.current.get(
            socketId
          );

        if (sender) {
          try {
            await sender.replaceTrack(
              track
            );
          } catch (error) {
            console.error(
              "Mikrofon track değiştirilemedi:",
              error
            );
          }

          continue;
        }

        const newSender =
          peerConnection.addTrack(
            track,
            stream
          );

        audioSendersRef.current.set(
          socketId,
          newSender
        );

        await renegotiatePeer(
          socketId
        );
      }
    };

  /*
    ------------------------------------------------
    KAMERA TRACK'İNİ
    BÜTÜN KULLANICILARA GÖNDER
    ------------------------------------------------
  */

  const sendCameraTrackToAllPeers =
    async (
      track: MediaStreamTrack,
      stream: MediaStream
    ) => {
      /*
        Ekran paylaşılıyorsa karşı
        tarafa ekran gitmeye devam etsin.
      */
      if (
        isScreenSharingRef.current
      ) {
        return;
      }

      for (const [
        socketId,
        peerConnection,
      ] of peerConnectionsRef.current) {
        const sender =
          videoSendersRef.current.get(
            socketId
          );

        if (sender) {
          try {
            await sender.replaceTrack(
              track
            );
          } catch (error) {
            console.error(
              "Kamera track değiştirilemedi:",
              error
            );
          }

          continue;
        }

        const newSender =
          peerConnection.addTrack(
            track,
            stream
          );

        videoSendersRef.current.set(
          socketId,
          newSender
        );

        await renegotiatePeer(
          socketId
        );
      }
    };

  /*
    ------------------------------------------------
    MİKROFON AÇ / KAPAT
    ------------------------------------------------
  */

  const toggleMic = async () => {
    try {
      const stream =
        getLocalStream();

      let audioTrack =
        stream.getAudioTracks()[0];

      if (
        !audioTrack ||
        audioTrack.readyState ===
          "ended"
      ) {
        if (audioTrack) {
          stream.removeTrack(
            audioTrack
          );
        }

        const microphoneStream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: true,
              video: false,
            }
          );

        audioTrack =
          microphoneStream.getAudioTracks()[0];

        if (!audioTrack) {
          throw new Error(
            "Mikrofon track'i oluşturulamadı."
          );
        }

        stream.addTrack(
          audioTrack
        );

        isMicOpenRef.current =
          true;

        setIsMicOpen(true);

        await sendAudioTrackToAllPeers(
  audioTrack,
  stream
);

/*
  Eski P2P sistemi şimdilik çalışmaya
  devam ediyor.

  Aynı mikrofon track'ini ayrıca
  Cloudflare Realtime SFU'ya yayınlıyoruz.
*/
try {
  if (!cloudflareMicConnectionRef.current) {
    cloudflareMicConnectionRef.current =
      await createCloudflareMediaConnection();
  }

  const publishedTracks =
    await publishCloudflareTracks(
      cloudflareMicConnectionRef.current,
      [audioTrack]
    );

  const publishedTrack =
    publishedTracks[0] ?? null;

  cloudflareMicTrackRef.current =
    publishedTrack;

  const publisherSessionId =
    cloudflareMicConnectionRef.current
      .sessionId;

if (
  publishedTrack &&
  publisherSessionId
) {
  socket.emit(
    "cloudflare-publication",
    {
      publisherSessionId,
      trackName:
        publishedTrack.trackName,
      kind: "microphone",
    }
  );

  console.log(
    "Cloudflare mikrofon yayın bilgisi Socket.IO ile gönderildi:",
    {
      publisherSessionId,
      trackName:
        publishedTrack.trackName,
    }
  );
}

console.log(
  "Cloudflare mikrofon yayını aktif:",
  publishedTracks
);
} catch (cloudflareError) {
  /*
    Cloudflare tarafında hata olsa bile
    mevcut P2P sistemini bozma.
  */
  console.error(
    "Cloudflare mikrofon yayını başlatılamadı:",
    cloudflareError
  );
}

sendCurrentMediaStateToAll();

return;
      }

      /*
  Mikrofon zaten açıksa artık sadece
  enabled=false yapmıyoruz.

  Cloudflare yayınını gerçekten
  kapatıyoruz ki karşı taraf da
  mikrofonun kapandığını bilsin.
*/
if (
  cloudflareMicConnectionRef.current
) {
  closeCloudflareMediaConnection(
    cloudflareMicConnectionRef.current
  );

  cloudflareMicConnectionRef.current =
    null;
}

if (
  cloudflareMicTrackRef.current
) {
  socket.emit(
    "cloudflare-publication-removed",
    {
      kind: "microphone",
    }
  );

  cloudflareMicTrackRef.current =
    null;
}

/*
  Local mikrofon track'ini de durdur.
  Bir sonraki Mikrofon Aç tıklamasında
  yeni track oluşturulacak.
*/
audioTrack.stop();

stream.removeTrack(
  audioTrack
);

isMicOpenRef.current =
  false;

setIsMicOpen(false);

console.log(
  "Cloudflare mikrofon yayını kapatıldı."
);
    } catch (error) {
      console.error(
        "Mikrofon açılamadı:",
        error
      );

      alert(
        "Mikrofon açılamadı. Tarayıcı iznini kontrol et."
      );
    }
  };

  /*
    ------------------------------------------------
    KAMERA AÇ / KAPAT
    ------------------------------------------------
  */

  const toggleCamera = async () => {
    try {
      const stream =
        getLocalStream();

      let videoTrack =
        stream.getVideoTracks()[0];

      if (
        !videoTrack ||
        videoTrack.readyState ===
          "ended"
      ) {
        if (videoTrack) {
          stream.removeTrack(
            videoTrack
          );
        }

        const cameraStream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: true,
              audio: false,
            }
          );

        videoTrack =
          cameraStream.getVideoTracks()[0];

        if (!videoTrack) {
          throw new Error(
            "Kamera track'i oluşturulamadı."
          );
        }

        stream.addTrack(
          videoTrack
        );

        isCameraOpenRef.current =
          true;

        setIsCameraOpen(true);

        await showCameraStream(
          stream
        );

        await sendCameraTrackToAllPeers(
  videoTrack,
  stream
);

/*
  Mevcut P2P kamera yayını korunuyor.

  Aynı kamera track'ini ayrıca
  Cloudflare Realtime SFU'ya yayınlıyoruz.
*/
try {
  if (!cloudflareCameraConnectionRef.current) {
    cloudflareCameraConnectionRef.current =
      await createCloudflareMediaConnection();
  }

  const publishedTracks =
    await publishCloudflareTracks(
      cloudflareCameraConnectionRef.current,
      [videoTrack]
    );

  const publishedTrack =
    publishedTracks[0] ?? null;

  cloudflareCameraTrackRef.current =
    publishedTrack;

  const publisherSessionId =
    cloudflareCameraConnectionRef.current
      .sessionId;

if (
  publishedTrack &&
  publisherSessionId
) {
  socket.emit(
    "cloudflare-publication",
    {
      publisherSessionId,
      trackName:
        publishedTrack.trackName,
      kind: "camera",
    }
  );

  console.log(
    "Cloudflare kamera yayın bilgisi Socket.IO ile gönderildi:",
    {
      publisherSessionId,
      trackName:
        publishedTrack.trackName,
    }
  );
}

console.log(
  "Cloudflare kamera yayını aktif:",
  publishedTracks
);
} catch (cloudflareError) {
  /*
    Cloudflare tarafında hata olsa bile
    mevcut P2P kamera sistemini bozma.
  */
  console.error(
    "Cloudflare kamera yayını başlatılamadı:",
    cloudflareError
  );
}

sendCurrentMediaStateToAll();

return;
      }

            /*
        Kamera açıksa artık sadece
        enabled=false yapmıyoruz.

        Cloudflare kamera yayınını
        gerçekten kapatıyoruz.
      */
      if (
  cloudflareCameraConnectionRef.current
) {
  closeCloudflareMediaConnection(
    cloudflareCameraConnectionRef.current
  );

  cloudflareCameraConnectionRef.current =
    null;
}

if (
  cloudflareCameraTrackRef.current
) {
  socket.emit(
    "cloudflare-publication-removed",
    {
      kind: "camera",
    }
  );

  cloudflareCameraTrackRef.current =
    null;
}

      /*
        Yerel kamera track'ini de
        tamamen durduruyoruz.
      */
      videoTrack.stop();

      stream.removeTrack(
        videoTrack
      );

      isCameraOpenRef.current =
        false;

      setIsCameraOpen(false);

      /*
        Kendi kamera önizlemesini de
        temizle.
      */
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject =
          null;
      }

      console.log(
        "Cloudflare kamera yayını kapatıldı."
      );
    } catch (error) {
      console.error(
        "Kamera açılamadı:",
        error
      );

      alert(
        "Kamera açılamadı. Tarayıcı iznini kontrol et."
      );
    }
  };

  /*
    ------------------------------------------------
    KAMERA + MİKROFONU TAMAMEN KAPAT
    ------------------------------------------------
  */

  const stopCameraAndMic =
  async () => {
    /*
      Bütün kullanıcılara giden
      mikrofon sender'larını kapat.
    */
    for (
      const sender of
      audioSendersRef.current.values()
    ) {
      try {
        await sender.replaceTrack(
          null
        );
      } catch (error) {
        console.error(
          "Mikrofon gönderimi durdurulamadı:",
          error
        );
      }
    }

    /*
      Medyayı tamamen kapattığımız için
      ekran/kamera fark etmeksizin bütün
      video sender'larını da kapat.
    */
    for (
      const sender of
      videoSendersRef.current.values()
    ) {
      try {
        await sender.replaceTrack(
          null
        );
      } catch (error) {
        console.error(
          "Video gönderimi durdurulamadı:",
          error
        );
      }
    }

    /*
      Mikrofon + kamera stream'ini kapat.
    */
    const localStream =
      localStreamRef.current;

    if (localStream) {
      localStream
        .getTracks()
        .forEach((track) => {
          track.stop();
        });
    }

    localStreamRef.current =
      null;

    /*
      Ekran paylaşımını da tamamen kapat.
    */
    const screenStream =
      screenStreamRef.current;

    if (screenStream) {
      screenStream
        .getTracks()
        .forEach((track) => {
          track.stop();
        });
    }

    screenStreamRef.current =
      null;

    /*
      Local state/ref'leri sıfırla.
    */
    isCameraOpenRef.current =
      false;

    isMicOpenRef.current =
      false;

    isScreenSharingRef.current =
      false;

    setIsCameraOpen(false);
    setIsMicOpen(false);
    setIsScreenSharing(false);

    /*
      Local preview'ları temizle.
    */
    if (
      cameraVideoRef.current
    ) {
      cameraVideoRef.current.srcObject =
        null;
    }

    if (
      screenVideoRef.current
    ) {
      screenVideoRef.current.srcObject =
        null;
    }

    /*
  Mikrofon, kamera ve ekran artık
  birbirinden bağımsız Cloudflare
  bağlantıları kullanıyor.

  Medyayı Kapat butonunda üçünü de
  ayrı ayrı tamamen kapatıyoruz.
*/
if (
  cloudflareMicConnectionRef.current
) {
  closeCloudflareMediaConnection(
    cloudflareMicConnectionRef.current
  );

  cloudflareMicConnectionRef.current =
    null;
}

if (
  cloudflareCameraConnectionRef.current
) {
  closeCloudflareMediaConnection(
    cloudflareCameraConnectionRef.current
  );

  cloudflareCameraConnectionRef.current =
    null;
}

if (
  cloudflareScreenConnectionRef.current
) {
  closeCloudflareMediaConnection(
    cloudflareScreenConnectionRef.current
  );

  cloudflareScreenConnectionRef.current =
    null;
}

/*
  Eski bağlantı ref'i hâlâ doluysa
  onu da güvenli şekilde kapat.
*/
if (
  cloudflareConnectionRef.current
) {
  closeCloudflareMediaConnection(
    cloudflareConnectionRef.current
  );

  cloudflareConnectionRef.current =
    null;
}

/*
  Karşı tarafa hangi yayınların
  kaldırıldığını bildir.
*/
if (
  cloudflareMicTrackRef.current
) {
  socket.emit(
    "cloudflare-publication-removed",
    {
      kind: "microphone",
    }
  );
}

if (
  cloudflareCameraTrackRef.current
) {
  socket.emit(
    "cloudflare-publication-removed",
    {
      kind: "camera",
    }
  );
}

if (
  cloudflareScreenTrackRef.current
) {
  socket.emit(
    "cloudflare-publication-removed",
    {
      kind: "screen",
    }
  );
}

cloudflareMicTrackRef.current =
  null;

cloudflareCameraTrackRef.current =
  null;

cloudflareScreenTrackRef.current =
  null;

console.log(
  "Cloudflare medya bağlantıları kapatıldı."
);

    sendCurrentMediaStateToAll();
  };
  /*
    ------------------------------------------------
    EKRAN PAYLAŞIMINI DURDUR
    ------------------------------------------------
  */

  const stopScreenShare =
  async () => {
    const screenStream =
      screenStreamRef.current;

    const cameraTrack =
      localStreamRef.current
        ?.getVideoTracks()[0];

    /*
      Cloudflare SFU'daki ekran
      paylaşımı track'ini kapat.
    */
    if (
  cloudflareScreenConnectionRef.current &&
  cloudflareScreenTrackRef.current
) {
  try {
    await closeCloudflareTracks(
      cloudflareScreenConnectionRef.current,
      [
        cloudflareScreenTrackRef.current,
      ]
    );
  } catch (cloudflareError) {
    console.error(
      "Cloudflare ekran paylaşımı kapatılamadı:",
      cloudflareError
    );
  }

  /*
    Ekran paylaşımı artık kendine ait
    bir Cloudflare session kullandığı için
    kapatınca bağlantıyı da tamamen kapat.
  */
  closeCloudflareMediaConnection(
    cloudflareScreenConnectionRef.current
  );

  cloudflareScreenConnectionRef.current =
    null;

  socket.emit(
    "cloudflare-publication-removed",
    {
      kind: "screen",
    }
  );

  cloudflareScreenTrackRef.current =
    null;

  console.log(
    "Cloudflare ekran paylaşımı kapatıldı."
  );
}

    /*
      Eski P2P peer'lerde ekran yerine
      tekrar kameraya dön.
    */
    for (const [
      socketId,
      sender,
    ] of videoSendersRef.current) {
      try {
        if (
          isCameraOpenRef.current &&
          cameraTrack &&
          cameraTrack.readyState ===
            "live"
        ) {
          await sender.replaceTrack(
            cameraTrack
          );
        } else {
          await sender.replaceTrack(
            null
          );
        }
      } catch (error) {
        console.error(
          `Ekran paylaşımı durdurulamadı (${socketId}):`,
          error
        );
      }
    }

    if (screenStream) {
      screenStream
        .getTracks()
        .forEach((track) => {
          track.stop();
        });
    }

    screenStreamRef.current =
      null;

    isScreenSharingRef.current =
      false;

    setIsScreenSharing(false);

    if (
      screenVideoRef.current
    ) {
      screenVideoRef.current.srcObject =
        null;
    }

    sendCurrentMediaStateToAll();
  };
  /*
    ------------------------------------------------
    EKRAN PAYLAŞIMINI BAŞLAT
    ------------------------------------------------
  */

  const startScreenShare =
    async () => {
      try {
        const stream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: true,
              audio: false,
            }
          );

        const screenTrack =
          stream.getVideoTracks()[0];

        if (!screenTrack) {
          throw new Error(
            "Ekran paylaşımı track'i oluşturulamadı."
          );
        }

        screenStreamRef.current =
          stream;

        isScreenSharingRef.current =
          true;

        setIsScreenSharing(
          true
        );

        if (
          screenVideoRef.current
        ) {
          screenVideoRef.current.srcObject =
            stream;

          try {
            await screenVideoRef.current.play();
          } catch (error) {
            console.error(
              "Ekran paylaşımı oynatılamadı:",
              error
            );
          }
        }

        /*
          Ekran görüntüsünü bütün
          kullanıcılara gönder.
        */
        for (const [
          socketId,
          peerConnection,
        ] of peerConnectionsRef.current) {
          const sender =
            videoSendersRef.current.get(
              socketId
            );

          if (sender) {
            await sender.replaceTrack(
              screenTrack
            );

            continue;
          }

          const newSender =
            peerConnection.addTrack(
              screenTrack,
              stream
            );

          videoSendersRef.current.set(
            socketId,
            newSender
          );

          await renegotiatePeer(
            socketId
          );
        }
        
        /*
  Eski P2P ekran paylaşımı korunuyor.

  Aynı ekran track'ini ayrıca
  Cloudflare Realtime SFU'ya yayınlıyoruz.
*/
try {
  if (!cloudflareScreenConnectionRef.current) {
    cloudflareScreenConnectionRef.current =
      await createCloudflareMediaConnection();
  }

  const publishedTracks =
    await publishCloudflareTracks(
      cloudflareScreenConnectionRef.current,
      [screenTrack]
    );

  const publishedTrack =
    publishedTracks[0] ?? null;

  cloudflareScreenTrackRef.current =
    publishedTrack;

  const publisherSessionId =
    cloudflareScreenConnectionRef.current
      .sessionId;

if (
  publishedTrack &&
  publisherSessionId
) {
  socket.emit(
    "cloudflare-publication",
    {
      publisherSessionId,
      trackName:
        publishedTrack.trackName,
      kind: "screen",
    }
  );

  console.log(
    "Cloudflare ekran paylaşımı yayın bilgisi Socket.IO ile gönderildi:",
    {
      publisherSessionId,
      trackName:
        publishedTrack.trackName,
    }
  );
}

console.log(
  "Cloudflare ekran paylaşımı aktif:",
  publishedTracks
);
} catch (cloudflareError) {
  console.error(
    "Cloudflare ekran paylaşımı başlatılamadı:",
    cloudflareError
  );
}


        sendCurrentMediaStateToAll();

        screenTrack.onended =
          () => {
            void stopScreenShare();
          };
      } catch (error) {
        console.error(
          "Ekran paylaşımı başlatılamadı:",
          error
        );
      }
    };

  /*
    ------------------------------------------------
    SOCKET.IO + WEBRTC
    ------------------------------------------------
  */

  useEffect(() => {
    /*
      Kanala ilk giren yeni kullanıcı,
      odada bulunan BÜTÜN kullanıcılarla
      bağlantı kuracak.
    */
    const handleExistingUsers = (
  existingUsers: string[]
) => {
  console.log(
    "Kanaldaki mevcut kullanıcılar:",
    existingUsers
  );

  /*
    Eski P2P offer artık oluşturulmuyor.

    Remote mikrofon, kamera ve ekran
    Cloudflare SFU yayın bilgileri
    üzerinden alınacak.
  */
};

    /*
      Yeni kullanıcı geldiğinde mevcut
      kullanıcıların offer göndermesine
      gerek yok.

      Yeni kullanıcı zaten
      existing-users üzerinden
      bize offer gönderecek.
    */
    const handleUserJoined = (
      socketId: string
    ) => {
      console.log(
        "Kanala yeni kullanıcı geldi:",
        socketId
      );

      sendCurrentMediaState(
        socketId
      );
    };

    /*
      OFFER ALINDI
    */
    const handleOffer = async ({
      sender,
      offer,
    }: {
      sender: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      try {
        console.log(
          "WebRTC offer alındı:",
          sender
        );

        const peerConnection =
          createPeerConnection(
            sender
          );

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(
            offer
          )
        );

        await flushPendingIceCandidates(
          sender,
          peerConnection
        );

        const answer =
          await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(
          answer
        );

        socket.emit(
          "webrtc-answer",
          {
            target: sender,
            answer,
          }
        );

        sendCurrentMediaState(
          sender
        );
      } catch (error) {
        console.error(
          "WebRTC offer işlenemedi:",
          error
        );
      }
    };

    /*
      ANSWER ALINDI
    */
    const handleAnswer = async ({
      sender,
      answer,
    }: {
      sender: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      try {
        const peerConnection =
          peerConnectionsRef.current.get(
            sender
          );

        if (!peerConnection) {
          return;
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(
            answer
          )
        );

        await flushPendingIceCandidates(
          sender,
          peerConnection
        );

        console.log(
          "WebRTC answer alındı:",
          sender
        );
      } catch (error) {
        console.error(
          "WebRTC answer işlenemedi:",
          error
        );
      }
    };

    /*
      ICE CANDIDATE
    */
    const handleIceCandidate =
      async ({
        sender,
        candidate,
      }: {
        sender: string;
        candidate: RTCIceCandidateInit;
      }) => {
        const peerConnection =
          peerConnectionsRef.current.get(
            sender
          );

        /*
          Peer henüz oluşmadıysa
          candidate'i beklet.
        */
        if (!peerConnection) {
          addPendingIceCandidate(
            sender,
            candidate
          );

          return;
        }

        try {
          if (
            peerConnection.remoteDescription
          ) {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );
          } else {
            addPendingIceCandidate(
              sender,
              candidate
            );
          }
        } catch (error) {
          console.error(
            "ICE candidate eklenemedi:",
            error
          );
        }
      };

    /*
      KAMERA / MİKROFON /
      EKRAN DURUMU
    */
    const handleMediaState = ({
      sender,
      camera,
      microphone,
      screenSharing = false,
    }: {
      sender: string;
      camera: boolean;
      microphone: boolean;
      screenSharing?: boolean;
    }) => {
      updateRemoteMediaState(
        sender,
        {
          camera,
          microphone,
          screenSharing,
        }
      );
    };

    /*
      KULLANICI KANALDAN ÇIKTI
    */
    const handleUserLeft = (
      socketId: string
    ) => {
      console.log(
        "Kullanıcı kanaldan ayrıldı:",
        socketId
      );

      closePeerConnection(
        socketId
      );
    };

    /*
      KANALDAKİ KULLANICILARIN
      İSİMLERİNİ DE BURADA ALIYORUZ.
    */
    const handleChannelUsers = (
      users: ChannelUser[]
    ) => {
      setChannelUsers(
        users
      );
    };
    

const handleCloudflarePublication =
  async ({
    publisherSocketId,
    publisherSessionId,
    trackName,
    kind,
  }: {
    publisherSocketId: string;
    publisherSessionId: string;
    trackName: string;
    kind:
      | "microphone"
      | "camera"
      | "screen";
  }) => {
    try {
      if (
        publisherSocketId ===
        socket.id
      ) {
        return;
      }

      const publicationKey =
        `${publisherSessionId}:${trackName}`;

      /*
        Bu remote track'in hangi
        kullanıcıya ve medya türüne
        ait olduğunu kaydet.
      */
      cloudflareRemotePublicationMapRef.current.set(
        publicationKey,
        {
          publisherSocketId,
          kind,
        }
      );

      /*
        İlk remote yayın geldiğinde
        tek bir receive PeerConnection oluştur.
      */
      if (
        !cloudflareReceiveConnectionRef.current
      ) {
        cloudflareReceiveConnectionRef.current =
          createCloudflareReceiveConnection(
            (remoteTrack) => {
              const remotePublicationKey =
                `${remoteTrack.publisherSessionId}:${remoteTrack.trackName}`;

              const publicationInfo =
                cloudflareRemotePublicationMapRef.current.get(
                  remotePublicationKey
                );

              if (!publicationInfo) {
                console.warn(
                  "Cloudflare remote track için kullanıcı bilgisi bulunamadı:",
                  remoteTrack
                );

                return;
              }

              const {
                publisherSocketId:
                  remotePublisherSocketId,

                kind:
                  remoteKind,
              } = publicationInfo;

              const currentRemoteTracks =
  cloudflareRemoteTracksRef.current.get(
    remotePublisherSocketId
  ) ?? {};

if (remoteKind === "microphone") {
  currentRemoteTracks.microphone =
    remoteTrack.track;
}

if (remoteKind === "camera") {
  currentRemoteTracks.camera =
    remoteTrack.track;
}

if (remoteKind === "screen") {
  currentRemoteTracks.screen =
    remoteTrack.track;
}

cloudflareRemoteTracksRef.current.set(
  remotePublisherSocketId,
  currentRemoteTracks
);

              console.log(
  "Cloudflare remote track geldi:",
  {
    remotePublisherSocketId,
    remoteKind,

    trackKind:
      remoteTrack.track.kind,

    trackId:
      remoteTrack.track.id,

    enabled:
      remoteTrack.track.enabled,

    muted:
      remoteTrack.track.muted,

    readyState:
      remoteTrack.track.readyState,

    receiveConnectionState:
      cloudflareReceiveConnectionRef.current
        ?.peerConnection.connectionState,

    receiveIceState:
      cloudflareReceiveConnectionRef.current
        ?.peerConnection.iceConnectionState,
  }
);

remoteTrack.track.onmute = () => {
  console.log(
    "Cloudflare remote track MUTED:",
    {
      remotePublisherSocketId,
      remoteKind,
    }
  );
};

remoteTrack.track.onunmute = () => {
  console.log(
    "Cloudflare remote track UNMUTED:",
    {
      remotePublisherSocketId,
      remoteKind,
    }
  );
};

              rebuildCloudflareRemoteStream(
  remotePublisherSocketId
);

              updateRemoteMediaState(
                remotePublisherSocketId,
                {
                  connected: true,

                  ...(remoteKind ===
                  "microphone"
                    ? {
                        microphone:
                          true,
                      }
                    : {}),

                  ...(remoteKind ===
                  "camera"
                    ? {
                        camera:
                          true,
                      }
                    : {}),

                  ...(remoteKind ===
                  "screen"
                    ? {
                        screenSharing:
                          true,
                      }
                    : {}),
                }
              );
            }
          );
      }

      await subscribeCloudflareTrack(
        cloudflareReceiveConnectionRef.current,
        {
          publisherSessionId,
          trackName,
        }
      );

      console.log(
        "Cloudflare remote yayına abone olundu:",
        {
          publisherSocketId,
          publisherSessionId,
          trackName,
          kind,
        }
      );
    } catch (error) {
      console.error(
        "Cloudflare remote yayına abone olunamadı:",
        error
      );
    }
  };
  
  const handleCloudflarePublicationRemoved =
  ({
    publisherSocketId,
    kind,
  }: {
    publisherSocketId: string;
    kind:
      | "microphone"
      | "camera"
      | "screen";
  }) => {
    const remoteTracks =
      cloudflareRemoteTracksRef.current.get(
        publisherSocketId
      );

    if (!remoteTracks) {
      return;
    }

    const trackToRemove =
      remoteTracks[kind];

    if (trackToRemove) {
      const currentStream =
        remoteStreamsRef.current.get(
          publisherSocketId
        );

      if (currentStream) {
        currentStream.removeTrack(
          trackToRemove
        );

        const updatedStream =
          new MediaStream(
            currentStream.getTracks()
          );

        remoteStreamsRef.current.set(
          publisherSocketId,
          updatedStream
        );

        setRemoteStreams(
          (previous) => ({
            ...previous,

            [publisherSocketId]:
              updatedStream,
          })
        );
      }

      trackToRemove.stop();

delete remoteTracks[kind];

/*
  Kapatılan track'i çıkardıktan sonra
  remote stream'i yeniden oluştur.

  Örneğin ekran paylaşımı kapandıysa
  varsa tekrar kameraya döner.
*/
rebuildCloudflareRemoteStream(
  publisherSocketId
);
}

    for (const [
      key,
      publicationInfo,
    ] of cloudflareRemotePublicationMapRef.current) {
      if (
        publicationInfo.publisherSocketId ===
          publisherSocketId &&
        publicationInfo.kind === kind
      ) {
        cloudflareRemotePublicationMapRef.current.delete(
          key
        );
      }
    }

    if (kind === "microphone") {
      updateRemoteMediaState(
        publisherSocketId,
        {
          microphone: false,
        }
      );
    }

    if (kind === "camera") {
      updateRemoteMediaState(
        publisherSocketId,
        {
          camera: false,
        }
      );
    }

    if (kind === "screen") {
      updateRemoteMediaState(
        publisherSocketId,
        {
          screenSharing: false,
        }
      );
    }

    console.log(
      "Cloudflare remote yayın kaldırıldı:",
      {
        publisherSocketId,
        kind,
      }
    );
  };

    socket.on(
      "existing-users",
      handleExistingUsers
    );

    socket.on(
      "user-joined",
      handleUserJoined
    );

    socket.on(
      "webrtc-offer",
      handleOffer
    );

    socket.on(
      "webrtc-answer",
      handleAnswer
    );

    socket.on(
      "webrtc-ice-candidate",
      handleIceCandidate
    );

    socket.on(
      "media-state",
      handleMediaState
    );

    socket.on(
      "user-left",
      handleUserLeft
    );

    socket.on(
      "channel-users",
      handleChannelUsers
    );
   socket.on(
  "cloudflare-publication",
  handleCloudflarePublication
);

socket.on(
  "cloudflare-publication-removed",
  handleCloudflarePublicationRemoved
);

return () => {
  socket.off(
    "existing-users",
    handleExistingUsers
  );

      socket.off(
        "user-joined",
        handleUserJoined
      );

      socket.off(
        "webrtc-offer",
        handleOffer
      );

      socket.off(
        "webrtc-answer",
        handleAnswer
      );

      socket.off(
        "webrtc-ice-candidate",
        handleIceCandidate
      );

      socket.off(
        "media-state",
        handleMediaState
      );

      socket.off(
        "user-left",
        handleUserLeft
      );

      socket.off(
        "channel-users",
        handleChannelUsers
      );
      socket.off(
  "cloudflare-publication",
  handleCloudflarePublication
);
socket.off(
  "cloudflare-publication-removed",
  handleCloudflarePublicationRemoved
);
    };
  }, []);

  /*
    ------------------------------------------------
    COMPONENT KAPANIRKEN TEMİZLE
    ------------------------------------------------
  */

  useEffect(() => {
  return () => {
    localStreamRef.current
      ?.getTracks()
      .forEach((track) => {
        track.stop();
      });

    screenStreamRef.current
      ?.getTracks()
      .forEach((track) => {
        track.stop();
      });

    if (cloudflareConnectionRef.current) {
      closeCloudflareMediaConnection(
        cloudflareConnectionRef.current
      );

      cloudflareConnectionRef.current = null;
    }
    if (
  cloudflareReceiveConnectionRef.current
) {
  closeCloudflareReceiveConnection(
    cloudflareReceiveConnectionRef.current
  );

  cloudflareReceiveConnectionRef.current =
    null;
}

    closeAllPeerConnections();
  };
}, []);

  /*
    KENDİMİZ DIŞINDAKİ
    KANAL KULLANICILARI
  */
  const remoteUsers =
    channelUsers.filter(
      (user) =>
        user.socketId !==
        socket.id
    );

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-3">
        {/* KENDİ KAMERAM */}
        <div className="rounded-xl bg-zinc-800 p-4">
          <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-lg bg-zinc-700">
            <video
              ref={cameraVideoRef}
              autoPlay
              muted
              playsInline
              className={`h-full w-full object-cover ${
                isCameraOpen
                  ? "block"
                  : "hidden"
              }`}
            />

            {!isCameraOpen && (
              <span className="text-zinc-400">
                Kamera Kapalı
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="font-medium">
              {username}
            </p>

            <span className="rounded-full bg-zinc-700 px-3 py-1 text-xs">
              {isMicOpen
                ? "Mikrofon Açık"
                : "Mikrofon Kapalı"}
            </span>
          </div>
        </div>

        {/* DİĞER KULLANICILAR */}
        {remoteUsers.map(
          (user) => (
            <RemoteUserCard
              key={
                user.socketId
              }
              username={
                user.username
              }
              stream={
                remoteStreams[
                  user.socketId
                ]
              }
              state={
                remoteMediaStates[
                  user.socketId
                ] ??
                EMPTY_REMOTE_STATE
              }
            />
          )
        )}

        {/* KANALDA BAŞKA KİMSE YOKSA */}
        {remoteUsers.length ===
          0 && (
          <div className="rounded-xl bg-zinc-800 p-4">
            <div className="flex h-48 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400">
              Diğer kullanıcı bekleniyor
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="font-medium">
                Diğer Kullanıcı
              </p>

              <span className="rounded-full bg-zinc-700 px-3 py-1 text-xs text-zinc-300">
                Bekleniyor
              </span>
            </div>
          </div>
        )}

        {/* KENDİ EKRAN PAYLAŞIMIM */}
        <div className="rounded-xl bg-zinc-800 p-4">
          <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-lg bg-zinc-700">
            <video
              ref={screenVideoRef}
              autoPlay
              muted
              playsInline
              className={`h-full w-full object-cover ${
                isScreenSharing
                  ? "block"
                  : "hidden"
              }`}
            />

            {!isScreenSharing && (
              <span className="text-zinc-400">
                Ekran paylaşımı kapalı
              </span>
            )}
          </div>

          <p className="mt-3 font-medium">
            Ekran Paylaşımı
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={toggleMic}
          className={`rounded-lg px-4 py-3 text-white ${
            isMicOpen
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isMicOpen
            ? "Mikrofon Kapat"
            : "Mikrofon Aç"}
        </button>

        <button
          onClick={toggleCamera}
          className={`rounded-lg px-4 py-3 text-white ${
            isCameraOpen
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isCameraOpen
            ? "Kamera Kapat"
            : "Kamera Aç"}
        </button>

        <button
          onClick={
            isScreenSharing
              ? () =>
                  void stopScreenShare()
              : startScreenShare
          }
          className={`rounded-lg px-4 py-3 text-white ${
            isScreenSharing
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isScreenSharing
            ? "Paylaşımı Durdur"
            : "Ekran Paylaş"}
        </button>

        <button
          onClick={() =>
            void stopCameraAndMic()
          }
          className="rounded-lg bg-red-600 px-4 py-3 text-white hover:bg-red-700"
        >
          Medyayı Kapat
        </button>
      </div>
    </>
  );
}

export default MediaRoom;