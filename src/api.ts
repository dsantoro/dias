import type { Countdown, User } from "./countdowns";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<Result>(path: string, options: RequestInit = {}): Promise<Result> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "same-origin",
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error("Nao foi possivel conectar ao servidor. Tente novamente.");
  }
  if (response.status === 204) return undefined as Result;
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("A API esta indisponivel. Verifique se o servidor esta em execucao.");
  }
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error ?? "Nao foi possivel concluir a operacao.", response.status);
  return data as Result;
}

export const api = {
  getSession: (signal?: AbortSignal) => request<{ user: User | null }>("/session", { signal }),
  createUser: (name: string, username: string, password: string) => request<{ user: User }>("/users", { method: "POST", body: JSON.stringify({ name, username, password }) }),
  enter: (username: string, password: string) => request<{ user: User }>("/session", { method: "POST", body: JSON.stringify({ username, password }) }),
  leave: () => request<void>("/session", { method: "DELETE" }),
  getEvents: (signal?: AbortSignal) => request<Countdown[]>("/events", { signal }),
  saveEvent: (values: Omit<Countdown, "id">, id?: string) => request<Countdown>(id ? `/events/${encodeURIComponent(id)}` : "/events", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(values),
  }),
  deleteEvent: (id: string) => request<void>(`/events/${encodeURIComponent(id)}`, { method: "DELETE" }),
};