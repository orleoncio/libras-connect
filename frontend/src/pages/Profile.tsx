import { useState } from "react";
import type { FormEvent } from "react";
import { api, json } from "../lib/api";
import { navigate } from "../hooks/useRoute";
import type { User } from "../types";
import { levels } from "../types";
import { Feedback, PageHeading } from "../components/ui";
import Icon from "../components/Icon";
export default function Profile({
  user,
  onUpdate,
}: {
  user: User;
  onUpdate: (user: User) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body =
      user.tipo === "professor"
        ? {
            ...values,
            especialidades: String(values.especialidades)
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            anosExperiencia: Number(values.anosExperiencia),
          }
        : values;
    try {
      await api(
        `/${user.tipo === "aluno" ? "alunos" : "professores"}/me`,
        json("PATCH", body),
      );
      onUpdate(await api<User>("/auth/me"));
      setSuccess("Seu perfil foi atualizado.");
      if (user.tipo === "aluno") navigate("/app/professores");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="DO SEU JEITO"
        title={
          user.tipo === "aluno"
            ? "Vamos conhecer você."
            : "Seu perfil, sua história."
        }
        description={
          user.tipo === "aluno"
            ? "Seu nível nos ajuda a encontrar professores para o seu próximo passo."
            : "Mostre aos alunos como você pode fazer parte da jornada deles."
        }
      />
      <div className="profile-layout">
        <form className="panel profile-form" onSubmit={submit}>
          <div className="section-heading">
            <span className="soft-icon">
              <Icon name="user" />
            </span>
            <div>
              <h2>Dados cadastrais</h2>
              <p className="muted">Mantenha suas informações atualizadas.</p>
            </div>
          </div>
          <Feedback error={error} success={success} />
          <div className="form-grid">
            <label className="span-two">
              Nome completo
              <input
                name="nome"
                required
                minLength={2}
                maxLength={120}
                defaultValue={user.nome}
                autoComplete="name"
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                defaultValue={user.email}
                autoComplete="email"
              />
            </label>
            <label>
              Telefone
              <input
                name="telefone"
                type="tel"
                required
                pattern={"\\+?[0-9 \\(\\)\\-]{8,25}"}
                defaultValue={user.telefone}
                autoComplete="tel"
              />
            </label>
            <label className="span-two">
              Seu nível de Libras
              <select name="nivelLibras" defaultValue={user.nivelLibras}>
                {levels.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
              <small>
                Escolha o nível que melhor representa seu conhecimento hoje.
              </small>
            </label>
            {user.tipo === "aluno" ? (
              <label className="span-two">
                O que você quer aprender?
                <textarea
                  name="objetivoAprendizado"
                  maxLength={1000}
                  defaultValue={user.objetivoAprendizado || ""}
                  placeholder="Ex.: conversar com mais confiança ou começar do zero."
                />
                <small>Opcional. Conte um pouco sobre seus objetivos.</small>
              </label>
            ) : (
              <>
                <label className="span-two">
                  Biografia
                  <textarea
                    name="biografia"
                    required
                    maxLength={2000}
                    defaultValue={user.biografia}
                  />
                </label>
                <label>
                  Especialidades
                  <input
                    name="especialidades"
                    required
                    defaultValue={user.especialidades?.join(", ")}
                  />
                  <small>Separe por vírgulas.</small>
                </label>
                <label>
                  Anos de experiência
                  <input
                    name="anosExperiencia"
                    type="number"
                    required
                    min="0"
                    max="100"
                    defaultValue={user.anosExperiencia || 0}
                  />
                </label>
              </>
            )}
          </div>
          <div className="form-footer">
            <span className="muted">
              Você pode editar esses dados quando quiser.
            </span>
            <button className="button primary" disabled={busy}>
              {busy
                ? "Salvando…"
                : user.tipo === "aluno"
                  ? "Salvar e encontrar professores"
                  : "Salvar meu perfil"}
              <Icon name="arrow" />
            </button>
          </div>
        </form>
        <aside className="profile-tip">
          <span className="soft-icon">
            <Icon name="spark" size={24} />
          </span>
          <h2>Um passo de cada vez.</h2>
          <p>
            Não precisa saber tudo para começar. O que importa é encontrar o
            próximo passo que faz sentido para você.
          </p>
          <div className="level-ladder">
            {levels.map((level) => (
              <span
                key={level}
                className={level === user.nivelLibras ? "current" : ""}
              >
                {level}
              </span>
            ))}
          </div>
          <p className="tip-small">
            {user.tipo === "aluno"
              ? "Você verá professores com nível superior ao seu e horários disponíveis."
              : "Alunos com nível inferior ao seu poderão encontrar seus horários disponíveis."}
          </p>
        </aside>
      </div>
    </>
  );
}
