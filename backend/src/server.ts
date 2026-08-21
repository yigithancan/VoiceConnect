import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import app from "./app";
import { env } from "./config/env";
import { pool } from "./config/database";

const httpServer = createServer(app);

const io = new Server(httpServer);

type JoinChannelPayload =
  | string
  | {
      channelId: string;
      username?: string;
    };

type ChannelUser = {
  socketId: string;
  username: string;
};

type AuthTokenPayload = {
  id: number;
  username: string;
  email: string;
  role: string;
};

/*
  ========================================
  SOCKET.IO JWT KONTROLÜ
  ========================================

  connection event'i çalışmadan önce
  burası çalışır.

  Token yoksa veya geçersizse
  Socket.IO bağlantısını kabul etmiyoruz.
*/
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token;

    if (
      !token ||
      typeof token !== "string"
    ) {
      return next(
        new Error(
          "Yetkisiz bağlantı: Token bulunamadı."
        )
      );
    }

    const decoded =
      jwt.verify(
        token,
        env.JWT_SECRET,
        {
          algorithms: ["HS256"],
        }
      );

    if (
      typeof decoded === "string" ||
      !decoded.username ||
      !decoded.email ||
      !decoded.id ||
      !decoded.role
    ) {
      return next(
        new Error(
          "Yetkisiz bağlantı: Token bilgileri geçersiz."
        )
      );
    }

    const authenticatedUser: AuthTokenPayload = {
      id: Number(decoded.id),
      username: String(
        decoded.username
      ),
      email: String(
        decoded.email
      ),
      role: String(
        decoded.role
      ),
    };

    /*
      Kullanıcı bilgilerini Socket.IO
      bağlantısının içinde saklıyoruz.

      Artık frontend'in gönderdiği
      username'e güvenmek zorunda değiliz.
    */
    socket.data.user =
      authenticatedUser;

    socket.data.username =
      authenticatedUser.username;

    next();
  } catch (error) {
    console.error(
      "Socket JWT doğrulama hatası:",
      error
    );

    return next(
      new Error(
        "Yetkisiz bağlantı: Token geçersiz veya süresi dolmuş."
      )
    );
  }
});

