import { pool } from "../config/database";

export type ServerRole =
  | "owner"
  | "admin"
  | "moderator"
  | "member";

type ChannelRow = {
  id: number;
  category_id: number;
  name: string;
  type: string;
  owner_id: number | null;
  owner_username: string | null;
};

type CreatedChannelRow = {
  id: number;
  category_id: number;
  name: string;
  type: string;
  owner_id: number;
};

type CategoryRow = {
  id: number;
  name: string;
};

type MemberRow = {
  id: number;
  username: string;
  role: ServerRole;
};

type CreateChannelInput = {
  categoryId: number;
  name: string;
  type: string;
};

export const getServerInfo = async () => {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        description
      FROM servers
      WHERE id = $1
    `,
    [1]
  );

  return result.rows[0];
};

export const getCategories = async () => {
  const categoryResult =
    await pool.query<CategoryRow>(
      `
        SELECT
          id,
          name
        FROM categories
        WHERE server_id = $1
        ORDER BY id ASC
      `,
      [1]
    );

  const channelResult =
    await pool.query<ChannelRow>(
      `
        SELECT
          channels.id,
          channels.category_id,
          channels.name,
          channels.type,
          channels.owner_id,
          users.username AS owner_username
        FROM channels
        LEFT JOIN users
          ON users.id = channels.owner_id
        ORDER BY channels.id ASC
      `
    );

  return categoryResult.rows.map(
    (category) => {
      const channels =
        channelResult.rows
          .filter(
            (channel) =>
              channel.category_id ===
              category.id
          )
          .map((channel) => ({
            id: channel.id,
            name: channel.name,
            type: channel.type,

            ownerId:
              channel.owner_id,

            ownerUsername:
              channel.owner_username,
          }));

      return {
        id: category.id,
        name: category.name,
        channels,
      };
    }
  );
};

export const getMembers = async () => {
  const result =
    await pool.query<MemberRow>(
      `
        SELECT
          users.id,
          users.username,
          server_members.role
        FROM server_members
        INNER JOIN users
          ON users.id =
             server_members.user_id
        WHERE server_members.server_id = $1
        ORDER BY users.id ASC
      `,
      [1]
    );

  return result.rows.map(
    (member) => ({
      id: member.id,
      username:
        member.username,
      role: member.role,
      status: "online",
    })
  );
};

/*
  ========================================
  PLATFORM / SUNUCU ROLÜ
  ========================================
*/
export const getMemberRole = async (
  userId: number
): Promise<ServerRole | null> => {
  const result =
    await pool.query<{
      role: ServerRole;
    }>(
      `
        SELECT role
        FROM server_members
        WHERE server_id = $1
          AND user_id = $2
      `,
      [1, userId]
    );

  if (
    result.rows.length === 0
  ) {
    return null;
  }

  return result.rows[0].role;
};

/*
  ========================================
  YENİ ODA OLUŞTUR

  ARTIK HER GİRİŞ YAPAN KULLANICI
  ODA OLUŞTURABİLİR.

  ODAYI OLUŞTURAN KİŞİ
  OTOMATİK OLARAK ODA SAHİBİDİR.
  ========================================
*/
export const createChannel = async (
  {
    categoryId,
    name,
    type,
  }: CreateChannelInput,

  actorUserId: number
) => {
  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    /*
      Kategori kontrolü
    */
    const categoryResult =
      await client.query(
        `
          SELECT id
          FROM categories
          WHERE id = $1
            AND server_id = $2
        `,
        [categoryId, 1]
      );

    if (
      categoryResult.rowCount ===
      0
    ) {
      throw new Error(
        "CATEGORY_NOT_FOUND"
      );
    }

    /*
      Aynı kategoride aynı isimli
      oda olmasın.
    */
    const existingChannel =
      await client.query(
        `
          SELECT id
          FROM channels
          WHERE category_id = $1
            AND LOWER(name) =
                LOWER($2)
        `,
        [
          categoryId,
          name,
        ]
      );

    if (
      existingChannel.rowCount &&
      existingChannel.rowCount >
        0
    ) {
      throw new Error(
        "CHANNEL_ALREADY_EXISTS"
      );
    }

    /*
      Odayı oluştur.

      owner_id = odayı oluşturan
      kullanıcı.
    */
    const result =
      await client.query<CreatedChannelRow>(
        `
          INSERT INTO channels (
            category_id,
            name,
            type,
            owner_id
          )
          VALUES ($1, $2, $3, $4)
          RETURNING
            id,
            category_id,
            name,
            type,
            owner_id
        `,
        [
          categoryId,
          name,
          type,
          actorUserId,
        ]
      );

    const channel =
      result.rows[0];

    /*
      Odayı oluşturan kişiyi
      channel_members tablosuna
      ODA SAHİBİ olarak ekle.
    */
    await client.query(
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
        DO UPDATE SET
          role = EXCLUDED.role
      `,
      [
        channel.id,
        actorUserId,
        "owner",
      ]
    );

    const ownerResult =
      await client.query<{
        username: string;
      }>(
        `
          SELECT username
          FROM users
          WHERE id = $1
        `,
        [actorUserId]
      );

    await client.query(
      "COMMIT"
    );

    return {
      id:
        channel.id,

      categoryId:
        channel.category_id,

      name:
        channel.name,

      type:
        channel.type,

      ownerId:
        channel.owner_id,

      ownerUsername:
        ownerResult.rows[0]
          ?.username ?? null,
    };
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
};

