import type { ReactNode } from "react";
import Icon from "./Icon";
import LibrasButton from "./LibrasButton";
import { librasTitles } from "../lib/libras";
import type { LibrasTitleId } from "../lib/libras";
export function Brand() {
  return (
    <a className="brand" href="#/">
      <span className="brand-icon">
        <Icon name="hand" size={25} />
      </span>
      <span>
        libras<span className="brand-light">connect</span>
        <span className="brand-dot">.</span>
      </span>
    </a>
  );
}
export function Feedback({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="notice success" role="status">
          <Icon name="check" />
          {success}
        </div>
      )}
    </>
  );
}
export function Empty({
  icon = "calendar",
  title,
  children,
}: {
  icon?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={30} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function RemoteState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error?: string;
  retry: () => void;
}) {
  return loading ? (
    <div className="loading" role="status">
      <span className="spinner" />
      Carregando…
    </div>
  ) : error ? (
    <div className="notice error" role="alert">
      <p>{error}</p>
      <button className="button secondary" onClick={retry}>
        Tentar novamente
      </button>
    </div>
  ) : null;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  librasId,
}: {
  eyebrow: string;
  title?: string;
  description: string;
  action?: ReactNode;
  librasId?: LibrasTitleId;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <div className="translated-heading">
          <h1>{librasId ? librasTitles[librasId].title : title}</h1>
          {librasId && <LibrasButton titleId={librasId} />}
        </div>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
