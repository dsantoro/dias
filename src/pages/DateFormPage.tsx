import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { emojiOptions, type Countdown } from "../countdowns";
import { getRemainingDays, isValidDate } from "../dates";

export default function DateFormPage({
  event,
  today,
  onSave,
}: {
  event?: Countdown;
  today: string;
  onSave: (values: Omit<Countdown, "id">) => Promise<void>;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [emoji, setEmoji] = useState<string>(
    event?.emoji ?? emojiOptions[0][0],
  );
  const [date, setDate] = useState(event?.date ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const titleInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInput.current?.focus();
    window.scrollTo(0, 0);
  }, []);

  async function submit(submitEvent: React.SubmitEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (pending) return;
    if (!title.trim() || !isValidDate(date)) {
      setError("Preencha um titulo e uma data valida.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await onSave({ title: title.trim(), emoji, date });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Nao foi possivel salvar a data.",
      );
    } finally {
      setPending(false);
    }
  }

  const days = date && isValidDate(date) ? getRemainingDays(date, today) : null;

  return (
    <>
      <section className="page-heading registration-heading">
        <Link
          className="back-link"
          to="/"
          aria-disabled={pending}
          onClick={(clickEvent) => {
            if (pending) clickEvent.preventDefault();
          }}
        >
          <ArrowLeft size={16} />
          Minhas datas
        </Link>
        <span className="eyebrow">
          {event ? "SEU MOMENTO" : "UM NOVO MOMENTO"}
        </span>
        <h1>
          {event ? "Editar data" : "Nova data"}
          <span>.</span>
        </h1>
        <div className="heading-bottom">
          <p>Um motivo para contar os dias.</p>
        </div>
      </section>
      <section
        className="editor registration-editor"
        id="event-form"
        aria-label={event ? "Editar data" : "Cadastrar data"}
      >
        <form onSubmit={submit}>
          <label htmlFor="title">Titulo</label>
          <input
            ref={titleInput}
            id="title"
            value={title}
            onChange={(changeEvent) => setTitle(changeEvent.target.value)}
            placeholder="Uma viagem, um aniversario, um sonho..."
            maxLength={80}
            disabled={pending}
            required
          />
          <fieldset disabled={pending}>
            <legend>Escolha um emoji</legend>
            <div className="emoji-grid">
              {emojiOptions.map(([option, label]) => (
                <button
                  key={option}
                  type="button"
                  className={`emoji-option ${emoji === option ? "selected" : ""}`}
                  aria-label={label}
                  title={label}
                  aria-pressed={emoji === option}
                  onClick={() => setEmoji(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>
          <label htmlFor="date">Quando acontece?</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(changeEvent) => setDate(changeEvent.target.value)}
            min="0001-01-01"
            max="9999-12-31"
            disabled={pending}
            required
          />
          <div className="form-bottom">
            <span>
              {days === null
                ? ""
                : days === 0
                  ? "E hoje!"
                  : days < 0
                    ? `Ha ${Math.abs(days)} ${days === -1 ? "dia" : "dias"}`
                    : `Faltam ${days} ${days === 1 ? "dia" : "dias"}`}
            </span>
            <div className="form-actions">
              <Link
                className="cancel-link"
                to="/"
                aria-disabled={pending}
                onClick={(clickEvent) => {
                  if (pending) clickEvent.preventDefault();
                }}
              >
                Cancelar
              </Link>
              <button className="save-button" type="submit" disabled={pending}>
                <Check size={17} />
                {pending ? "Salvando..." : event ? "Salvar" : "Adicionar"}
              </button>
            </div>
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
