import {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import MediaRoom from "../components/MediaRoom";

import { socket } from "../services/socket";

import {
  createChannel,
  getCategories,
  getChannelMembers,
  getMembers,
  getServerInfo,
  updateChannelMemberRole,
  updateMemberRole,
} from "../services/workspaceApi";

import type {
  ChannelMember,
  ChannelRole,
  ServerRole,
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

type RoomType =
  | "voice"
  | "meeting"
  | "study"
  | "temporary";

function DashboardPage() {
  const navigate = useNavigate();

  const [
    serverInfo,
    setServerInfo,
  ] = useState<ServerInfo | null>(
    null
  );

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    members,
    setMembers,
  ] = useState<Member[]>([]);

  const [
    selectedChannel,
    setSelectedChannel,
  ] = useState<Channel | null>(
    null
  );

  const [
    channelUsers,
    setChannelUsers,
  ] = useState<ChannelUser[]>([]);

  const [
    onlineUsers,
    setOnlineUsers,
  ] = useState<string[]>([]);

  const [
    currentUsername,
    setCurrentUsername,
  ] = useState("Kullanıcı");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /*
    ========================================
    ODA OLUŞTURMA
    ========================================
  */

  const [
    isCreateRoomOpen,
    setIsCreateRoomOpen,
  ] = useState(false);

  const [
    roomName,
    setRoomName,
  ] = useState("");

  const [
    roomType,
    setRoomType,
  ] =
    useState<RoomType>("voice");

  const [
    roomCategoryId,
    setRoomCategoryId,
  ] = useState("");

  const [
    isCreatingRoom,
    setIsCreatingRoom,
  ] = useState(false);

  const [
    createRoomError,
    setCreateRoomError,
  ] = useState("");

  /*
    ========================================
    PLATFORM ROL YÖNETİMİ
    ========================================
  */

  const [
    roleTarget,
    setRoleTarget,
  ] = useState<Member | null>(
    null
  );

  const [
    selectedRole,
    setSelectedRole,
  ] =
    useState<ServerRole>(
      "member"
    );

  const [
    roleError,
    setRoleError,
  ] = useState("");

  const [
    roleSuccess,
    setRoleSuccess,
  ] = useState("");

  const [
    isUpdatingRole,
    setIsUpdatingRole,
  ] = useState(false);

  /*
    ========================================
    ODA İÇİ ROL YÖNETİMİ
    ========================================
  */

  const [
    roomMembers,
    setRoomMembers,
  ] =
    useState<ChannelMember[]>(
      []
    );

  const [
    isRoomManagerOpen,
    setIsRoomManagerOpen,
  ] = useState(false);

  const [
    roomRoleTarget,
    setRoomRoleTarget,
  ] =
    useState<ChannelMember | null>(
      null
    );

  const [
    selectedRoomRole,
    setSelectedRoomRole,
  ] =
    useState<ChannelRole>(
      "member"
    );

  const [
    roomRoleError,
    setRoomRoleError,
  ] = useState("");

  const [
    roomRoleSuccess,
    setRoomRoleSuccess,
  ] = useState("");

  const [
    isUpdatingRoomRole,
    setIsUpdatingRoomRole,
  ] = useState(false);

  /*
    ========================================
    GİRİŞ KONTROLÜ
    ========================================
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
        user.username ||
          "Kullanıcı"
      );
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  /*
    ========================================
    SOCKET.IO
    ========================================
  */

  useEffect(() => {
    const handleConnect = () => {
      console.log(
        "Socket.IO bağlantısı kuruldu:",
        socket.id
      );
    };

    const handleDisconnect =
      () => {
        setChannelUsers([]);
        setOnlineUsers([]);
      };

    const handleChannelUsers =
      (
        users: ChannelUser[]
      ) => {
        setChannelUsers(users);
      };

    const handleOnlineUsers =
      (users: string[]) => {
        setOnlineUsers(users);
      };

    const handleLeftChannel =
      () => {
        localStorage.removeItem(
          "voiceconnect_selected_channel_id"
        );

        setSelectedChannel(
          null
        );

        setChannelUsers([]);
        setRoomMembers([]);

        setIsRoomManagerOpen(
          false
        );
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
    ========================================
    PRESENCE
    ========================================
  */

  useEffect(() => {
    if (
      !currentUsername ||
      currentUsername ===
        "Kullanıcı"
    ) {
      return;
    }

    const registerPresence =
      () => {
        socket.emit(
          "register-presence",
          {
            username:
              currentUsername,
          }
        );
      };

    if (socket.connected) {
      registerPresence();
    }

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
    ========================================
    WORKSPACE VERİLERİ
    ========================================
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

          if (
            categoryData.length >
            0
          ) {
            setRoomCategoryId(
              String(
                categoryData[0]
                  .id
              )
            );
          }

          /*
            SON ODAYI GERİ YÜKLE
          */

          const savedChannelId =
            localStorage.getItem(
              "voiceconnect_selected_channel_id"
            );

          if (savedChannelId) {
            const savedChannel =
              categoryData
                .flatMap(
                  (category) =>
                    category.channels
                )
                .find(
                  (channel) =>
                    channel.id ===
                    Number(
                      savedChannelId
                    )
                );

            if (savedChannel) {
              setSelectedChannel(
                savedChannel
              );
            } else {
              localStorage.removeItem(
                "voiceconnect_selected_channel_id"
              );

              setSelectedChannel(
                null
              );
            }
          } else {
            setSelectedChannel(
              null
            );
          }
        } catch (error) {
          console.error(
            "Workspace verileri alınamadı:",
            error
          );

          setErrorMessage(
            "Backend verileri alınamadı."
          );
        } finally {
          setIsLoading(
            false
          );
        }
      };

    void fetchWorkspaceData();
  }, []);

  /*
    ========================================
    PLATFORM ROLÜ
    ========================================
  */

  const currentMember =
    members.find(
      (member) =>
        member.username ===
        currentUsername
    );

  const currentRole =
    (
      currentMember?.role ??
      "member"
    ) as ServerRole;

  /*
    ARTIK HER KULLANICI
    ODA OLUŞTURABİLİR
  */

  const canCreateRoom = true;

  /*
    ========================================
    SEÇİLEN ODAYI HATIRLA
    ========================================
  */

  useEffect(() => {
    if (!selectedChannel) {
      return;
    }

    localStorage.setItem(
      "voiceconnect_selected_channel_id",
      String(
        selectedChannel.id
      )
    );
  }, [selectedChannel]);

  /*
    ========================================
    SOCKET İLE ODAYA KATIL
    ========================================
  */

  useEffect(() => {
    if (
      !selectedChannel ||
      currentUsername ===
        "Kullanıcı"
    ) {
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
  }, [
    selectedChannel,
    currentUsername,
  ]);

  /*
    ========================================
    ODA ÜYELERİNİ GETİR
    ========================================
  */

  useEffect(() => {
    if (!selectedChannel) {
      setRoomMembers([]);
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          void getChannelMembers(
            selectedChannel.id
          )
            .then((data) => {
              setRoomMembers(
                data
              );
            })
            .catch((error) => {
              console.error(
                "Oda üyeleri alınamadı:",
                error
              );
            });
        },
        150
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [
    selectedChannel,
    channelUsers.length,
  ]);

  /*
    ========================================
    ODA OLUŞTUR
    ========================================
  */

  const handleCreateRoom =
    async () => {
      const cleanedName =
        roomName.trim();

      if (!cleanedName) {
        setCreateRoomError(
          "Oda adı yazmalısın."
        );

        return;
      }

      if (!roomCategoryId) {
        setCreateRoomError(
          "Kategori seçmelisin."
        );

        return;
      }

      try {
        setIsCreatingRoom(
          true
        );

        setCreateRoomError(
          ""
        );

        const createdRoom =
          await createChannel({
            categoryId:
              Number(
                roomCategoryId
              ),

            name:
              cleanedName,

            type:
              roomType,
          });

        const updatedCategories =
          await getCategories();

        setCategories(
          updatedCategories
        );

        const createdChannel =
          updatedCategories
            .flatMap(
              (category) =>
                category.channels
            )
            .find(
              (channel) =>
                channel.id ===
                createdRoom.id
            );

        if (createdChannel) {
          setSelectedChannel(
            createdChannel
          );
        }

        setRoomName("");

        setRoomType(
          "voice"
        );

        setIsCreateRoomOpen(
          false
        );
      } catch (error) {
        setCreateRoomError(
          error instanceof Error
            ? error.message
            : "Oda oluşturulamadı."
        );
      } finally {
        setIsCreatingRoom(
          false
        );
      }
    };

  /*
    ========================================
    PLATFORM ROL YETKİSİ
    ========================================
  */

  const canManageMember =
    (member: Member) => {
      const targetRole =
        member.role as
          ServerRole;

      if (
        targetRole ===
        "owner"
      ) {
        return false;
      }

      if (
        currentRole ===
        "owner"
      ) {
        return true;
      }

      if (
        currentRole ===
        "admin"
      ) {
        return (
          targetRole ===
            "moderator" ||
          targetRole ===
            "member"
        );
      }

      return false;
    };

  const openRoleManager =
    (member: Member) => {
      setRoleTarget(member);

      setSelectedRole(
        member.role as
          ServerRole
      );

      setRoleError("");
      setRoleSuccess("");
    };

  const handleUpdateRole =
    async () => {
      if (!roleTarget) {
        return;
      }

      try {
        setIsUpdatingRole(
          true
        );

        setRoleError("");
        setRoleSuccess("");

        await updateMemberRole(
          roleTarget.id,
          selectedRole
        );

        const updatedMembers =
          await getMembers();

        setMembers(
          updatedMembers
        );

        setRoleSuccess(
          "Rol başarıyla güncellendi."
        );

        setTimeout(() => {
          setRoleTarget(
            null
          );

          setRoleSuccess(
            ""
          );
        }, 700);
      } catch (error) {
        setRoleError(
          error instanceof Error
            ? error.message
            : "Rol güncellenemedi."
        );
      } finally {
        setIsUpdatingRole(
          false
        );
      }
    };

  /*
    ========================================
    ODA İÇİ ROLÜM
    ========================================
  */

  const myRoomMembership =
    roomMembers.find(
      (member) =>
        member.username ===
        currentUsername
    );

  const myRoomRole =
    myRoomMembership?.role ??
    "member";

  const isRoomOwner =
    myRoomRole === "owner";

  /*
    ========================================
    ODA YÖNETİMİNİ AÇ
    ========================================
  */

  const openRoomManager =
    async () => {
      if (!selectedChannel) {
        return;
      }

      try {
        const data =
          await getChannelMembers(
            selectedChannel.id
          );

        setRoomMembers(data);

        setRoomRoleTarget(
          null
        );

        setRoomRoleError("");
        setRoomRoleSuccess("");

        setIsRoomManagerOpen(
          true
        );
      } catch (error) {
        console.error(
          "Oda yönetimi açılamadı:",
          error
        );
      }
    };

  /*
    ========================================
    ODA ÜYESİ SEÇ
    ========================================
  */

  const selectRoomMember =
    (
      member: ChannelMember
    ) => {
      if (
        member.role ===
        "owner"
      ) {
        return;
      }

      setRoomRoleTarget(
        member
      );

      setSelectedRoomRole(
        member.role
      );

      setRoomRoleError("");
      setRoomRoleSuccess("");
    };

  /*
    ========================================
    ODA ROLÜ GÜNCELLE
    ========================================
  */

  const handleUpdateRoomRole =
    async () => {
      if (
        !selectedChannel ||
        !roomRoleTarget
      ) {
        return;
      }

      try {
        setIsUpdatingRoomRole(
          true
        );

        setRoomRoleError("");
        setRoomRoleSuccess("");

        await updateChannelMemberRole(
          selectedChannel.id,
          roomRoleTarget.id,
          selectedRoomRole
        );

        const updatedMembers =
          await getChannelMembers(
            selectedChannel.id
          );

        setRoomMembers(
          updatedMembers
        );

        setRoomRoleSuccess(
          `${roomRoleTarget.username} kullanıcısının oda rolü güncellendi.`
        );

        setRoomRoleTarget(
          null
        );
      } catch (error) {
        setRoomRoleError(
          error instanceof Error
            ? error.message
            : "Oda rolü güncellenemedi."
        );
      } finally {
        setIsUpdatingRoomRole(
          false
        );
      }
    };

  /*
    ========================================
    ODADAN AYRIL
    ========================================
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
    ========================================
    ÇIKIŞ
    ========================================
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

    localStorage.removeItem(
      "voiceconnect_selected_channel_id"
    );

    navigate("/");
  };

  /*
    ========================================
    ODADAKİ SOCKET KULLANICILARI
    ========================================
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
    ========================================
    SUNUCU ÜYELERİ
    ========================================
  */

  const displayedMembers =
    members.map(
      (member) => ({
        ...member,

        status:
          onlineUsers.includes(
            member.username
          )
            ? "online"
            : "offline",
      })
    );

  /*
    ========================================
    PLATFORM ROL GÖRÜNÜMÜ
    ========================================
  */

  const getRoleInfo =
    (role: string) => {
      switch (role) {
        case "owner":
          return {
            label:
              "Kurucu",
            icon: "👑",
            badge:
              "bg-amber-500/10 text-amber-300 border-amber-500/30",
          };

        case "admin":
          return {
            label:
              "Yönetici",
            icon: "🛡️",
            badge:
              "bg-red-500/10 text-red-300 border-red-500/30",
          };

        case "moderator":
          return {
            label:
              "Yardımcı",
            icon: "🔧",
            badge:
              "bg-orange-500/10 text-orange-300 border-orange-500/30",
          };

        default:
          return {
            label:
              "Üye",
            icon: "👤",
            badge:
              "bg-zinc-700 text-zinc-300 border-zinc-600",
          };
      }
    };

  /*
    ========================================
    ODA TÜRÜ
    ========================================
  */

  const getRoomTypeLabel =
    (type: string) => {
      switch (type) {
        case "meeting":
          return "Toplantı";

        case "study":
          return "Ders / Çalışma";

        case "temporary":
          return "Geçici";

        default:
          return "Sohbet";
      }
    };

  const remoteUser =
    uniqueChannelUsers.find(
      (user) =>
        user.socketId !==
        socket.id
    );

  const remoteUsername =
    remoteUser?.username ??
    "Diğer Kullanıcı";

  /*
    ========================================
    LOADING
    ========================================
  */

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Dashboard yükleniyor...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        {errorMessage}
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-950 text-white">

        <div className="flex min-h-screen flex-col md:flex-row">

          {/* SOL LOGO BAR */}
          <aside className="flex items-center gap-4 border-b border-zinc-800 bg-zinc-900 p-4 md:block md:w-20 md:border-b-0 md:border-r">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 font-bold">E</div>

            <p className="font-bold text-orange-400 md:hidden">
              {serverInfo?.name}
            </p>
          </aside>

          {/* KANALLAR */}
          <aside className="w-full border-b border-zinc-800 bg-zinc-900 p-4 md:w-72 md:border-b-0 md:border-r">

            <h2 className="hidden text-lg font-bold text-orange-400 md:block">
              {serverInfo?.name}
            </h2>

            <p className="mt-2 hidden text-sm text-zinc-500 md:block">
              {serverInfo?.description}
            </p>

            {/* PLATFORM ROLÜ */}
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">

              <p className="text-xs text-zinc-500">
                Hesap seviyesi
              </p>

              <div className="mt-2 flex items-center gap-2">

                <span>
                  {
                    getRoleInfo(
                      currentRole
                    ).icon
                  }
                </span>

                <span className="text-sm font-semibold">
                  {
                    getRoleInfo(
                      currentRole
                    ).label
                  }
                </span>
              </div>
            </div>

            {/* ODA OLUŞTUR */}
            {canCreateRoom && (
              <button
                onClick={() => {
                  setCreateRoomError(
                    ""
                  );

                  setIsCreateRoomOpen(
                    true
                  );
                }}
                className="mt-4 w-full rounded-xl bg-orange-600 px-4 py-3 font-semibold transition hover:bg-orange-500"
              >
                + Yeni Oda Oluştur
              </button>
            )}

            <div className="mt-6 space-y-6">

              {categories.map(
                (category) => (
                  <div
                    key={
                      category.id
                    }
                  >

                    <div className="flex items-center justify-between">

                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        {
                          category.name
                        }
                      </p>

                      <span className="text-xs text-zinc-600">
                        {
                          category
                            .channels
                            .length
                        }{" "}
                        oda
                      </span>
                    </div>

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
                            className={`w-full rounded-lg px-3 py-2 text-left transition ${
                              selectedChannel?.id ===
                              channel.id
                                ? "bg-zinc-800 text-white"
                                : "text-zinc-400 hover:bg-zinc-800"
                            }`}
                          >

                            <div className="flex items-center justify-between gap-2">

                              <span className="truncate">
                                🔊{" "}
                                {
                                  channel.name
                                }
                              </span>

                              <span className="text-[10px] text-zinc-500">
                                {
                                  getRoomTypeLabel(
                                    channel.type
                                  )
                                }
                              </span>
                            </div>
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

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">

              {selectedChannel ? (
                <>
                  {/* ODA BAŞLIĞI */}
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">

                    <div>

                      <h1 className="text-2xl font-bold">
                        {
                          selectedChannel.name
                        }
                      </h1>

                      <div className="mt-2 flex flex-wrap items-center gap-3">

                        <p className="text-zinc-400">
                          Sesli görüşme,
                          kamera ve ekran
                          paylaşımı.
                        </p>

                        {selectedChannel.ownerUsername && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                            👑 Oda Sahibi:{" "}
                            {
                              selectedChannel.ownerUsername
                            }
                          </span>
                        )}

                        {isRoomOwner && (
                          <button
                            onClick={() =>
                              void openRoomManager()
                            }
                            className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
                          >
                            ⚙️ Oda Yönetimi
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300">
                      {
                        getRoomTypeLabel(
                          selectedChannel.type
                        )
                      }
                    </div>
                  </div>

                  {/* ODADAKİLER */}
                  <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">

                    <div className="flex items-center justify-between">

                      <p className="font-semibold">
                        Bu Odadakiler
                      </p>

                      <span className="rounded-full bg-orange-600/20 px-3 py-1 text-xs text-orange-300">
                        {
                          uniqueChannelUsers.length
                        }{" "}
                        kişi
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">

                      {uniqueChannelUsers.length ===
                      0 ? (
                        <span className="text-sm text-zinc-500">
                          Oda kullanıcıları
                          yükleniyor...
                        </span>
                      ) : (
                        uniqueChannelUsers.map(
                          (user) => (
                            <div
                              key={
                                user.socketId
                              }
                              className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm"
                            >
                              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />

                              <span>
                                {
                                  user.username
                                }
                              </span>

                              {user.socketId ===
                                socket.id && (
                                <span className="text-xs text-orange-300">
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

                  <div className="mt-6 border-t border-zinc-800 pt-5">

                    <button
                      onClick={
                        handleLeaveChannel
                      }
                      className="rounded-lg bg-orange-600 px-4 py-3 hover:bg-orange-700"
                    >
                      Odadan Ayrıl
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[500px] items-center justify-center">

                  <div className="max-w-md text-center">

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 text-2xl">
                      🔊
                    </div>

                    <h1 className="mt-5 text-2xl font-bold">
                      Bir Oda Seç
                    </h1>

                    <p className="mt-3 text-zinc-400">
                      Görüşmeye başlamak
                      için soldaki
                      odalardan birine
                      katıl veya kendi
                      odanı oluştur.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* SAĞ ÜYE PANELİ */}
          <aside className="w-full border-t border-zinc-800 bg-zinc-900 p-4 md:w-80 md:border-l md:border-t-0">

            <div>

              <h3 className="font-bold">
                Kullanıcılar
              </h3>

              <p className="mt-1 text-xs text-zinc-500">
                {
                  onlineUsers.length
                }{" "}
                çevrimiçi
              </p>
            </div>

            <div className="mt-4 space-y-3">

              {displayedMembers.map(
                (member) => {
                  const role =
                    getRoleInfo(
                      member.role
                    );

                  return (
                    <div
                      key={
                        member.id
                      }
                      className="rounded-xl border border-zinc-800 bg-zinc-800/60 p-3"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <div className="flex items-center gap-2">

                            <span>
                              {
                                role.icon
                              }
                            </span>

                            <p className="truncate font-medium">
                              {
                                member.username
                              }

                              {member.username ===
                                currentUsername && (
                                <span className="ml-1 text-xs text-orange-300">
                                  (Sen)
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="mt-2">

                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${role.badge}`}
                            >
                              {
                                role.label
                              }
                            </span>
                          </div>
                        </div>

                        <span
                          className={`mt-1 h-2.5 w-2.5 rounded-full ${
                            member.status ===
                            "online"
                              ? "bg-green-500"
                              : "bg-zinc-600"
                          }`}
                        />
                      </div>

                      {canManageMember(
                        member
                      ) && (
                        <button
                          onClick={() =>
                            openRoleManager(
                              member
                            )
                          }
                          className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-orange-500 hover:text-white"
                        >
                          Platform Rolü
                        </button>
                      )}
                    </div>
                  );
                }
              )}
            </div>

            <div className="mt-6 border-t border-zinc-800 pt-4">

              <button
                onClick={
                  handleLogout
                }
                className="w-full rounded-lg bg-red-600 px-4 py-3 hover:bg-red-700"
              >
                Çıkış Yap
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* =====================================
          ODA OLUŞTUR MODALI
          ===================================== */}

      {isCreateRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-white shadow-2xl">

            <div className="flex items-start justify-between">

              <div>

                <h2 className="text-2xl font-bold">
                  Yeni Oda Oluştur
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  Arkadaşlarınla
                  görüşmek için kendi
                  odanı oluştur.
                </p>
              </div>

              <button
                onClick={() =>
                  setIsCreateRoomOpen(
                    false
                  )
                }
                className="rounded-lg bg-zinc-800 px-3 py-2"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">

              <label className="text-sm text-zinc-300">
                Oda adı
              </label>

              <input
                value={
                  roomName
                }
                onChange={(event) =>
                  setRoomName(
                    event.target.value
                  )
                }
                placeholder="Örn: Arkadaşlarla Sohbet"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            <div className="mt-5">

              <label className="text-sm text-zinc-300">
                Kategori
              </label>

              <select
                value={
                  roomCategoryId
                }
                onChange={(event) =>
                  setRoomCategoryId(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3"
              >

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="mt-5">

              <label className="text-sm text-zinc-300">
                Oda türü
              </label>

              <div className="mt-2 grid grid-cols-2 gap-3">

                {[
                  {
                    value:
                      "voice",
                    title:
                      "Sohbet",
                    text:
                      "Normal görüşme",
                  },
                  {
                    value:
                      "meeting",
                    title:
                      "Toplantı",
                    text:
                      "Ekip görüşmesi",
                  },
                  {
                    value:
                      "study",
                    title:
                      "Ders / Çalışma",
                    text:
                      "Odak alanı",
                  },
                  {
                    value:
                      "temporary",
                    title:
                      "Geçici",
                    text:
                      "Hızlı görüşme",
                  },
                ].map(
                  (item) => (
                    <button
                      key={
                        item.value
                      }
                      type="button"
                      onClick={() =>
                        setRoomType(
                          item.value as
                            RoomType
                        )
                      }
                      className={`rounded-xl border p-3 text-left ${
                        roomType ===
                        item.value
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-zinc-700 bg-zinc-950"
                      }`}
                    >

                      <p className="font-semibold">
                        {
                          item.title
                        }
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {
                          item.text
                        }
                      </p>
                    </button>
                  )
                )}
              </div>
            </div>

            {createRoomError && (
              <p className="mt-4 rounded-lg bg-red-950/50 p-3 text-sm text-red-300">
                {
                  createRoomError
                }
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">

              <button
                onClick={() =>
                  setIsCreateRoomOpen(
                    false
                  )
                }
                className="rounded-xl bg-zinc-800 px-5 py-3"
              >
                Vazgeç
              </button>

              <button
                disabled={
                  isCreatingRoom
                }
                onClick={() =>
                  void handleCreateRoom()
                }
                className="rounded-xl bg-orange-600 px-5 py-3 font-semibold disabled:opacity-50"
              >
                {isCreatingRoom
                  ? "Oluşturuluyor..."
                  : "Odayı Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================
          PLATFORM ROL MODALI
          ===================================== */}

      {roleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-white shadow-2xl">

            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">
                  Platform Rolü
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {
                    roleTarget.username
                  }
                </h2>
              </div>

              <button
                onClick={() =>
                  setRoleTarget(
                    null
                  )
                }
                className="rounded-lg bg-zinc-800 px-3 py-2"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-3">

              {currentRole ===
                "owner" && (
                <button
                  onClick={() =>
                    setSelectedRole(
                      "admin"
                    )
                  }
                  className={`w-full rounded-xl border p-4 text-left ${
                    selectedRole ===
                    "admin"
                      ? "border-red-500 bg-red-500/10"
                      : "border-zinc-700 bg-zinc-950"
                  }`}
                >
                  🛡️ Yönetici
                </button>
              )}

              <button
                onClick={() =>
                  setSelectedRole(
                    "moderator"
                  )
                }
                className={`w-full rounded-xl border p-4 text-left ${
                  selectedRole ===
                  "moderator"
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-zinc-700 bg-zinc-950"
                }`}
              >
                🔧 Yardımcı
              </button>

              <button
                onClick={() =>
                  setSelectedRole(
                    "member"
                  )
                }
                className={`w-full rounded-xl border p-4 text-left ${
                  selectedRole ===
                  "member"
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-zinc-700 bg-zinc-950"
                }`}
              >
                👤 Üye
              </button>
            </div>

            {roleError && (
              <div className="mt-4 rounded-lg bg-red-950/40 p-3 text-sm text-red-300">
                {
                  roleError
                }
              </div>
            )}

            {roleSuccess && (
              <div className="mt-4 rounded-lg bg-green-950/40 p-3 text-sm text-green-300">
                {
                  roleSuccess
                }
              </div>
            )}

            <button
              disabled={
                isUpdatingRole
              }
              onClick={() =>
                void handleUpdateRole()
              }
              className="mt-6 w-full rounded-xl bg-orange-600 px-5 py-3 font-semibold disabled:opacity-50"
            >
              {isUpdatingRole
                ? "Güncelleniyor..."
                : "Rolü Güncelle"}
            </button>
          </div>
        </div>
      )}

      {/* =====================================
          ODA ROL YÖNETİMİ
          ===================================== */}

      {isRoomManagerOpen &&
        selectedChannel && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">

            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-white shadow-2xl">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                    Oda Yönetimi
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    {
                      selectedChannel.name
                    }
                  </h2>

                  <p className="mt-1 text-sm text-zinc-400">
                    Oda üyelerinin
                    yetkilerini yönet.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setIsRoomManagerOpen(
                      false
                    );

                    setRoomRoleTarget(
                      null
                    );
                  }}
                  className="rounded-lg bg-zinc-800 px-3 py-2"
                >
                  ✕
                </button>
              </div>

              {/* ÜYELER */}
              <div className="mt-6 space-y-3">

                {roomMembers.map(
                  (member) => {
                    const isOwner =
                      member.role ===
                      "owner";

                    return (
                      <button
                        key={
                          member.id
                        }
                        disabled={
                          isOwner
                        }
                        onClick={() =>
                          selectRoomMember(
                            member
                          )
                        }
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          roomRoleTarget?.id ===
                          member.id
                            ? "border-amber-500 bg-amber-500/10"
                            : "border-zinc-700 bg-zinc-950"
                        } ${
                          isOwner
                            ? "cursor-default opacity-80"
                            : "hover:border-zinc-500"
                        }`}
                      >

                        <div className="flex items-center justify-between gap-3">

                          <div>

                            <p className="font-semibold">
                              {member.role ===
                              "owner"
                                ? "👑 "
                                : member.role ===
                                  "admin"
                                ? "🛡️ "
                                : member.role ===
                                  "moderator"
                                ? "🔧 "
                                : "👤 "}

                              {
                                member.username
                              }
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {member.role ===
                              "owner"
                                ? "Oda Sahibi"
                                : member.role ===
                                  "admin"
                                ? "Oda Yöneticisi"
                                : member.role ===
                                  "moderator"
                                ? "Yardımcı"
                                : "Katılımcı"}
                            </p>
                          </div>

                          {!isOwner && (
                            <span className="text-xs text-zinc-500">
                              Rol değiştir
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              {/* ROL SEÇİMİ */}
              {roomRoleTarget && (
                <div className="mt-6 border-t border-zinc-800 pt-5">

                  <p className="font-semibold">
                    {
                      roomRoleTarget.username
                    }
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Yeni oda rolünü seç
                  </p>

                  <div className="mt-4 grid gap-3">

                    <button
                      onClick={() =>
                        setSelectedRoomRole(
                          "admin"
                        )
                      }
                      className={`rounded-xl border p-3 text-left ${
                        selectedRoomRole ===
                        "admin"
                          ? "border-red-500 bg-red-500/10"
                          : "border-zinc-700 bg-zinc-950"
                      }`}
                    >
                      🛡️ Oda Yöneticisi
                    </button>

                    <button
                      onClick={() =>
                        setSelectedRoomRole(
                          "moderator"
                        )
                      }
                      className={`rounded-xl border p-3 text-left ${
                        selectedRoomRole ===
                        "moderator"
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-zinc-700 bg-zinc-950"
                      }`}
                    >
                      🔧 Yardımcı
                    </button>

                    <button
                      onClick={() =>
                        setSelectedRoomRole(
                          "member"
                        )
                      }
                      className={`rounded-xl border p-3 text-left ${
                        selectedRoomRole ===
                        "member"
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-zinc-700 bg-zinc-950"
                      }`}
                    >
                      👤 Katılımcı
                    </button>
                  </div>

                  <button
                    onClick={() =>
                      void handleUpdateRoomRole()
                    }
                    disabled={
                      isUpdatingRoomRole
                    }
                    className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
                  >
                    {isUpdatingRoomRole
                      ? "Güncelleniyor..."
                      : "Oda Rolünü Güncelle"}
                  </button>
                </div>
              )}

              {roomRoleError && (
                <div className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                  {
                    roomRoleError
                  }
                </div>
              )}

              {roomRoleSuccess && (
                <div className="mt-4 rounded-lg border border-green-800 bg-green-950/40 p-3 text-sm text-green-300">
                  {
                    roomRoleSuccess
                  }
                </div>
              )}
            </div>
          </div>
        )}
    </>
  );
}

export default DashboardPage;