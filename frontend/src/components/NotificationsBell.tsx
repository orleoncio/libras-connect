import { useEffect, useRef, useState } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { meetLink } from "../lib/meet";
import { dayLabel, timeLabel } from "../lib/date";
import Icon from "./Icon";
import { Empty, Feedback } from "./ui";
function NotificationsDialog({
  onClose,
  feed,
}: {
  onClose: () => void;
  feed: ReturnType<typeof useNotifications>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="booking-dialog notifications-dialog"
      aria-labelledby="notifications-title"
      onCancel={onClose}
    >
      <button
        className="icon-button dialog-close"
        onClick={onClose}
        aria-label="Fechar"
      >
        <Icon name="close" />
      </button>
      <p className="eyebrow">SUAS CONEXÕES</p>
      <h2 id="notifications-title">Notificações</h2>
      <p className="muted">
        {feed.unread}{" "}
        {feed.unread === 1 ? "notificação não lida" : "notificações não lidas"}
      </p>
      <button
        className="button secondary small notifications-refresh"
        onClick={feed.refresh}
      >
        Atualizar
      </button>
      <Feedback error={feed.error} />
      {feed.loading ? (
        <div className="loading" role="status">
          Carregando notificações…
        </div>
      ) : feed.items.length ? (
        <div className="notifications-list">
          {feed.items.map((item) => {
            const url = meetLink(item.linkMeet);
            return (
              <article
                className={`notification-item ${item.lidaEm ? "" : "unread"}`}
                key={item.id}
              >
                <span className="soft-icon">
                  <Icon name="video" />
                </span>
                <div>
                  <h3>
                    {item.professorNome} está pronto para iniciar sua aula.
                  </h3>
                  <p className="muted capitalize">
                    {dayLabel(item.inicio)} · {timeLabel(item.inicio)}
                  </p>
                  <div className="notification-actions">
                    {url && (
                      <a
                        className="button primary small"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => void feed.markRead(item.id)}
                      >
                        Entrar na chamada
                        <Icon name="arrow" size={15} />
                      </a>
                    )}
                    {!item.lidaEm && (
                      <button
                        className="text-button"
                        onClick={() => void feed.markRead(item.id)}
                      >
                        Marcar como lida
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty icon="bell" title="Nenhuma notificação por enquanto.">
          Quando seu professor iniciar uma aula, o link da chamada aparece aqui.
        </Empty>
      )}
    </dialog>
  );
}
export default function NotificationsBell() {
  const feed = useNotifications();
  const [open, setOpen] = useState(false);
  const latestUrl = meetLink(feed.latest?.linkMeet);
  return (
    <>
      <button
        className="icon-button notification-bell"
        aria-label={`Notificações, ${feed.unread} não lidas`}
        onClick={() => {
          setOpen(true);
          feed.refresh();
        }}
      >
        <Icon name="bell" />
        {feed.unread > 0 && (
          <span className="notification-count">
            {feed.unread > 99 ? "99+" : feed.unread}
          </span>
        )}
      </button>
      {feed.latest && !open && (
        <aside className="notification-toast" role="status">
          <button
            className="icon-button"
            aria-label="Dispensar aviso"
            onClick={feed.dismiss}
          >
            <Icon name="close" size={17} />
          </button>
          <span className="soft-icon">
            <Icon name="video" />
          </span>
          <h3>Sua aula vai começar!</h3>
          <p>{feed.latest.professorNome} está pronto para iniciar.</p>
          {latestUrl && (
            <a
              className="button primary small"
              href={latestUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void feed.markRead(feed.latest!.id)}
            >
              Entrar na chamada
              <Icon name="arrow" size={16} />
            </a>
          )}
        </aside>
      )}
      {open && (
        <NotificationsDialog onClose={() => setOpen(false)} feed={feed} />
      )}
    </>
  );
}
