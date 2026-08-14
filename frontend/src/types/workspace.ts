export type Channel = {
  id: number;
  name: string;
  type: string;

  ownerId:
    number | null;

  ownerUsername:
    string | null;
};

export type Category = {
  id: number;
  name: string;
  channels: Channel[];
};

export type Member = {
  id: number;
  username: string;
  role: string;
  status: string;
};

export type ServerInfo = {
  id: number;
  name: string;
  description: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};