import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/database";
import { env } from "../config/env";

type UserRow = {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: "owner" | "member";
};

export const registerUser = async (
  username: string,
  email: string,
  password: string
) => {
  const existingUserResult = await pool.query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (existingUserResult.rows.length > 0) {
    throw new Error("Bu e-posta adresi zaten kayıtlı.");
  }

  const userCountResult = await pool.query<{ count: string }>(
    "SELECT COUNT(*) FROM users"
  );

  const userCount = Number(userCountResult.rows[0].count);
  const role = userCount === 0 ? "owner" : "member";

  const passwordHash = await bcrypt.hash(password, 10);

  const newUserResult = await pool.query<UserRow>(
    `INSERT INTO users (username, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, email, password_hash, role`,
    [username, email, passwordHash, role]
  );

  const newUser = newUserResult.rows[0];

  await pool.query(
    `INSERT INTO server_members (server_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (server_id, user_id) DO NOTHING`,
    [1, newUser.id, newUser.role]
  );

  return {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    role: newUser.role,
  };
};

export const loginUser = async (email: string, password: string) => {
  const userResult = await pool.query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (userResult.rows.length === 0) {
    throw new Error("E-posta veya şifre hatalı.");
  }

  const user = userResult.rows[0];

  const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordCorrect) {
    throw new Error("E-posta veya şifre hatalı.");
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
};