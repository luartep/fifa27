import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "mundial_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 días

// Usuario único, fijo, como se acordó: apuesta / apuesta.
// Cambiar la clave acá si se quiere rotarla (no hay tabla de usuarios, a propósito).
const FIXED_USERNAME = "apuesta";
const FIXED_PASSWORD = "apuesta";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Falta AUTH_SECRET en las variables de entorno. Generar una con: openssl rand -base64 32"
    );
  }
  return new TextEncoder().encode(secret);
}

export function checkCredentials(username: string, password: string): boolean {
  return username === FIXED_USERNAME && password === FIXED_PASSWORD;
}

export async function createSession(): Promise<string> {
  const token = await new SignJWT({ user: FIXED_USERNAME })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
  return token;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
