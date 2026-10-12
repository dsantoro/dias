import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./app.js";

function createMemoryStore() {
  const users = new Map();
  const sessions = new Map();
  const events = new Map();
  const publicUser = ({ id, name, username }) => ({ id, name, username });
  return {
    users,
    sessions,
    getUserByUsername: async (username) =>
      [...users.values()].find((user) => user.username === username) ?? null,
    createUser: async (user) => {
      if ([...users.values()].some((item) => item.username === user.username)) {
        const error = new Error("Duplicate username");
        error.code = "23505";
        throw error;
      }
      users.set(user.id, user);
      return publicUser(user);
    },
    deleteExpiredSessions: async (now) => {
      for (const [token, session] of sessions) {
        if (session.expires_at <= now) sessions.delete(token);
      }
    },
    deleteSession: async (token) => sessions.delete(token),
    createSession: async (token, userId, expiresAt) => {
      sessions.set(token, { user_id: userId, expires_at: expiresAt });
    },
    getSessionUser: async (token, now) => {
      const session = sessions.get(token);
      return session && session.expires_at > now
        ? publicUser(users.get(session.user_id) ?? {})
        : null;
    },
    listEvents: async (userId) =>
      [...events.values()]
        .filter((event) => event.user_id === userId)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(({ id, title, emoji, date }) => ({ id, title, emoji, date })),
    getEvent: async (id, userId) => {
      const event = events.get(id);
      return event?.user_id === userId
        ? { id, title: event.title, emoji: event.emoji, date: event.date }
        : null;
    },
    createEvent: async (event, userId) => {
      const saved = { ...event, user_id: userId };
      events.set(event.id, saved);
      return {
        id: saved.id,
        title: saved.title,
        emoji: saved.emoji,
        date: saved.date,
      };
    },
    updateEvent: async (event, userId) => {
      const saved = events.get(event.id);
      if (!saved || saved.user_id !== userId) return null;
      Object.assign(saved, event);
      return {
        id: saved.id,
        title: saved.title,
        emoji: saved.emoji,
        date: saved.date,
      };
    },
    deleteEvent: async (id, userId) => {
      if (events.get(id)?.user_id !== userId) return false;
      return events.delete(id);
    },
  };
}

