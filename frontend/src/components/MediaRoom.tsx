import { useRef, useState } from "react";

type MediaRoomProps = {
  username: string;
};

function MediaRoom({ username }: MediaRoomProps) {
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const [isMicOpen, setIsMicOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const startCameraAndMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setCameraStream(stream);
      setIsCameraOpen(true);
      setIsMicOpen(true);

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch {
      alert("Kamera veya mikrofon izni alınamadı.");
    }
  };

  const stopCameraAndMic = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    setCameraStream(null);
    setIsCameraOpen(false);
    setIsMicOpen(false);

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };

  const toggleMic = () => {
    if (!cameraStream) {
      startCameraAndMic();
      return;
    }

    cameraStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsMicOpen(track.enabled);
    });
  };

  const toggleCamera = () => {
    if (!cameraStream) {
      startCameraAndMic();
      return;
    }

    cameraStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsCameraOpen(track.enabled);
    });
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setScreenStream(stream);
      setIsScreenSharing(true);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch {
      alert("Ekran paylaşımı başlatılamadı.");
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }

    setScreenStream(null);
    setIsScreenSharing(false);

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
  };

  return (
    <>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl bg-slate-800 p-4">
          <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg bg-slate-700 text-slate-400">
            {cameraStream ? (
              <video
                ref={cameraVideoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              "Kamera Kapalı"
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="font-medium">{username}</p>

            <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">
              {isMicOpen ? "Mikrofon Açık" : "Mikrofon Kapalı"}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-800 p-4">
          <div className="flex h-48 items-center justify-center rounded-lg bg-slate-700 text-slate-400">
            Diğer kullanıcı alanı
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="font-medium">Misafir</p>

            <span className="rounded-full bg-green-600/20 px-3 py-1 text-xs text-green-300">
              Bağlı
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-800 p-4 md:col-span-2 xl:col-span-1">
          <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg bg-slate-700 text-slate-400">
            {screenStream ? (
              <video
                ref={screenVideoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              "Ekran paylaşımı kapalı"
            )}
          </div>

          <p className="mt-3 font-medium">Ekran Paylaşımı</p>
        </div>
      </div>

      {isScreenSharing && (
        <div className="mt-6 rounded-xl border border-indigo-500 bg-indigo-950/40 p-4 text-indigo-200">
          Ekran paylaşımı aktif. Paylaşılan ekran yukarıdaki alanda gösteriliyor.
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={toggleMic}
          className={`rounded-lg px-4 py-3 ${
            isMicOpen
              ? "bg-green-600 hover:bg-green-700"
              : "bg-slate-800 hover:bg-slate-700"
          }`}
        >
          {isMicOpen ? "Mikrofon Açık" : "Mikrofon Kapalı"}
        </button>

        <button
          onClick={toggleCamera}
          className={`rounded-lg px-4 py-3 ${
            isCameraOpen
              ? "bg-green-600 hover:bg-green-700"
              : "bg-slate-800 hover:bg-slate-700"
          }`}
        >
          {isCameraOpen ? "Kamera Açık" : "Kamera Kapalı"}
        </button>

        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className={`rounded-lg px-4 py-3 ${
            isScreenSharing
              ? "bg-orange-600 hover:bg-orange-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}
        </button>

        <button
          onClick={stopCameraAndMic}
          className="rounded-lg bg-red-600 px-4 py-3 hover:bg-red-700"
        >
          Medyayı Kapat
        </button>
      </div>
    </>
  );
}

export default MediaRoom;