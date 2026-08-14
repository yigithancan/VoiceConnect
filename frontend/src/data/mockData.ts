export const mockServer = {
  id: 1,
  name: "Echora Sunucusu",
};

export const mockCategories = [
  {
    id: 1,
    name: "Genel",
    channels: [
      {
        id: 1,
        name: "Genel Ses Kanalı",
        type: "voice",
      },
      {
        id: 2,
        name: "Toplantı Odası",
        type: "voice",
      },
    ],
  },
  {
    id: 2,
    name: "Ekip",
    channels: [
      {
        id: 3,
        name: "Frontend Ekibi",
        type: "voice",
      },
      {
        id: 4,
        name: "Backend Ekibi",
        type: "voice",
      },
    ],
  },
];

export const mockMembers = [
  {
    id: 1,
    username: "Yiğithan",
    role: "Sunucu Sahibi",
    status: "online",
  },
  {
    id: 2,
    username: "Burak",
    role: "Üye",
    status: "online",
  },
  {
    id: 3,
    username: "Furkan",
    role: "Admin",
    status: "offline",
  },
];