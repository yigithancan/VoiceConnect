export const getServerInfo = () => {
  return {
    id: 1,
    name: "VoiceConnect Sunucusu",
    description: "Discord benzeri sesli iletişim platformu",
  };
};

export const getCategories = () => {
  return [
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
};

export const getMembers = () => {
  return [
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
      role: "Yönetici",
      status: "offline",
    },
  ];
};