import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  matchPath,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  List,
  Plus,
  LogOut,
  LoaderCircle,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { formatDate, getRemainingDays, localDate } from "./dates";
import type { Countdown, Filter, User } from "./countdowns";
import { api, ApiError } from "./api";
import DateFormPage from "./pages/DateFormPage";
import CountdownsPage from "./pages/CountdownsPage";
import UsersPage from "./pages/UsersPage";
import "./App.css";

function DatesApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Countdown[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [today, setToday] = useState(() => localDate());
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [notice, setNotice] = useState("");
  const editingId = matchPath("/editar/:id", location.pathname)?.params.id;
  const editingEvent = events.find((event) => event.id === editingId);
  const isListPage = location.pathname === "/";
  const isEditorPage = location.pathname === "/nova" || Boolean(editingEvent);
  const isUserPage = location.pathname === "/usuarios";

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const session = await api.getSession(controller.signal);
        const saved = session.user
          ? await api.getEvents(controller.signal)
          : [];
        if (controller.signal.aborted) return;
        setUser(session.user);
        setEvents(saved);
      } catch (failure) {
        if (controller.signal.aborted) return;
        setStartupError(
          failure instanceof Error
            ? failure.message
            : "Nao foi possivel carregar suas datas.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    const update = () => setToday(localDate());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);

  function openForm(event?: Countdown) {
    if (busy) return;
    setNotice("");
    setRequestError("");
    navigate(event ? `/editar/${encodeURIComponent(event.id)}` : "/nova");
  }

  function handleExpiredSession(failure: unknown) {
    if (failure instanceof ApiError && failure.status === 401) {
      setUser(null);
      setEvents([]);
      navigate("/usuarios", { replace: true });
    }
  }

  async function saveEvent(values: Omit<Countdown, "id">) {
    setBusy(true);
    setRequestError("");
    try {
      const countdown = await api.saveEvent(values, editingId);
      setEvents((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? countdown : item))
          : [...current, countdown],
      );
      setFilter(getRemainingDays(values.date, today) < 0 ? "past" : "upcoming");
      setNotice(editingId ? "Data atualizada." : "Data adicionada.");
      navigate("/", { replace: true });
    } catch (failure) {
      handleExpiredSession(failure);
      throw failure;
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent(event: Countdown) {
    if (busy || !window.confirm(`Excluir "${event.title}"?`)) return;
    setBusy(true);
    setRequestError("");
    try {
      await api.deleteEvent(event.id);
      setEvents((current) => current.filter((item) => item.id !== event.id));
      setNotice("Data excluida.");
    } catch (failure) {
      handleExpiredSession(failure);
      setRequestError(
        failure instanceof Error
          ? failure.message
          : "Nao foi possivel excluir a data.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function enterUser(selected: User) {
    setBusy(true);
    try {
      const saved = await api.getEvents();
      setEvents(saved);
      setUser(selected);
      setFilter("upcoming");
      setNotice("");
      setRequestError("");
      navigate("/", { replace: true });
    } finally {
      setBusy(false);
    }
  }

  async function leaveUser() {
    if (busy) return;
    setBusy(true);
    setRequestError("");
    try {
      await api.leave();
      setUser(null);
      setEvents([]);
      setNotice("");
      navigate("/usuarios");
    } catch (failure) {
      setRequestError(
        failure instanceof Error ? failure.message : "Nao foi possivel sair.",
      );
    } finally {
      setBusy(false);
    }
  }

  function menuClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (busy) event.preventDefault();
    else {
      setNotice("");
      setRequestError("");
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link
          className="brand"
          to="/"
          aria-label="Dias, inicio"
          onClick={menuClick}
        >
          <span className="brand-icon">
            <Clock3 size={21} />
          </span>
          dias<span className="brand-dot">.</span>
        </Link>
        <nav className="header-menu" aria-label="Menu principal">
          {user ? (
            <>
              <NavLink to="/" end onClick={menuClick} aria-disabled={busy}>
                <List size={14} />
                Minhas datas
              </NavLink>
              <NavLink to="/nova" onClick={menuClick} aria-disabled={busy}>
                <Plus size={14} />
                Nova data
              </NavLink>
            </>
          ) : (
            <NavLink to="/usuarios" onClick={menuClick}>
              <UserRound size={14} />
              Usuarios
            </NavLink>
          )}
        </nav>
        <span className="today">
          <CalendarDays size={14} />
          {formatDate(today, { day: "numeric", month: "short" })}
        </span>
      </header>
      {user && !loading && (
        <div className="account-bar">
          <span className="account-avatar" aria-hidden="true">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="account-name">
            <strong>{user.name}</strong>
            <span>@{user.username}</span>
          </div>
          <button
            className="switch-user"
            type="button"
            disabled={busy}
            onClick={() => void leaveUser()}
            title="Trocar usuario"
          >
            <LogOut size={14} />
            Trocar usuario
          </button>
        </div>
      )}
      {loading && (
        <section className="loading-state" role="status">
          <LoaderCircle className="spinning" size={22} />
          Carregando...
        </section>
      )}
      {!loading && startupError && (
        <section className="page-heading">
          <p className="storage-error" role="alert">
            {startupError}
          </p>
          <button
            className="empty-add"
            type="button"
            onClick={() => {
              setLoading(true);
              setStartupError("");
              setRetry((current) => current + 1);
            }}
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>
        </section>
      )}
      {!loading && !startupError && !user && !isUserPage && (
        <Navigate to="/usuarios" replace />
      )}
      {!loading && !startupError && isUserPage && (
        <UsersPage onEnter={enterUser} disabled={busy} />
      )}
      {!loading && !startupError && user && isListPage && (
        <CountdownsPage
          events={events}
          today={today}
          filter={filter}
          onFilterChange={setFilter}
          onOpenForm={openForm}
          onDelete={deleteEvent}
        />
      )}
      {!loading && !startupError && user && isEditorPage && (
        <DateFormPage
          key={editingEvent?.id ?? "new"}
          event={editingEvent}
          today={today}
          onSave={saveEvent}
        />
      )}
      {!loading &&
        !startupError &&
        user &&
        !isUserPage &&
        !isListPage &&
        !isEditorPage && (
          <section className="page-heading">
            <h1>
              {editingId ? "Data nao encontrada" : "Pagina nao encontrada"}
            </h1>
            <Link className="back-link" to="/">
              <ArrowLeft size={16} />
              Minhas datas
            </Link>
          </section>
        )}
      <div className="feedback" role="status">
        {notice}
      </div>
      {requestError && (
        <p className="storage-error" role="alert">
          {requestError}
        </p>
      )}
      <footer className="app-footer">
        <span className="footer-mark">
          <Clock3 size={13} />
          Um dia de cada vez.
        </span>
        <span>Feito para o que importa.</span>
      </footer>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <DatesApp />
    </BrowserRouter>
  );
}

export default App;
