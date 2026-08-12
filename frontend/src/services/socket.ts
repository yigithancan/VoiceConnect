import { io } from "socket.io-client";

export const socket = io("http://localhost:5000", {
  autoConnect: false,

  auth: (callback) => {
    const token =
      localStorage.getItem(
        "voiceconnect_token"
      );

    callback({
      token,
    });
  },
});