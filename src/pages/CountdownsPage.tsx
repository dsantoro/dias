import { ArrowDown, ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { emojiOptions, type Countdown, type Filter } from "../countdowns";
import { formatDate, getRemainingDays } from "../dates";

export default function CountdownsPage({
  events,
  today,
  filter,
  onFilterChange,
  onOpenForm,
  onDelete,
}: {
  events: Countdown[];
  today: string;
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  onOpenForm: (event?: Countdown) => void;
  onDelete: (event: Countdown) => void;
}) {
  const upcoming = events
    .filter((event) => getRemainingDays(event.date, today) >= 0)
    .sort((first, second) => first.date.localeCompare(second.date));
  const past = events
    .filter((event) => getRemainingDays(event.date, today) < 0)
    .sort((first, second) => second.date.localeCompare(first.date));
  const visible =
    filter === "upcoming"
      ? upcoming
      : filter === "past"
        ? past
        : [...upcoming, ...past];
  const next = upcoming[0];

  return (
    <>
      <section className="page-heading">
        <span className="eyebrow">CADA DIA MAIS PERTO</span>
        <h1>
          O que vem a seguir<span>?</span>
        </h1>
        <div className="heading-bottom">
          <p>Suas datas. Seus bons momentos.</p>
          <button
            className="add-button"
            type="button"
            onClick={() => onOpenForm()}
          >
            <Plus size={17} />
            Nova data
          </button>
        </div>
      </section>
      {next && (
        <section className="next-event" aria-label="Proxima data">
          <div className="next-top">
            <span className="eyebrow">
              <span className="live-dot" />
              NO HORIZONTE
            </span>
            <ArrowDown size={17} />
          </div>
          <div className="next-main">
            <span className="next-emoji" aria-hidden="true">
              {next.emoji}
            </span>
            <div className="next-details">
              <h2>{next.title}</h2>
              <span>{formatDate(next.date)}</span>
            </div>
          </div>
          <div className="next-bottom">
            <div className="big-count">
              <strong>{getRemainingDays(next.date, today)}</strong>
              <span>
                {getRemainingDays(next.date, today) === 0
                  ? "chegou o dia!"
                  : getRemainingDays(next.date, today) === 1
                    ? "dia para chegar"
                    : "dias para chegar"}
              </span>
            </div>
            <span className="next-caption">
              {getRemainingDays(next.date, today) === 0
                ? "Aproveite o momento."
                : "A contagem ja comecou."}
            </span>
          </div>
        </section>
      )}
      <section className="event-section" aria-label="Minhas datas">
        <div className="section-heading">
          <h2>
            Minhas datas <span className="total">{events.length}</span>
          </h2>
          <span className="sort-label">
            <ArrowDown size={13} />
            Por data
          </span>
        </div>
        <div className="filters" role="group" aria-label="Filtrar datas">
          {(
            [
              ["upcoming", "Por vir", upcoming.length],
              ["past", "Passadas", past.length],
              ["all", "Todas", events.length],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              className={filter === value ? "active" : ""}
              onClick={() => onFilterChange(value)}
            >
              {label}
              <span>{count}</span>
            </button>
          ))}
        </div>
        <div className="event-list">
          {visible.map((event, index) => {
            const days = getRemainingDays(event.date, today);
            return (
              <article
                className={`event-card ${days < 0 ? "past-card" : ""}`}
                key={event.id}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <span
                  className={`event-emoji tone-${index % 4}`}
                  aria-hidden="true"
                >
                  {event.emoji}
                </span>
                <div className="event-info">
                  <h3>{event.title}</h3>
                  <p>{formatDate(event.date)}</p>
                </div>
                <div className="event-count">
                  <strong>{Math.abs(days)}</strong>
                  <span>
                    {days === 0
                      ? "hoje"
                      : days < 0
                        ? days === -1
                          ? "dia atras"
                          : "dias atras"
                        : days === 1
                          ? "dia"
                          : "dias"}
                  </span>
                </div>
                <div className="event-actions">
                  <button
                    type="button"
                    className="icon-button"
                    title={`Editar ${event.title}`}
                    aria-label={`Editar ${event.title}`}
                    onClick={() => onOpenForm(event)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button delete-button"
                    title={`Excluir ${event.title}`}
                    aria-label={`Excluir ${event.title}`}
                    onClick={() => onDelete(event)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
          {visible.length === 0 && (
            <div className="empty-state">
              <span className="empty-art" aria-hidden="true">
                {emojiOptions[0][0]}
              </span>
              <h3>
                {events.length === 0
                  ? "Toda espera tem uma historia."
                  : "Nenhuma data por aqui."}
              </h3>
              <p>
                {events.length === 0
                  ? "Qual vai ser a sua proxima?"
                  : filter === "past"
                    ? "Os bons momentos ainda estao por vir."
                    : "Um novo momento pode estar a caminho."}
              </p>
              <button
                className="empty-add"
                type="button"
                onClick={() => onOpenForm()}
              >
                Adicionar uma data
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
