import type {
  Request,
  RequestHandler,
} from "express";

import type {
  AuthPayload,
} from "../middlewares/authMiddleware";

import {
  createChannel,
  getCategories,
  getChannelMembers,
  getMembers,
  getServerInfo,
  updateChannelMemberRole,
  updateMemberRole,
} from "../services/workspaceService";

import type {
  ChannelRole,
  ServerRole,
} from "../services/workspaceService";

type AuthenticatedRequest =
  Request & {
    user: AuthPayload;
  };

export const getServer: RequestHandler =
  async (_req, res) => {
    try {
      const server =
        await getServerInfo();

      res.json({
        success: true,
        data: server,
      });
    } catch {
      res.status(500).json({
        success: false,
        message:
          "Sunucu bilgisi alınamadı.",
      });
    }
  };

export const getWorkspaceCategories: RequestHandler =
  async (_req, res) => {
    try {
      const categories =
        await getCategories();

      res.json({
        success: true,
        data: categories,
      });
    } catch {
      res.status(500).json({
        success: false,
        message:
          "Kategori ve kanal bilgileri alınamadı.",
      });
    }
  };

export const getWorkspaceMembers: RequestHandler =
  async (_req, res) => {
    try {
      const members =
        await getMembers();

      res.json({
        success: true,
        data: members,
      });
    } catch {
      res.status(500).json({
        success: false,
        message:
          "Üye bilgileri alınamadı.",
      });
    }
  };

/*
  ========================================
  YENİ ODA OLUŞTUR
  ========================================
*/
export const createWorkspaceChannel: RequestHandler =
  async (req, res) => {
    try {
      const {
        categoryId,
        name,
        type,
      } = req.body;

      const user =
        (
          req as
            AuthenticatedRequest
        ).user;

      if (
        !categoryId ||
        !name ||
        !type
      ) {
        res.status(400).json({
          success: false,
          message:
            "Kategori, oda adı ve oda türü zorunludur.",
        });

        return;
      }

      const cleanedName =
        String(name).trim();

      if (
        cleanedName.length < 2
      ) {
        res.status(400).json({
          success: false,
          message:
            "Oda adı en az 2 karakter olmalıdır.",
        });

        return;
      }

      if (
        cleanedName.length >
        100
      ) {
        res.status(400).json({
          success: false,
          message:
            "Oda adı en fazla 100 karakter olabilir.",
        });

        return;
      }

      const allowedTypes = [
        "voice",
        "meeting",
        "study",
        "temporary",
      ];

      if (
        !allowedTypes.includes(
          String(type)
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Geçersiz oda türü.",
        });

        return;
      }

      const channel =
        await createChannel(
          {
            categoryId:
              Number(
                categoryId
              ),

            name:
              cleanedName,

            type:
              String(type),
          },
          user.id
        );

      res.status(201).json({
        success: true,
        message:
          "Oda başarıyla oluşturuldu.",
        data: channel,
      });
    } catch (error) {
      if (
        error instanceof Error
      ) {
        if (
          error.message ===
          "CHANNEL_CREATE_FORBIDDEN"
        ) {
          res.status(403).json({
            success: false,
            message:
              "Bu işlem için Kurucu veya Yönetici olmalısın.",
          });

          return;
        }

        if (
          error.message ===
          "CATEGORY_NOT_FOUND"
        ) {
          res.status(404).json({
            success: false,
            message:
              "Seçilen kategori bulunamadı.",
          });

          return;
        }

        if (
          error.message ===
          "CHANNEL_ALREADY_EXISTS"
        ) {
          res.status(409).json({
            success: false,
            message:
              "Bu kategoride aynı isimde bir oda zaten var.",
          });

          return;
        }
      }

      console.error(
        "Oda oluşturma hatası:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Oda oluşturulamadı.",
      });
    }
  };

