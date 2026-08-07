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


  // Kamera + Mikrofon Aç
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
        await cameraVideoRef.current.play();
      }


    } catch (error) {
      console.error(error);
      alert("Kamera veya mikrofon izni alınamadı.");
    }
  };


  // Kamera ve Mikrofon tamamen kapat
  const stopCameraAndMic = () => {

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        track.stop();
      });
    }


    setCameraStream(null);
    setIsCameraOpen(false);
    setIsMicOpen(false);


    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  };


  // Mikrofon aç/kapat
  const toggleMic = async () => {

    if (!cameraStream) {
      await startCameraAndMic();
      return;
    }


    const audioTrack = cameraStream.getAudioTracks()[0];


    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOpen(audioTrack.enabled);
    }

  };



  // Kamera aç/kapat
  const toggleCamera = async () => {

    try {

      if (!cameraStream) {

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });


        setCameraStream(stream);
        setIsCameraOpen(true);


        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          await cameraVideoRef.current.play();
        }


        return;
      }



      const videoTrack =
        cameraStream.getVideoTracks()[0];


      if (videoTrack) {

        videoTrack.enabled = !videoTrack.enabled;


        setIsCameraOpen(videoTrack.enabled);


        if (
          videoTrack.enabled &&
          cameraVideoRef.current
        ) {

          cameraVideoRef.current.srcObject =
            cameraStream;

          await cameraVideoRef.current.play();

        }

      }


    } catch(error) {

      console.error(error);
      alert("Kamera açılamadı.");

    }

  };



  // Ekran paylaşımı başlat
  const startScreenShare = async () => {

    try {

      const stream =
        await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });


      setScreenStream(stream);
      setIsScreenSharing(true);



      if(screenVideoRef.current){

        screenVideoRef.current.srcObject = stream;

      }



      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };


    } catch(error){

      console.error(error);

    }

  };



  // Ekran paylaşımı durdur
  const stopScreenShare = () => {


    if(screenStream){

      screenStream
        .getTracks()
        .forEach((track)=>{
          track.stop();
        });

    }


    setScreenStream(null);
    setIsScreenSharing(false);



    if(screenVideoRef.current){

      screenVideoRef.current.srcObject = null;

    }

  };



  return (
    <>

      <div className="grid gap-6 xl:grid-cols-3">


        {/* Kamera */}

        <div className="rounded-xl bg-slate-800 p-4">

          <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg bg-slate-700">


            {cameraStream ? (

              <video
                ref={cameraVideoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />

            ) : (

              <span className="text-slate-400">
                Kamera Kapalı
              </span>

            )}


          </div>



          <div className="mt-3 flex items-center justify-between">

            <p className="font-medium">
              {username}
            </p>


            <span className="rounded-full bg-slate-700 px-3 py-1 text-xs">

              {isMicOpen
                ? "Mikrofon Açık"
                : "Mikrofon Kapalı"}

            </span>


          </div>


        </div>




        {/* Diğer kullanıcı */}

        <div className="rounded-xl bg-slate-800 p-4">

          <div className="flex h-48 items-center justify-center rounded-lg bg-slate-700 text-slate-400">

            Diğer kullanıcı alanı

          </div>


          <div className="mt-3 flex items-center justify-between">

            <p className="font-medium">
              Misafir
            </p>


            <span className="rounded-full bg-green-600/20 px-3 py-1 text-xs text-green-300">

              Bağlı

            </span>


          </div>


        </div>





        {/* Ekran paylaşımı */}

        <div className="rounded-xl bg-slate-800 p-4">


          <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg bg-slate-700">


            {screenStream ? (

              <video
                ref={screenVideoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />

            ) : (

              <span className="text-slate-400">
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
              ? stopScreenShare
              : startScreenShare
          }
          className="rounded-lg bg-indigo-600 px-4 py-3"
        >

          {isScreenSharing
            ? "Paylaşımı Durdur"
            : "Ekran Paylaş"}

        </button>





        <button
          onClick={stopCameraAndMic}
          className="rounded-lg bg-red-600 px-4 py-3"
        >

          Medyayı Kapat

        </button>


      </div>


    </>
  );
}


export default MediaRoom;