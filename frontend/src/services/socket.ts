import { io } from "socket.io-client";

/*
  URL vermiyoruz.

  Localde:
  localhost:5173/socket.io
  -> Vite
  -> localhost:5000

  İnternetten:
  https://....trycloudflare.com/socket.io
  -> Vite
  -> localhost:5000
*/
export const socket = io({
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