io.on("connection", (socket) => {
  const authenticatedUser =
    socket.data
      .user as AuthTokenPayload;

  console.log(
    `Socket bağlandı: ${socket.id} | Kullanıcı: ${authenticatedUser.username}`
  );

  /*
    ========================================
    ONLINE KULLANICILAR
    ========================================
  */

  const getOnlineUsers = () => {
    const usernames =
      Array.from(
        io.sockets.sockets.values()
      )
        .map(
          (connectedSocket) =>
            connectedSocket.data
              .username as
              | string
              | undefined
        )
        .filter(
          (
            username
          ): username is string =>
            Boolean(username)
        );

    /*
      Aynı hesap birden fazla
      tarayıcı/pencerede açıksa
      kullanıcı adını bir kez göster.
    */
    return Array.from(
      new Set(usernames)
    );
  };

  const broadcastOnlineUsers =
    () => {
      io.emit(
        "online-users",
        getOnlineUsers()
      );
    };

  /*
    ========================================
    PRESENCE
    ========================================

    Frontend register-presence gönderiyor.

    Ama artık frontend'in gönderdiği
    username'i kullanmıyoruz.

    Kullanıcı JWT'den belli.
  */
  socket.on(
    "register-presence",
    () => {
      const username =
        socket.data
          .username as string;

      broadcastOnlineUsers();

      console.log(
        `Online kullanıcı: ${username} (${socket.id})`
      );
    }
  );

  /*
    ========================================
    KANAL KULLANICILARI
    ========================================
  */

  const getChannelUsers = (
    roomName: string
  ): ChannelUser[] => {
    const room =
      io.sockets.adapter.rooms.get(
        roomName
      );

    if (!room) {
      return [];
    }

    return Array.from(room).map(
      (socketId) => {
        const connectedSocket =
          io.sockets.sockets.get(
            socketId
          );

        return {
          socketId,

          username:
            connectedSocket?.data
              .username ||
            "Kullanıcı",
        };
      }
    );
  };

  const sendChannelUsers = (
    roomName: string
  ) => {
    io.to(roomName).emit(
      "channel-users",
      getChannelUsers(roomName)
    );
  };

  /*
    ========================================
    KANALA KATIL
    ========================================
  */

  socket.on(
    "join-channel",
    (
      payload: JoinChannelPayload
    ) => {
      const channelId =
        typeof payload === "string"
          ? payload
          : payload.channelId;

      /*
        ÖNEMLİ:

        Frontend payload içinde
        username gönderse bile
        onu kullanmıyoruz.

        Username JWT'den geliyor.
      */
      const username =
        socket.data
          .username as string;

      const roomName =
        `channel-${channelId}`;

      const currentRoom =
        socket.data
          .currentRoom as
          | string
          | undefined;

      if (
        currentRoom === roomName
      ) {
        sendChannelUsers(
          roomName
        );

        return;
      }

      /*
        Başka bir kanaldaysa
        önce eski kanaldan çık.
      */
      if (currentRoom) {
        const previousUsers =
          Array.from(
            io.sockets.adapter.rooms.get(
              currentRoom
            ) ?? []
          ).filter(
            (socketId) =>
              socketId !==
              socket.id
          );

        /*
          Kendi frontend'ine
          eski WebRTC bağlantılarını
          kapatmasını söyle.
        */
        previousUsers.forEach(
          (previousUserId) => {
            socket.emit(
              "user-left",
              previousUserId
            );
          }
        );

        /*
          Eski kanaldakilere
          kullanıcının ayrıldığını bildir.
        */
        socket
          .to(currentRoom)
          .emit(
            "user-left",
            socket.id
          );

        socket.leave(
          currentRoom
        );

        sendChannelUsers(
          currentRoom
        );

        console.log(
          `Socket ${socket.id}, ${currentRoom} kanalından ayrıldı.`
        );
      }

      /*
        Yeni kanalda önceden
        bulunan kullanıcıları al.
      */
      const existingUsers =
        Array.from(
          io.sockets.adapter.rooms.get(
            roomName
          ) ?? []
        );

      /*
        Yeni kanala katıl.
      */
                socket.join(
            roomName
          );

          /*
            Kullanıcı odaya girince
            channel_members tablosuna ekle.

            Eğer zaten kayıtlıysa mevcut
            rolünü değiştirme.
          */
          void pool
            .query(
              `
                INSERT INTO channel_members (
                  channel_id,
                  user_id,
                  role
                )
                VALUES ($1, $2, $3)
                ON CONFLICT (
                  channel_id,
                  user_id
                )
                DO NOTHING
              `,
              [
                Number(channelId),
                authenticatedUser.id,
                "member",
              ]
            )
            .catch((error) => {
              console.error(
                "Oda üyeliği kaydedilemedi:",
                error
              );
            });

          socket.data.currentRoom =
            roomName;

      /*
        Yeni kullanıcıya odadaki
        mevcut Socket ID'lerini gönder.

        MediaRoom bunların her biriyle
        ayrı WebRTC bağlantısı kuruyor.
      */
      socket.emit(
        "existing-users",
        existingUsers
      );

      /*
        Odadaki mevcut kişilere
        yeni birinin geldiğini bildir.
      */
      socket
        .to(roomName)
        .emit(
          "user-joined",
          socket.id
        );

      /*
        Kanal kullanıcı listesini
        herkese güncelle.
      */
      sendChannelUsers(
        roomName
      );

      console.log(
        `Socket ${socket.id} (${username}), ${roomName} kanalına katıldı.`
      );
    }
  );

  /*
    ========================================
    KANALDAN AYRIL
    ========================================
  */

  socket.on(
    "leave-channel",
    () => {
      const currentRoom =
        socket.data
          .currentRoom as
          | string
          | undefined;

      if (!currentRoom) {
        return;
      }

      const otherUsers =
        Array.from(
          io.sockets.adapter.rooms.get(
            currentRoom
          ) ?? []
        ).filter(
          (socketId) =>
            socketId !==
            socket.id
        );

      /*
        Ayrılan kişinin
        kendi WebRTC bağlantılarını
        kapattır.
      */
      otherUsers.forEach(
        (userId) => {
          socket.emit(
            "user-left",
            userId
          );
        }
      );

      /*
        Odadaki diğer kişilere
        kullanıcının çıktığını bildir.
      */
      socket
        .to(currentRoom)
        .emit(
          "user-left",
          socket.id
        );

      socket.leave(
        currentRoom
      );

      socket.data.currentRoom =
        undefined;

      sendChannelUsers(
        currentRoom
      );

      /*
        Dashboard'a:
        "kanaldan çıktın"
        bilgisini gönder.
      */
      socket.emit(
        "left-channel"
      );

      console.log(
        `Socket ${socket.id}, ${currentRoom} kanalından ayrıldı.`
      );
    }
  );

  /*
    ========================================
    AYNI KANALDA MI?
    ========================================
  */

  const isTargetInSameRoom = (
    targetSocketId: string
  ) => {
    const currentRoom =
      socket.data
        .currentRoom as
        | string
        | undefined;

    if (!currentRoom) {
      return false;
    }

    const room =
      io.sockets.adapter.rooms.get(
        currentRoom
      );

    return (
      room?.has(
        targetSocketId
      ) ?? false
    );
  };

  /*
    ========================================
    WEBRTC OFFER
    ========================================
  */

  socket.on(
    "webrtc-offer",
    ({
      target,
      offer,
    }: {
      target: string;
      offer: unknown;
    }) => {
      if (
        !isTargetInSameRoom(
          target
        )
      ) {
        return;
      }

      io.to(target).emit(
        "webrtc-offer",
        {
          sender:
            socket.id,

          offer,
        }
      );
    }
  );

  /*
    ========================================
    WEBRTC ANSWER
    ========================================
  */

  socket.on(
    "webrtc-answer",
    ({
      target,
      answer,
    }: {
      target: string;
      answer: unknown;
    }) => {
      if (
        !isTargetInSameRoom(
          target
        )
      ) {
        return;
      }

      io.to(target).emit(
        "webrtc-answer",
        {
          sender:
            socket.id,

          answer,
        }
      );
    }
  );

  /*
    ========================================
    ICE CANDIDATE
    ========================================
  */

  socket.on(
    "webrtc-ice-candidate",
    ({
      target,
      candidate,
    }: {
      target: string;
      candidate: unknown;
    }) => {
      if (
        !isTargetInSameRoom(
          target
        )
      ) {
        return;
      }

      io.to(target).emit(
        "webrtc-ice-candidate",
        {
          sender:
            socket.id,

          candidate,
        }
      );
    }
  );

  /*
    ========================================
    MEDYA DURUMU
    ========================================
  */

  socket.on(
    "media-state",
    ({
      target,
      camera,
      microphone,
      screenSharing = false,
    }: {
      target: string;
      camera: boolean;
      microphone: boolean;
      screenSharing?: boolean;
    }) => {
      if (
        !isTargetInSameRoom(
          target
        )
      ) {
        return;
      }

      io.to(target).emit(
        "media-state",
        {
          sender:
            socket.id,

          camera,

          microphone,

          screenSharing,
        }
      );
    }
  );

  /*
    ========================================
    SOCKET KAPANIRKEN
    ========================================
  */

  socket.on(
    "disconnecting",
    () => {
      const currentRoom =
        socket.data
          .currentRoom as
          | string
          | undefined;

      if (!currentRoom) {
        return;
      }

      socket
        .to(currentRoom)
        .emit(
          "user-left",
          socket.id
        );

      setTimeout(() => {
        sendChannelUsers(
          currentRoom
        );
      }, 0);
    }
  );

  /*
    ========================================
    SOCKET KAPANDI
    ========================================
  */

  socket.on(
    "disconnect",
    () => {
      console.log(
        `Socket ayrıldı: ${socket.id} | Kullanıcı: ${authenticatedUser.username}`
      );

      setTimeout(() => {
        broadcastOnlineUsers();
      }, 0);
    }
  );

  /*
    Kullanıcı bağlanır bağlanmaz
    online listesini güncelle.
  */
  broadcastOnlineUsers();
});

httpServer.listen(
  env.PORT,
  () => {
    console.log(
      `Backend server http://localhost:${env.PORT} adresinde çalışıyor`
    );
  }
);