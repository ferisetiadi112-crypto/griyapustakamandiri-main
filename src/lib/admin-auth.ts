import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "gpm_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function getConfig() {
  const username = process.env["ADMIN_USERNAME"];
  const password = process.env["ADMIN_PASSWORD"];
  const secret = process.env["SESSION_SECRET"];
  if (!username || !password || !secret) return null;
  return { username, password, secret };
}

export const loginAdmin = createServerFn({ method: "POST" as const })
  .validator((input: { username: string; password: string }) => input)
  .handler(async ({ data }) => {
    const config = getConfig();
    if (!config) return { success: false, error: "config_missing" as const };

    const validUsername = safeEqual(data.username.trim(), config.username);
    const validPassword = safeEqual(data.password, config.password);
    if (!validUsername || !validPassword) {
      return { success: false, error: "invalid_credentials" as const };
    }

    const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
    const payload = `${config.username}.${expiresAt}`;
    const value = `${payload}.${sign(payload, config.secret)}`;

    setCookie(COOKIE_NAME, value, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return { success: true as const };
  });

export const getAdminSession = createServerFn({ method: "GET" as const })
  .handler(async () => {
    const config = getConfig();
    const value = getCookie(COOKIE_NAME);
    if (!config || !value) return { authenticated: false };

    const parts = value.split(".");
    if (parts.length !== 3) return { authenticated: false };
    const [username, expiryText, receivedSignature] = parts;
    const expiresAt = Number(expiryText);
    if (!username || !expiryText || !receivedSignature || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return { authenticated: false };
    }

    const payload = `${username}.${expiryText}`;
    if (!safeEqual(receivedSignature, sign(payload, config.secret)) || !safeEqual(username, config.username)) {
      return { authenticated: false };
    }

    return { authenticated: true, username };
  });

export const logoutAdmin = createServerFn({ method: "POST" as const })
  .handler(async () => {
    deleteCookie(COOKIE_NAME, { path: "/" });
    return { success: true };
  });
