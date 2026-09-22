import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT) || 5000,

  JWT_SECRET:
    process.env.JWT_SECRET ||
    "voiceconnect_secret_key",

  DATABASE_URL:
    process.env.DATABASE_URL || "",

  CLOUDFLARE_REALTIME_APP_ID:
    process.env.CLOUDFLARE_REALTIME_APP_ID ||
    "",

  CLOUDFLARE_REALTIME_APP_SECRET:
    process.env
      .CLOUDFLARE_REALTIME_APP_SECRET ||
    "",
};