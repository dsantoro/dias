import { useState } from "react";
import {
  ArrowRight,
  LoaderCircle,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { api } from "../api";
import type { User } from "../countdowns";

export default function UsersPage({
  onEnter,
  disabled,
}: {
  onEnter: (user: User) => Promise<void>;
  disabled: boolean;
}) {
  const [mode, setMode] = useState<"enter" | "create">("enter");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || disabled) return;
    setPending(true);
    setError("");
    try {
      const result =
        mode === "enter"
          ? await api.enter(username, password)
          : await api.createUser(name, username, password);
      await onEnter(result.user);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Nao foi possivel entrar.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="page-heading">
        <span className="eyebrow">SEU ESPACO</span>
        <h1>
          Seus momentos<span>.</span>
        </h1>
        <div className="heading-bottom">
          <p>Cada pessoa, suas datas.</p>
          <UserRound className="user-heading-icon" size={26} />
        </div>
      </section>
      <div className="user-tabs" role="group" aria-label="Acesso de usuario">
        <button
          type="button"
          aria-pressed={mode === "enter"}
          disabled={pending || disabled}
          onClick={() => {
            setMode("enter");
            setError("");
          }}
        >
          <UserRound size={16} />
          Entrar
        </button>
        <button
          type="button"
          aria-pressed={mode === "create"}
          disabled={pending || disabled}
          onClick={() => {
            setMode("create");
            setError("");
          }}
        >
          <UserRoundPlus size={16} />
          Criar usuario
        </button>
      </div>
      <section
        className="editor registration-editor user-editor"
        aria-label={mode === "enter" ? "Entrar como usuario" : "Criar usuario"}
      >
        <form onSubmit={submit}>
          {mode === "create" && (
            <>
              <label htmlFor="name">Nome</label>
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                minLength={2}
                maxLength={60}
                disabled={pending || disabled}
                required
              />
            </>
          )}
          <label htmlFor="username">Nome de usuario</label>
          <input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            autoComplete="username"
            pattern="[a-z0-9_]{3,32}"
            title="De 3 a 32 letras minusculas, numeros ou sublinhados"
            minLength={3}
            maxLength={32}
            disabled={pending || disabled}
            required
          />
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={
              mode === "enter" ? "current-password" : "new-password"
            }
            minLength={8}
            maxLength={128}
            disabled={pending || disabled}
            required
          />
          <div className="form-bottom">
            <button
              className="save-button"
              type="submit"
              disabled={pending || disabled || !username || !password}
            >
              {pending ? (
                <LoaderCircle className="spinning" size={17} />
              ) : mode === "enter" ? (
                <ArrowRight size={17} />
              ) : (
                <UserRoundPlus size={17} />
              )}
              {pending
                ? "Aguarde..."
                : mode === "enter"
                  ? "Entrar"
                  : "Criar e entrar"}
            </button>
          </div>
          {error && (
            <p className="storage-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </section>
    </>
  );
}
