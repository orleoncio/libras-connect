import { useState } from "react";
import type { FormEvent } from "react";
import type { Role, User } from "../types";
import { levels } from "../types";
import { api, json, tokenStore } from "../lib/api";
import { Brand, Feedback } from "../components/ui";
import Icon from "../components/Icon";
export default function Access({
  role,
  register,
  onLogin,
}: {
  role: Role;
  register: boolean;
  onLogin: (user: User) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const { email, senha } = values;
    try {
      if (register && !registered) {
        const payload =
          role === "professor"
            ? {
                ...values,
                especialidades: String(values.especialidades)
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
                anosExperiencia: Number(values.anosExperiencia),
              }
            : values;
        await api(
          `/auth/${role === "aluno" ? "alunos" : "professores"}/registro`,
          json("POST", payload),
        );
        setRegistered(true);
      }
      const response = await api<{ accessToken: string; usuario: User }>(
        `/auth/${role === "aluno" ? "alunos" : "professores"}/login`,
        json("POST", { email, senha }),
      );
      tokenStore.set(response.accessToken);
      onLogin(response.usuario);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="access-page">
      <section className="access-story">
        <Brand />
        <div>
          <span className="story-symbol">
            <Icon name={role === "aluno" ? "book" : "people"} size={58} />
          </span>
          <p className="eyebrow">
            {role === "aluno"
              ? "SEU PRÓXIMO PASSO"
              : "SEU CONHECIMENTO TRANSFORMA"}
          </p>
          <h1>
            {role === "aluno" ? (
              <>
                Cada sinal,
                <br />
                uma nova possibilidade.
              </>
            ) : (
              <>
                Ensinar também
                <br />é criar conexões.
              </>
            )}
          </h1>
          <p>
            {role === "aluno"
              ? "Aprenda Libras com pessoas que ajudam você a ir além. No seu ritmo, com atenção de verdade."
              : "Abra espaço na sua agenda para novos encontros. Seus alunos estão a uma conversa de distância."}
          </p>
        </div>
        <span>Aprender. Compartilhar. Conectar.</span>
      </section>
      <main className="access-main">
        <a className="back-link" href="#/">
          <Icon name="arrow" size={16} /> Trocar perfil
        </a>
        <div className="access-form">
          <span className="badge">
            {role === "aluno" ? "Espaço do aluno" : "Espaço do professor"}
          </span>
          <h1>{register ? "Vamos criar sua conta." : "Bom ter você aqui."}</h1>
          <p className="muted">
            {register
              ? "Preencha seus dados para começar a se conectar."
              : "Entre para continuar sua jornada em Libras."}
          </p>
          <form onSubmit={submit}>
            <Feedback
              error={error}
              success={
                registered
                  ? "Conta criada. Se necessário, tente entrar novamente com sua senha."
                  : undefined
              }
            />
            {register && (
              <>
                <label>
                  Nome completo
                  <input
                    name="nome"
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    placeholder="Como podemos chamar você?"
                  />
                </label>
                <label>
                  Telefone
                  <input
                    name="telefone"
                    type="tel"
                    required
                    pattern={"\\+?[0-9 \\(\\)\\-]{8,25}"}
                    autoComplete="tel"
                    placeholder="(81) 99999-9999"
                  />
                </label>
              </>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                maxLength={254}
                placeholder="voce@exemplo.com"
              />
            </label>
            <label>
              Senha
              <input
                name="senha"
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={register ? "Pelo menos 8 caracteres" : "Sua senha"}
              />
            </label>
            {register && (
              <label>
                Seu nível de Libras
                <select
                  name="nivelLibras"
                  defaultValue={role === "aluno" ? "A1" : "B2"}
                >
                  {levels.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </label>
            )}
            {register && role === "professor" && (
              <>
                <label>
                  Sobre você
                  <textarea
                    name="biografia"
                    required
                    maxLength={2000}
                    placeholder="Conte um pouco sobre sua experiência e forma de ensinar."
                  />
                </label>
                <label>
                  Especialidades
                  <input
                    name="especialidades"
                    required
                    placeholder="Conversação, Libras para iniciantes"
                  />
                  <small>Separe por vírgulas.</small>
                </label>
                <label>
                  Anos de experiência
                  <input
                    name="anosExperiencia"
                    type="number"
                    min="0"
                    max="100"
                    required
                    defaultValue={0}
                  />
                </label>
              </>
            )}
            <button className="button primary full" disabled={busy}>
              {busy
                ? "Aguarde…"
                : registered
                  ? "Entrar na minha conta"
                  : register
                    ? "Criar conta e entrar"
                    : "Entrar na plataforma"}
              <Icon name="arrow" />
            </button>
          </form>
          <p className="switch-access">
            {register
              ? "Já faz parte da comunidade?"
              : "Ainda não tem uma conta?"}{" "}
            <a href={`#/${role}/${register ? "login" : "registro"}`}>
              {register ? "Fazer login" : "Criar minha conta"}
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
