export function createSupabaseStore({ SUPABASE_URL, SUPABASE_SECRET_KEY }) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_URL e SUPABASE_SECRET_KEY sao obrigatorios.");
  }

  const baseUrl = new URL("/rest/v1/", SUPABASE_URL);

  async function request(
    table,
    { method = "GET", query = {}, body, prefer } = {},
  ) {
    const url = new URL(table, baseUrl);
    for (const [key, value] of Object.entries(query))
      url.searchParams.set(key, value);
    const response = await fetch(url, {
      method,
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(prefer ? { Prefer: prefer } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    const result = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const error = new Error(result?.message ?? "Erro ao acessar o Supabase.");
      error.code = result?.code;
      error.status = response.status;
      throw error;
    }
    return result;
  }

  return {
    getUserByUsername: async (username) =>
      (
        await request("users", {
          query: {
            select: "id,name,username,password_hash",
            username: `eq.${username}`,
            limit: "1",
          },
        })
      )[0] ?? null,
    createUser: async (user) =>
      (
        await request("users", {
          method: "POST",
          query: { select: "id,name,username" },
          body: user,
          prefer: "return=representation",
        })
      )[0],
    deleteExpiredSessions: (now) =>
      request("sessions", {
        method: "DELETE",
        query: { expires_at: `lte.${now}` },
      }),
    deleteSession: (token) =>
      request("sessions", {
        method: "DELETE",
        query: { token: `eq.${token}` },
      }),
    createSession: (token, userId, expiresAt) =>
      request("sessions", {
        method: "POST",
        body: { token, user_id: userId, expires_at: expiresAt },
      }),
    getSessionUser: async (token, now) => {
      const sessions = await request("sessions", {
        query: {
          select: "user_id",
          token: `eq.${token}`,
          expires_at: `gt.${now}`,
          limit: "1",
        },
      });
      if (!sessions[0]) return null;
      const users = await request("users", {
        query: {
          select: "id,name,username",
          id: `eq.${sessions[0].user_id}`,
          limit: "1",
        },
      });
      return users[0] ?? null;
    },
    listEvents: (userId) =>
      request("events", {
        query: {
          select: "id,title,emoji,date",
          user_id: `eq.${userId}`,
          order: "date.asc,created_at.asc",
        },
      }),
    getEvent: async (id, userId) =>
      (
        await request("events", {
          query: {
            select: "id,title,emoji,date",
            id: `eq.${id}`,
            user_id: `eq.${userId}`,
            limit: "1",
          },
        })
      )[0] ?? null,
    createEvent: async (event, userId) =>
      (
        await request("events", {
          method: "POST",
          query: { select: "id,title,emoji,date" },
          body: { ...event, user_id: userId },
          prefer: "return=representation",
        })
      )[0],
    updateEvent: async (event, userId) =>
      (
        await request("events", {
          method: "PATCH",
          query: {
            select: "id,title,emoji,date",
            id: `eq.${event.id}`,
            user_id: `eq.${userId}`,
          },
          body: { title: event.title, emoji: event.emoji, date: event.date },
          prefer: "return=representation",
        })
      )[0] ?? null,
    deleteEvent: async (id, userId) =>
      (
        await request("events", {
          method: "DELETE",
          query: { select: "id", id: `eq.${id}`, user_id: `eq.${userId}` },
          prefer: "return=representation",
        })
      ).length > 0,
  };
}
