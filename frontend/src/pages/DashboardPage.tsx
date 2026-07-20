import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCategories,
  getMembers,
  getServerInfo,
} from "../services/workspaceApi";
import type { Category, Channel, Member, ServerInfo } from "../types/workspace";

function DashboardPage() {
  const navigate = useNavigate();

  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  const [currentUsername, setCurrentUsername] = useState("Kullanıcı");
  const [isMicOpen, setIsMicOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("voiceconnect_logged_in");
    const savedUser = localStorage.getItem("voiceconnect_user");

    if (isLoggedIn !== "true" || !savedUser) {
      navigate("/login");
      return;
    }

    const user = JSON.parse(savedUser);
    setCurrentUsername(user.username || "Kullanıcı");
  }, [navigate]);

  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        setIsLoading(true);

        const serverData = await getServerInfo();
        const categoryData = await getCategories();
        const memberData = await getMembers();

        setServerInfo(serverData);
        setCategories(categoryData);
        setMembers(memberData);

        if (categoryData.length > 0 && categoryData[0].channels.length > 0) {
          setSelectedChannel(categoryData[0].channels[0]);
        }
      } catch {
        setErrorMessage("Backend verileri alınamadı. Backend çalışıyor mu kontrol et.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspaceData();
  }, []);

  const handleLeave = () => {
    localStorage.removeItem("voiceconnect_logged_in");
    navigate("/login");
  };

  const displayedMembers = [
    {
      id: 0,
      username: currentUsername,
      role: "Sen",
      status: "online",
    },
    ...members.filter((member) => member.username !== currentUsername),
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Dashboard verileri yükleniyor...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="rounded-xl border border-red-800 bg-red-950/40 p-6 text-center">
          <p className="font-semibold text-red-300">{errorMessage}</p>

          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 hover:bg-red-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="flex items-center gap-4 border-b border-slate-800 bg-slate-900 p-4 md:block md:w-20 md:border-b-0 md:border-r">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 font-bold">
            V
          </div>

          <p className="font-bold text-indigo-400 md:hidden">
            {serverInfo?.name}
          </p>
        </aside>

        <aside className="w-full border-b border-slate-800 bg-slate-900 p-4 md:w-72 md:border-b-0 md:border-r">
          <h2 className="hidden text-lg font-bold text-indigo-400 md:block">
            {serverInfo?.name}
          </h2>

          <p className="mt-2 hidden text-sm text-slate-500 md:block">
            {serverInfo?.description}
          </p>

          <div className="mt-4 space-y-6 md:mt-6">
            {categories.map((category) => (
              <div key={category.id}>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {category.name}
                </p>

                <div className="mt-2 space-y-2">
                  {category.channels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel)}
                      className={`w-full rounded-lg px-3 py-2 text-left ${
                        selectedChannel?.id === channel.id
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      🔊 {channel.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="text-2xl font-bold">
                  {selectedChannel?.name}
                </h1>

                <p className="mt-2 text-slate-400">
                  Bu alanda sesli görüşme, kamera ve ekran paylaşımı yapılacak.
                </p>
              </div>

              <div className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300">
                Kanal tipi: {selectedChannel?.type}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl bg-slate-800 p-4">
                <div className="flex h-36 items-center justify-center rounded-lg bg-slate-700 text-slate-400">
                  {isCameraOpen ? "Kamera Açık" : "Kamera Kapalı"}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="font-medium">{currentUsername}</p>

                  <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">
                    {isMicOpen ? "Mikrofon Açık" : "Mikrofon Kapalı"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-800 p-4">
                <div className="flex h-36 items-center justify-center rounded-lg bg-slate-700 text-slate-400">
                  Kullanıcı Kamera Alanı
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="font-medium">Misafir</p>

                  <span className="rounded-full bg-green-600/20 px-3 py-1 text-xs text-green-300">
                    Bağlı
                  </span>
                </div>
              </div>
            </div>

            {isScreenSharing && (
              <div className="mt-6 rounded-xl border border-indigo-500 bg-indigo-950/40 p-4 text-indigo-200">
                Ekran paylaşımı aktif. Burada paylaşılan ekran görüntüsü gösterilecek.
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => setIsMicOpen(!isMicOpen)}
                className={`rounded-lg px-4 py-3 ${
                  isMicOpen
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-slate-800 hover:bg-slate-700"
                }`}
              >
                {isMicOpen ? "Mikrofon Açık" : "Mikrofon Kapalı"}
              </button>

              <button
                onClick={() => setIsCameraOpen(!isCameraOpen)}
                className={`rounded-lg px-4 py-3 ${
                  isCameraOpen
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-slate-800 hover:bg-slate-700"
                }`}
              >
                {isCameraOpen ? "Kamera Açık" : "Kamera Kapalı"}
              </button>

              <button
                onClick={() => setIsScreenSharing(!isScreenSharing)}
                className={`rounded-lg px-4 py-3 ${
                  isScreenSharing
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {isScreenSharing ? "Paylaşımı Durdur" : "Ekran Paylaş"}
              </button>

              <button
                onClick={handleLeave}
                className="rounded-lg bg-red-600 px-4 py-3 hover:bg-red-700"
              >
                Ayrıl
              </button>
            </div>
          </div>
        </main>

        <aside className="w-full border-t border-slate-800 bg-slate-900 p-4 md:w-72 md:border-l md:border-t-0">
          <h3 className="font-bold text-slate-200">
            Üyeler
          </h3>

          <div className="mt-4 space-y-3">
            {displayedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-3"
              >
                <div>
                  <p className="font-medium">
                    {member.username}
                  </p>

                  <p className="text-xs text-slate-400">
                    {member.role}
                  </p>
                </div>

                <span
                  className={`h-3 w-3 rounded-full ${
                    member.status === "online"
                      ? "bg-green-500"
                      : "bg-slate-500"
                  }`}
                />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default DashboardPage;