/*
  ========================================
  ÜYE ROLÜ DEĞİŞTİR
  ========================================
*/
export const updateWorkspaceMemberRole: RequestHandler =
  async (req, res) => {
    try {
      const user =
        (
          req as
            AuthenticatedRequest
        ).user;

      const targetUserId =
        Number(
          req.params.userId
        );

      const role =
        String(
          req.body.role || ""
        ) as ServerRole;

      if (
        !Number.isInteger(
          targetUserId
        ) ||
        targetUserId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Geçersiz kullanıcı.",
        });

        return;
      }

      const allowedRoles: ServerRole[] =
        [
          "admin",
          "moderator",
          "member",
        ];

      if (
        !allowedRoles.includes(
          role
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Geçersiz rol.",
        });

        return;
      }

      const updatedMember =
        await updateMemberRole(
          user.id,
          targetUserId,
          role
        );

      res.json({
        success: true,
        message:
          "Kullanıcı rolü güncellendi.",
        data:
          updatedMember,
      });
    } catch (error) {
      if (
        error instanceof Error
      ) {
        switch (
          error.message
        ) {
          case "ROLE_CHANGE_FORBIDDEN":
          case "ACTOR_NOT_MEMBER":
            res.status(403).json({
              success: false,
              message:
                "Rol değiştirme yetkin yok.",
            });
            return;

          case "TARGET_NOT_FOUND":
            res.status(404).json({
              success: false,
              message:
                "Kullanıcı bulunamadı.",
            });
            return;

          case "OWNER_ROLE_LOCKED":
            res.status(403).json({
              success: false,
              message:
                "Kurucunun rolü değiştirilemez.",
            });
            return;

          case "OWNER_ROLE_CANNOT_BE_ASSIGNED":
            res.status(403).json({
              success: false,
              message:
                "Kurucu rolü bu ekrandan atanamaz.",
            });
            return;

          case "ADMIN_TARGET_FORBIDDEN":
            res.status(403).json({
              success: false,
              message:
                "Yönetici başka bir yöneticinin rolünü değiştiremez.",
            });
            return;

          case "ADMIN_ASSIGN_FORBIDDEN":
            res.status(403).json({
              success: false,
              message:
                "Sadece Kurucu Yönetici atayabilir.",
            });
            return;
        }
      }

      console.error(
        "Rol güncelleme hatası:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Rol güncellenemedi.",
      });
    }
  };
  /*
  ========================================
  ODA ÜYELERİNİ GETİR
  ========================================
*/
export const getWorkspaceChannelMembers: RequestHandler =
  async (req, res) => {
    try {
      const channelId =
        Number(
          req.params.channelId
        );

      if (
        !Number.isInteger(
          channelId
        ) ||
        channelId <= 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Geçersiz oda.",
        });

        return;
      }

      const members =
        await getChannelMembers(
          channelId
        );

      res.json({
        success: true,
        data: members,
      });
    } catch (error) {
      console.error(
        "Oda üyeleri alınamadı:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Oda üyeleri alınamadı.",
      });
    }
  };

/*
  ========================================
  ODA ROLÜ GÜNCELLE
  ========================================
*/
export const updateWorkspaceChannelMemberRole: RequestHandler =
  async (req, res) => {
    try {
      const user =
        (
          req as AuthenticatedRequest
        ).user;

      const channelId =
        Number(
          req.params.channelId
        );

      const targetUserId =
        Number(
          req.params.userId
        );

      const role =
        String(
          req.body.role || ""
        ) as ChannelRole;

      const allowedRoles: ChannelRole[] =
        [
          "admin",
          "moderator",
          "member",
        ];

      if (
        !allowedRoles.includes(
          role
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            "Geçersiz oda rolü.",
        });

        return;
      }

      const result =
        await updateChannelMemberRole(
          user.id,
          channelId,
          targetUserId,
          role
        );

      res.json({
        success: true,
        message:
          "Oda rolü güncellendi.",
        data: result,
      });
    } catch (error) {
      if (
        error instanceof Error
      ) {
        if (
          error.message ===
          "CHANNEL_ROLE_FORBIDDEN"
        ) {
          res.status(403).json({
            success: false,
            message:
              "Bu odadaki rolleri yalnızca oda sahibi yönetebilir.",
          });

          return;
        }

        if (
          error.message ===
          "CHANNEL_MEMBER_NOT_FOUND"
        ) {
          res.status(404).json({
            success: false,
            message:
              "Kullanıcı bu odada bulunamadı.",
          });

          return;
        }

        if (
          error.message ===
          "CHANNEL_OWNER_LOCKED"
        ) {
          res.status(403).json({
            success: false,
            message:
              "Oda sahibinin rolü değiştirilemez.",
          });

          return;
        }
      }

      console.error(
        "Oda rolü güncellenemedi:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Oda rolü güncellenemedi.",
      });
    }
  };