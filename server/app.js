import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import { emojiOptions, isValidDate } from "./validation.js";

const cookieName = "dias_session";
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;

export function createApp(database) {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", (_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api", (request, response, next) => {
    const origin = request.get("origin");
    if (origin && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      try {
        if (new URL(origin).host !== request.get("host")) {
          return response.status(403).json({ error: "Origem nao permitida." });
        }
      } catch {
        return response.status(403).json({ error: "Origem invalida." });
      }
    }
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());

  async function currentUser(request) {
    const token = request.cookies[cookieName];
    if (typeof token !== "string") return null;
    return database.getSessionUser(token, Date.now());
  }

  async function startSession(request, response, user) {
    await database.deleteExpiredSessions(Date.now());
    if (typeof request.cookies[cookieName] === "string") {
      await database.deleteSession(request.cookies[cookieName]);
    }
    const token = randomBytes(32).toString("hex");
    await database.createSession(token, user.id, Date.now() + sessionLifetime);
    response.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.secure,
      path: "/",
      maxAge: sessionLifetime,
    });
  }

  app.post("/api/users", async (request, response) => {
    const name =
      typeof request.body?.name === "string" ? request.body.name.trim() : "";
    const username =
      typeof request.body?.username === "string"
        ? request.body.username.trim().toLowerCase()
        : "";
    const password =
      typeof request.body?.password === "string" ? request.body.password : "";
    if (
      name.length < 2 ||
      name.length > 60 ||
      !/^[a-z0-9_]{3,32}$/.test(username) ||
      password.length < 8 ||
      password.length > 128
    ) {
      return response.status(400).json({
        error: "Informe nome, usuario valido e senha de 8 a 128 caracteres.",
      });
    }
    const salt = randomBytes(16);
    const passwordHash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;
    let user;
    try {
      user = await database.createUser({
        id: randomUUID(),
        name,
        username,
        password_hash: passwordHash,
      });
    } catch (error) {
      if (error.code === "23505") {
        return response
          .status(409)
          .json({ error: "Este nome de usuario ja esta em uso." });
      }
      throw error;
    }
    await startSession(request, response, user);
    response.status(201).json({ user });
  });

  app.get("/api/session", async (request, response) => {
    response.json({ user: await currentUser(request) });
  });

  app.post("/api/session", async (request, response) => {
    const username =
      typeof request.body?.username === "string"
        ? request.body.username.trim().toLowerCase()
        : "";
    const password =
      typeof request.body?.password === "string" ? request.body.password : "";
    const user = /^[a-z0-9_]{3,32}$/.test(username)
      ? await database.getUserByUsername(username)
      : null;
    const [algorithm, saltHex, hashHex] = (user?.password_hash ?? "").split(
      "$",
    );
    const salt = Buffer.from(saltHex ?? "", "hex");
    const expectedHash = Buffer.from(hashHex ?? "", "hex");
    const validHash =
      algorithm === "scrypt" &&
      salt.length === 16 &&
      expectedHash.length === 64 &&
      password.length <= 128;
    const actualHash = validHash
      ? scryptSync(password, salt, 64)
      : Buffer.alloc(64);
    if (!validHash || !timingSafeEqual(actualHash, expectedHash)) {
      return response
        .status(401)
        .json({ error: "Usuario ou senha incorretos." });
    }
    const publicUser = {
      id: user.id,
      name: user.name,
      username: user.username,
    };
    await startSession(request, response, publicUser);
    response.json({ user: publicUser });
  });

  app.delete("/api/session", async (request, response) => {
    if (typeof request.cookies[cookieName] === "string") {
      await database.deleteSession(request.cookies[cookieName]);
    }
    response.clearCookie(cookieName, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.secure,
      path: "/",
    });
    response.sendStatus(204);
  });

  app.use("/api/events", async (request, response, next) => {
    const user = await currentUser(request);
    if (!user)
      return response
        .status(401)
        .json({ error: "Entre com usuario e senha para continuar." });
    response.locals.userId = user.id;
    next();
  });

  app.get("/api/events", async (_request, response) => {
    response.json(await database.listEvents(response.locals.userId));
  });

  app.get("/api/events/:id", async (request, response) => {
    const event = await database.getEvent(
      request.params.id,
      response.locals.userId,
    );
    if (!event)
      return response.status(404).json({ error: "Data nao encontrada." });
    response.json(event);
  });

  function validateEvent(request, response, next) {
    const title =
      typeof request.body?.title === "string" ? request.body.title.trim() : "";
    const emoji = request.body?.emoji;
    const date = request.body?.date;
    if (
      !title ||
      title.length > 80 ||
      !emojiOptions.some(([option]) => option === emoji) ||
      typeof date !== "string" ||
      !isValidDate(date)
    ) {
      return response.status(400).json({
        error:
          "Informe um titulo de ate 80 caracteres, um emoji e uma data valida.",
      });
    }
    response.locals.event = { title, emoji, date };
    next();
  }

  app.post("/api/events", validateEvent, async (_request, response) => {
    const event = await database.createEvent(
      { id: randomUUID(), ...response.locals.event },
      response.locals.userId,
    );
    response.status(201).json(event);
  });

  app.put("/api/events/:id", validateEvent, async (request, response) => {
    const event = { id: request.params.id, ...response.locals.event };
    const saved = await database.updateEvent(event, response.locals.userId);
    if (!saved)
      return response.status(404).json({ error: "Data nao encontrada." });
    response.json(saved);
  });

  app.delete("/api/events/:id", async (request, response) => {
    const deleted = await database.deleteEvent(
      request.params.id,
      response.locals.userId,
    );
    if (!deleted)
      return response.status(404).json({ error: "Data nao encontrada." });
    response.sendStatus(204);
  });

  app.use("/api", (_request, response) => {
    response.status(404).json({ error: "Endpoint nao encontrado." });
  });

  app.use((error, _request, response, _next) => {
    if (error.type === "entity.parse.failed")
      return response.status(400).json({ error: "JSON invalido." });
    if (error.type === "entity.too.large")
      return response.status(413).json({ error: "Dados muito grandes." });
    if (["PGRST204", "PGRST205", "42P01"].includes(error.code)) {
      return response.status(503).json({
        error:
          "As tabelas do Supabase nao estao configuradas. Execute supabase/schema.sql no SQL Editor do projeto.",
      });
    }
    console.error(error);
    response
      .status(500)
      .json({ error: "Nao foi possivel concluir a operacao." });
  });

  return app;
}