/*
  ========================================
  ESKİ PLATFORM ROL YÖNETİMİ

  ŞİMDİLİK DURUYOR.
  ODA ROLLERİNİ AYRI YAPACAĞIZ.
  ========================================
*/
export const updateMemberRole =
  async (
    actorUserId: number,
    targetUserId: number,
    newRole: ServerRole
  ) => {
    const actorRole =
      await getMemberRole(
        actorUserId
      );

    if (!actorRole) {
      throw new Error(
        "ACTOR_NOT_MEMBER"
      );
    }

    if (
      actorRole !== "owner" &&
      actorRole !== "admin"
    ) {
      throw new Error(
        "ROLE_CHANGE_FORBIDDEN"
      );
    }

    const targetResult =
      await pool.query<{
        id: number;
        username: string;
        role: ServerRole;
      }>(
        `
          SELECT
            users.id,
            users.username,
            server_members.role
          FROM server_members
          INNER JOIN users
            ON users.id =
               server_members.user_id
          WHERE
            server_members.server_id = $1
            AND users.id = $2
        `,
        [1, targetUserId]
      );

    if (
      targetResult.rows.length ===
      0
    ) {
      throw new Error(
        "TARGET_NOT_FOUND"
      );
    }

    const target =
      targetResult.rows[0];

    if (
      target.role === "owner"
    ) {
      throw new Error(
        "OWNER_ROLE_LOCKED"
      );
    }

    if (
      newRole === "owner"
    ) {
      throw new Error(
        "OWNER_ROLE_CANNOT_BE_ASSIGNED"
      );
    }

    if (
      actorRole === "admin"
    ) {
      if (
        target.role ===
        "admin"
      ) {
        throw new Error(
          "ADMIN_TARGET_FORBIDDEN"
        );
      }

      if (
        newRole ===
        "admin"
      ) {
        throw new Error(
          "ADMIN_ASSIGN_FORBIDDEN"
        );
      }
    }

    const updateResult =
      await pool.query<{
        role: ServerRole;
      }>(
        `
          UPDATE server_members
          SET role = $1
          WHERE server_id = $2
            AND user_id = $3
          RETURNING role
        `,
        [
          newRole,
          1,
          targetUserId,
        ]
      );

    return {
      id:
        target.id,

      username:
        target.username,

      role:
        updateResult.rows[0]
          .role,
    };
  };
  export type ChannelRole =
  | "owner"
  | "admin"
  | "moderator"
  | "member";

/*
  ========================================
  ODA ÜYELERİNİ GETİR
  ========================================
*/
export const getChannelMembers = async (
  channelId: number
) => {
  const result = await pool.query<{
    id: number;
    username: string;
    role: ChannelRole;
  }>(
    `
      SELECT
        users.id,
        users.username,
        channel_members.role
      FROM channel_members
      INNER JOIN users
        ON users.id = channel_members.user_id
      WHERE channel_members.channel_id = $1
      ORDER BY
        CASE channel_members.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'moderator' THEN 3
          ELSE 4
        END,
        users.username ASC
    `,
    [channelId]
  );

  return result.rows;
};

/*
  ========================================
  ODA İÇİ ROL DEĞİŞTİR
  ========================================
*/
export const updateChannelMemberRole =
  async (
    actorUserId: number,
    channelId: number,
    targetUserId: number,
    newRole: ChannelRole
  ) => {
    /*
      İşlemi yapan kişi bu odanın
      sahibi mi?
    */
    const actorResult =
      await pool.query<{
        role: ChannelRole;
      }>(
        `
          SELECT role
          FROM channel_members
          WHERE channel_id = $1
            AND user_id = $2
        `,
        [
          channelId,
          actorUserId,
        ]
      );

    if (
      actorResult.rows.length === 0 ||
      actorResult.rows[0].role !== "owner"
    ) {
      throw new Error(
        "CHANNEL_ROLE_FORBIDDEN"
      );
    }

    /*
      Hedef kullanıcı odada mı?
    */
    const targetResult =
      await pool.query<{
        role: ChannelRole;
      }>(
        `
          SELECT role
          FROM channel_members
          WHERE channel_id = $1
            AND user_id = $2
        `,
        [
          channelId,
          targetUserId,
        ]
      );

    if (
      targetResult.rows.length === 0
    ) {
      throw new Error(
        "CHANNEL_MEMBER_NOT_FOUND"
      );
    }

    /*
      Oda sahibinin rolü değiştirilemez.
    */
    if (
      targetResult.rows[0].role === "owner"
    ) {
      throw new Error(
        "CHANNEL_OWNER_LOCKED"
      );
    }

    /*
      Başka bir owner atanamaz.
    */
    if (newRole === "owner") {
      throw new Error(
        "CHANNEL_OWNER_CANNOT_BE_ASSIGNED"
      );
    }

    const result =
      await pool.query<{
        role: ChannelRole;
      }>(
        `
          UPDATE channel_members
          SET role = $1
          WHERE channel_id = $2
            AND user_id = $3
          RETURNING role
        `,
        [
          newRole,
          channelId,
          targetUserId,
        ]
      );

    return {
      userId:
        targetUserId,

      channelId,

      role:
        result.rows[0].role,
    };
  };