import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MediaRoom from "../components/MediaRoom";
import { socket } from "../services/socket";
import {
  getCategories,
  getMembers,
  getServerInfo,
} from "../services/workspaceApi";
import type {
  Category,
  Channel,
  Member,
  ServerInfo,
} from "../types/workspace";

type ChannelUser = {
  socketId: string;
  username: string;
};

function DashboardPage() {
  const navigate = useNavigate();

  const [serverInfo, setServerInfo] =
    useState<ServerInfo | null>(null);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [selectedChannel, setSelectedChannel] =
    useState<Channel | null>(null);

  const [channelUsers, setChannelUsers] =
    useState<ChannelUser[]>([]);

  const [onlineUsers, setOnlineUsers] =
    useState<string[]>([]);

  const [currentUsername, setCurrentUsername] =
    useState("Kullanıcı");

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  /*
    --------------------------------
    GİRİŞ YAPAN KULLANICI
    --------------------------------
  */
  useEffect(() => {
    const isLoggedIn =
      localStorage.getItem(
        "voiceconnect_logged_in"
      );

    const savedUser =
      localStorage.getItem(
        "voiceconnect_user"
      );

    if (
      isLoggedIn !== "true" ||
      !savedUser
    ) {
      navigate("/login");
      return;
    }

    try {
      const user =
        JSON.parse(savedUser);

      setCurrentUsername(
        user.username || "Kullanıcı"
      );
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  /*
    --------------------------------
    SOCKET.IO BAĞLANTISI
    --------------------------------
  */
  useEffect(() => {
    const handleConnect = () => {
      console.log(
        "Socket.IO bağlantısı kuruldu:",
        socket.id
      );
    };

    const handleDisconnect = () => {
      console.log(
        "Socket.IO bağlantısı kesildi."
      );

      setChannelUsers([]);
      setOnlineUsers([]);
    };

    const handleChannelUsers = (
      users: ChannelUser[]
    ) => {
      setChannelUsers(users);
    };

    const handleOnlineUsers = (
      users: string[]
    ) => {
      console.log(
        "Online kullanıcılar:",
        users
      );

      setOnlineUsers(users);
    };

    const handleLeftChannel = () => {
      console.log(
        "Ses kanalından ayrıldın."
      );

      setSelectedChannel(null);
      setChannelUsers([]);
    };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "channel-users",
      handleChannelUsers
    );

    socket.on(
      "online-users",
      handleOnlineUsers
    );

    socket.on(
      "left-channel",
      handleLeftChannel
    );

    socket.connect();

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "channel-users",
        handleChannelUsers
      );

      socket.off(
        "online-users",
        handleOnlineUsers
      );

      socket.off(
        "left-channel",
        handleLeftChannel
      );

      socket.disconnect();
    };
  }, []);

  /*
    --------------------------------
    PRESENCE KAYDI

    Kullanıcı siteye bağlı olduğu anda
    backend'e kullanıcı adını gönder.
    --------------------------------
  */
  useEffect(() => {
    if (
      !currentUsername ||
      currentUsername === "Kullanıcı"
    ) {
      return;
    }

    const registerPresence = () => {
      socket.emit(
        "register-presence",
        {
          username:
            currentUsername,
        }
      );
    };

    /*
      Socket zaten bağlıysa
      hemen gönder.
    */
    if (socket.connected) {
      registerPresence();
    }

    /*
      Socket sonradan yeniden
      bağlanırsa tekrar presence
      kaydı yap.
    */
    socket.on(
      "connect",
      registerPresence
    );

    return () => {
      socket.off(
        "connect",
        registerPresence
      );
    };
  }, [currentUsername]);

  /*
    --------------------------------
    WORKSPACE VERİLERİ
    --------------------------------
  */
  useEffect(() => {
    const fetchWorkspaceData =
      async () => {
        try {
          setIsLoading(true);

          const serverData =
            await getServerInfo();

          const categoryData =
            await getCategories();

          const memberData =
            await getMembers();

          setServerInfo(
            serverData
          );

          setCategories(
            categoryData
          );

          setMembers(
            memberData
          );

          /*
            Sayfa açıldığında
            otomatik kanala girmiyoruz.
          */
          setSelectedChannel(
            null
          );
        } catch {
          setErrorMessage(
            "Backend verileri alınamadı. Backend çalışıyor mu kontrol et."
          );
        } finally {
          setIsLoading(false);
        }
      };

    fetchWorkspaceData();
  }, []);

  /*
    --------------------------------
    KANALA KATIL
    --------------------------------
  */
  useEffect(() => {
    if (!selectedChannel) {
      return;
    }

    socket.emit(
      "join-channel",
      {
        channelId:
          String(
            selectedChannel.id
          ),

        username:
          currentUsername,
      }
    );

    console.log(
      `${selectedChannel.name} kanalına katılma isteği gönderildi.`
    );
  }, [
    selectedChannel,
    currentUsername,
  ]);

  /*
    --------------------------------
    KANALDAN AYRIL
    --------------------------------
  */
  const handleLeaveChannel =
    () => {
      if (!selectedChannel) {
        return;
      }

      socket.emit(
        "leave-channel"
      );
    };

  /*
    --------------------------------
    HESAPTAN ÇIKIŞ
    --------------------------------
  */
  const handleLogout = () => {
    socket.disconnect();

    localStorage.removeItem(
      "voiceconnect_logged_in"
    );

    localStorage.removeItem(
      "voiceconnect_token"
    );

    localStorage.removeItem(
      "voiceconnect_user"
    );

    navigate("/login");
  };

  /*
    --------------------------------
    KANAL KULLANICILARINDA
    TEKRARLARI TEMİZLE
    --------------------------------
  */
  const uniqueChannelUsers =
    Array.from(
      new Map(
        channelUsers.map(
          (user) => [
            user.socketId,
            user,
          ]
        )
      ).values()
    );

  /*
    --------------------------------
    SUNUCU ÜYELERİNİ
    ONLINE / OFFLINE HAZIRLA
    --------------------------------
  */
  const displayedMembers =
    members.map((member) => {
      const isCurrentUser =
        member.username ===
        currentUsername;

      const isOnline =
        onlineUsers.includes(
          member.username
        );

      return {
        ...member,

        role: isCurrentUser
          ? "Sen"
          : member.role,

        status: isOnline
          ? "online"
          : "offline",
      };
    });

  /*
    Eğer giriş yapan kullanıcı
    members içinde yoksa bile
    kendimizi listede göster.
  */
  const currentUserExists =
    displayedMembers.some(
      (member) =>
        member.username ===
        currentUsername
    );

  if (!currentUserExists) {
    displayedMembers.unshift({
      id: 0,
      username:
        currentUsername,
      role: "Sen",
      status: onlineUsers.includes(
        currentUsername
      )
        ? "online"
        : "offline",
    });
  }

  /*
    DashboardPage eski prop'u
    gönderdiği için tutuyoruz.
    MediaRoom artık çok kullanıcılı
    çalıştığından ana mantık bu
    prop'a bağlı değil.
  */
  const remoteUser =
    uniqueChannelUsers.find(
      (user) =>
        user.socketId !==
        socket.id
    );

  const remoteUsername =
    remoteUser?.username ??
    "Diğer Kullanıcı";

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
          <p className="font-semibold text-red-300">
            {errorMessage}
          </p>

          <button
            onClick={() =>
              window.location.reload()
            }
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

        {/* SOL SERVER BAR */}
        <aside className="flex items-center gap-4 border-b border-slate-800 bg-slate-900 p-4 md:block md:w-20 md:border-b-0 md:border-r">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 font-bold">
            V
          </div>

          <p className="font-bold text-indigo-400 md:hidden">
            {serverInfo?.name}
          </p>
        </aside>

        {/* KANALLAR */}
        <aside className="w-full border-b border-slate-800 bg-slate-900 p-4 md:w-72 md:border-b-0 md:border-r">
          <h2 className="hidden text-lg font-bold text-indigo-400 md:block">
            {serverInfo?.name}
          </h2>

          <p className="mt-2 hidden text-sm text-slate-500 md:block">
            {serverInfo?.description}
          </p>

          <div className="mt-4 space-y-6 md:mt-6">
            {categories.map(
              (category) => (
                <div
                  key={category.id}
                >
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {category.name}
                  </p>

                  <div className="mt-2 space-y-2">
                    {category.channels.map(
                      (channel) => (
                        <button
                          key={
                            channel.id
                          }
                          onClick={() =>
                            setSelectedChannel(
                              channel
                            )
                          }
                          className={`w-full rounded-lg px-3 py-2 text-left ${
                            selectedChannel?.id ===
                            channel.id
                              ? "bg-slate-800 text-white"
                              : "text-slate-400 hover:bg-slate-800"
                          }`}
                        >
                          🔊{" "}
                          {
                            channel.name
                          }
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </aside>

        {/* ANA ALAN */}
        <main className="flex-1 p-4 md:p-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6">

            {selectedChannel ? (
              <>
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h1 className="text-2xl font-bold">
                      {
                        selectedChannel.name
                      }
                    </h1>

                    <p className="mt-2 text-slate-400">
                      Sesli görüşme,
                      kamera ve ekran
                      paylaşımı.
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300">
                    Kanal tipi:{" "}
                    {
                      selectedChannel.type
                    }
                  </div>
                </div>

                {/* KANALDAKİLER */}
                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-200">
                      Bu Kanaldakiler
                    </p>

                    <span className="rounded-full bg-indigo-600/20 px-3 py-1 text-xs text-indigo-300">
                      {
                        uniqueChannelUsers.length
                      }{" "}
                      kişi
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {uniqueChannelUsers.length ===
                    0 ? (
                      <span className="text-sm text-slate-500">
                        Kanal
                        kullanıcıları
                        yükleniyor...
                      </span>
                    ) : (
                      uniqueChannelUsers.map(
                        (user) => (
                          <div
                            key={
                              user.socketId
                            }
                            className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm"
                          >
                            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />

                            <span>
                              {
                                user.username
                              }
                            </span>

                            {user.socketId ===
                              socket.id && (
                              <span className="text-xs text-indigo-300">
                                (Sen)
                              </span>
                            )}
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>

                {/* WEBRTC */}
                <div className="mt-6">
                  <MediaRoom
                    username={
                      currentUsername
                    }
                    remoteUsername={
                      remoteUsername
                    }
                  />
                </div>

                <div className="mt-6 border-t border-slate-800 pt-5">
                  <button
                    onClick={
                      handleLeaveChannel
                    }
                    className="rounded-lg bg-orange-600 px-4 py-3 text-white hover:bg-orange-700"
                  >
                    Kanaldan Ayrıl
                  </button>
                </div>
              </>
            ) : (
              <div className="flex min-h-[500px] items-center justify-center">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-2xl">
                    🔊
                  </div>

                  <h1 className="mt-5 text-2xl font-bold">
                    Bir Ses Kanalı Seç
                  </h1>

                  <p className="mt-3 text-slate-400">
                    Görüşmeye
                    başlamak için
                    soldaki ses
                    kanallarından
                    birine tıkla.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* SUNUCU ÜYELERİ */}
        <aside className="w-full border-t border-slate-800 bg-slate-900 p-4 md:w-72 md:border-l md:border-t-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-200">
                Sunucu Üyeleri
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {
                  onlineUsers.length
                }{" "}
                çevrimiçi
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {displayedMembers.map(
              (member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-3"
                >
                  <div>
                    <p
                      className={`font-medium ${
                        member.status ===
                        "online"
                          ? "text-white"
                          : "text-slate-500"
                      }`}
                    >
                      {
                        member.username
                      }
                    </p>

                    <p className="text-xs text-slate-400">
                      {
                        member.role
                      }
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {member.status ===
                      "online"
                        ? "Online"
                        : "Offline"}
                    </span>

                    <span
                      className={`h-3 w-3 rounded-full ${
                        member.status ===
                        "online"
                          ? "bg-green-500"
                          : "bg-slate-600"
                      }`}
                    />
                  </div>
                </div>
              )
            )}
          </div>

          <div className="mt-6 border-t border-slate-800 pt-4">
            <button
              onClick={
                handleLogout
              }
              className="w-full rounded-lg bg-red-600 px-4 py-3 text-white hover:bg-red-700"
            >
              Çıkış Yap
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default DashboardPage;