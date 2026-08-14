import { useEffect, useRef, useState } from "react";
import { socket } from "../services/socket";

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

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject =
      stream ?? null;

    if (
      stream &&
      (state.camera ||
        state.screenSharing)
    ) {
      void videoRef.current
        .play()
        .catch((error) => {
          console.error(
            "Uzak video oynatılamadı:",
            error
          );
        });
    }
  }, [
    stream,
    state.camera,
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
          className={`h-full w-full object-cover ${
            shouldShowVideo
              ? "block"
              : "hidden"
          }`}
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
    peerConnection.ontrack = (
      event
    ) => {
      const track =
        event.track;

      const alreadyExists =
        remoteStream
          .getTracks()
          .some(
            (existingTrack) =>
              existingTrack.id ===
              track.id
          );

      if (!alreadyExists) {
        remoteStream.addTrack(
          track
        );
      }

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
          connected: true,
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

  const createAndSendOffer = async (
    remoteSocketId: string
  ) => {
    try {
      const peerConnection =
        createPeerConnection(
          remoteSocketId
        );

      if (
        peerConnection.signalingState !==
        "stable"
      ) {
        return;
      }

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

      sendCurrentMediaState(
        remoteSocketId
      );

      console.log(
        "WebRTC offer gönderildi:",
        remoteSocketId
      );
    } catch (error) {
      console.error(
        "WebRTC offer oluşturulamadı:",
        error
      );
    }
  };

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

        sendCurrentMediaStateToAll();

        return;
      }

      audioTrack.enabled =
        !audioTrack.enabled;

      isMicOpenRef.current =
        audioTrack.enabled;

      setIsMicOpen(
        audioTrack.enabled
      );

      sendCurrentMediaStateToAll();
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

        sendCurrentMediaStateToAll();

        return;
      }

      videoTrack.enabled =
        !videoTrack.enabled;

      isCameraOpenRef.current =
        videoTrack.enabled;

      setIsCameraOpen(
        videoTrack.enabled
      );

      if (
        videoTrack.enabled
      ) {
        await showCameraStream(
          stream
        );
      }

      sendCurrentMediaStateToAll();
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
        mikrofonu kes.
      */
      for (const sender of audioSendersRef.current.values()) {
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
        Ekran paylaşılmıyorsa
        video sender'ları da kapat.
      */
      if (
        !isScreenSharingRef.current
      ) {
        for (const sender of videoSendersRef.current.values()) {
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
      }

      const stream =
        localStreamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach((track) => {
            track.stop();
          });
      }

      localStreamRef.current =
        null;

      isCameraOpenRef.current =
        false;

      isMicOpenRef.current =
        false;

      setIsCameraOpen(false);
      setIsMicOpen(false);

      if (
        cameraVideoRef.current
      ) {
        cameraVideoRef.current.srcObject =
          null;
      }

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
        Bütün peer'lerde ekran yerine
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

      existingUsers.forEach(
        (remoteSocketId) => {
          if (
            remoteSocketId ===
            socket.id
          ) {
            return;
          }

          void createAndSendOffer(
            remoteSocketId
          );
        }
      );
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