async function setup(context, store = createMemoryStore()) {
  const server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  context.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(
    path,
    { method = "GET", body, cookie, expected = 200 } = {},
  ) {
    const response = await fetch(`${base}/api${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    assert.equal(response.status, expected, `${method} ${path}`);
    const data = response.status === 204 ? null : await response.json();
    return { data, cookie: response.headers.get("set-cookie")?.split(";")[0] };
  }
  return { store, request };
}

const example = { title: "Viagem", emoji: "\u2708\ufe0f", date: "2026-11-25" };

test("users authenticate by typed username and sessions can be revoked", async (context) => {
  const { request } = await setup(context);
  assert.equal((await request("/session")).data.user, null);
  await request("/users", {
    method: "POST",
    body: { name: "A", username: "a", password: "12345678" },
    expected: 400,
  });
  const created = await request("/users", {
    method: "POST",
    body: { name: "Ana Silva", username: "ANA", password: "correct horse" },
    expected: 201,
  });
  assert.equal(created.data.user.username, "ana");
  assert.equal("password_hash" in created.data.user, false);
  assert.equal(
    (await request("/session", { cookie: created.cookie })).data.user.id,
    created.data.user.id,
  );
  await request("/users", {
    method: "POST",
    body: { name: "Outra Ana", username: "ana", password: "correct horse" },
    expected: 409,
  });
  await request("/users", { expected: 404 });
  await request("/session", {
    method: "POST",
    body: { username: "missing", password: "correct horse" },
    expected: 401,
  });
  await request("/session", {
    method: "POST",
    body: { username: "ana", password: "wrong password" },
    expected: 401,
  });
  const selected = await request("/session", {
    method: "POST",
    body: { username: "ANA", password: "correct horse" },
    cookie: created.cookie,
  });
  assert.equal(
    (await request("/session", { cookie: created.cookie })).data.user,
    null,
  );
  await request("/session", {
    method: "DELETE",
    cookie: selected.cookie,
    expected: 204,
  });
  await request("/events", { cookie: selected.cookie, expected: 401 });
});

test("events require a session and reject invalid dates or content", async (context) => {
  const { request } = await setup(context);
  await request("/events", { expected: 401 });
  await request("/events", { method: "POST", body: example, expected: 401 });
  const { cookie } = await request("/users", {
    method: "POST",
    body: { name: "Ana", username: "ana", password: "correct horse" },
    expected: 201,
  });
  for (const body of [
    { ...example, date: "2026-02-30" },
    { ...example, title: " " },
    { ...example, emoji: "invalid" },
    { ...example, title: "x".repeat(81) },
  ]) {
    await request("/events", { method: "POST", cookie, body, expected: 400 });
  }
  const { data } = await request("/events", {
    method: "POST",
    cookie,
    body: { ...example, date: "2028-02-29" },
    expected: 201,
  });
  assert.equal(data.date, "2028-02-29");
});

test("another user cannot list, read, edit or delete someone else's events", async (context) => {
  const { request } = await setup(context);
  const first = await request("/users", {
    method: "POST",
    body: { name: "Ana", username: "ana", password: "correct horse" },
    expected: 201,
  });
  const second = await request("/users", {
    method: "POST",
    body: { name: "Bruno", username: "bruno", password: "correct horse" },
    expected: 201,
  });
  const created = await request("/events", {
    method: "POST",
    cookie: first.cookie,
    body: { ...example, user_id: second.data.user.id },
    expected: 201,
  });
  const path = `/events/${created.data.id}`;
  assert.equal(
    (await request("/events", { cookie: first.cookie })).data.length,
    1,
  );
  assert.deepEqual(
    (await request("/events", { cookie: second.cookie })).data,
    [],
  );
  await request(path, { cookie: second.cookie, expected: 404 });
  await request(path, {
    method: "PUT",
    cookie: second.cookie,
    body: { ...example, title: "Changed" },
    expected: 404,
  });
  await request(path, {
    method: "DELETE",
    cookie: second.cookie,
    expected: 404,
  });
  assert.equal(
    (await request(path, { cookie: first.cookie })).data.title,
    "Viagem",
  );
  await request(path, {
    method: "PUT",
    cookie: first.cookie,
    body: { ...example, title: "Ferias" },
  });
  assert.equal(
    (await request(path, { cookie: first.cookie })).data.title,
    "Ferias",
  );
  await request(path, {
    method: "DELETE",
    cookie: first.cookie,
    expected: 204,
  });
  assert.deepEqual(
    (await request("/events", { cookie: first.cookie })).data,
    [],
  );
});

test("expired sessions cannot retrieve dates", async (context) => {
  const { store, request } = await setup(context);
  const { cookie } = await request("/users", {
    method: "POST",
    body: { name: "Ana", username: "ana", password: "correct horse" },
    expected: 201,
  });
  for (const session of store.sessions.values()) session.expires_at = 0;
  await request("/events", { cookie, expected: 401 });
  assert.equal((await request("/session", { cookie })).data.user, null);
});

test("registration rejects short passwords and stores only a scrypt hash", async (context) => {
  const { store, request } = await setup(context);
  await request("/users", {
    method: "POST",
    body: { name: "Ana", username: "ana", password: "short" },
    expected: 400,
  });
  await request("/users", {
    method: "POST",
    body: { name: "Ana", username: "ana", password: "correct horse" },
    expected: 201,
  });
  const saved = [...store.users.values()][0];
  assert.match(saved.password_hash, /^scrypt\$/);
  assert.notEqual(saved.password_hash, "correct horse");
});

test("registration explains when Supabase tables have not been created", async (context) => {
  const store = {
    createUser: async () => {
      const error = new Error("Could not find public.users");
      error.code = "PGRST205";
      throw error;
    },
  };
  const { request } = await setup(context, store);
  const { data } = await request("/users", {
    method: "POST",
    body: { name: "Ana", username: "ana", password: "correct horse" },
    expected: 503,
  });
  assert.match(data.error, /supabase\/schema\.sql/);
});
