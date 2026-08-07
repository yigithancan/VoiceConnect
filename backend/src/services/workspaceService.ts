import { pool } from "../config/database";

type ChannelRow = {
  id: number;
  category_id: number;
  name: string;
  type: string;
};

type CategoryRow = {
  id: number;
  name: string;
};

type MemberRow = {
  id: number;
  username: string;
  role: string;
};

export const getServerInfo = async () => {
  const result = await pool.query(
    "SELECT id, name, description FROM servers WHERE id = $1",
    [1]
  );

  return result.rows[0];
};

export const getCategories = async () => {
  const categoryResult = await pool.query<CategoryRow>(
    "SELECT id, name FROM categories WHERE server_id = $1 ORDER BY id ASC",
    [1]
  );

  const channelResult = await pool.query<ChannelRow>(
    "SELECT id, category_id, name, type FROM channels ORDER BY id ASC"
  );

  const categories = categoryResult.rows.map((category) => {
    const channels = channelResult.rows
      .filter((channel) => channel.category_id === category.id)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
      }));

    return {
      id: category.id,
      name: category.name,
      channels,
    };
  });

  return categories;
};

export const getMembers = async () => {
  const result = await pool.query<MemberRow>(
    `SELECT 
      users.id,
      users.username,
      server_members.role
    FROM server_members
    INNER JOIN users ON users.id = server_members.user_id
    WHERE server_members.server_id = $1
    ORDER BY users.id ASC`,
    [1]
  );

  return result.rows.map((member) => ({
    id: member.id,
    username: member.username,
    role: member.role,
    status: "online",
  }));
};