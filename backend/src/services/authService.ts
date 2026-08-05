import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

type User = {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  role: "owner" | "member";
};

const users: User[] = [];

const JWT_SECRET = "voiceconnect_secret_key";

export const registerUser = async (
  username: string,
  email: string,
  password: string
) => {
  const existingUser = users.find((user) => user.email === email);

  if (existingUser) {
    throw new Error("Bu e-posta adresi zaten kayıtlı.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser: User = {
    id: users.length + 1,
    username,
    email,
    passwordHash,
    role: users.length === 0 ? "owner" : "member",
  };

  users.push(newUser);

  return {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    role: newUser.role,
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = users.find((item) => item.email === email);

  if (!user) {
    throw new Error("E-posta veya şifre hatalı.");
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);

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
  JWT_SECRET,
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