import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = process.env.NEXTAUTH_SECRET ?? "hfs-secret-2024";
const COOKIE = "hfs_token";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function setAuthCookie(token: string, res: Response) {
  res.headers.set(
    "Set-Cookie",
    `${COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`
  );
}

export const COOKIE_NAME = COOKIE;
