import Icon from "../components/Icon";
import { Brand } from "../components/ui";
export default function Welcome() {
  return (
    <div className="welcome">
      <header className="public-header">
        <Brand />
        <span className="header-note">
          <span className="live-dot" />
          Conexões que abrem caminhos
        </span>
      </header>
      <main className="welcome-main">
        <div className="welcome-copy">
          <p className="eyebrow">
            <Icon name="spark" size={16} /> UM NOVO JEITO DE SE CONECTAR
          </p>
          <h1>
            Mais que aprender.
            <br />
            <span>Conectar em Libras.</span>
          </h1>
          <p className="welcome-description">
            Encontre quem ensina, compartilhe o que sabe e descubra novas
            possibilidades. Uma conversa de cada vez.
          </p>
          <div className="welcome-detail">
            <span className="mini-avatar">A</span>
            <span className="mini-avatar warm">P</span>
            <span>
              Aulas individuais.
              <br />
              <strong>Aprendizado no seu ritmo.</strong>
            </span>
          </div>
        </div>
        <section className="role-panel" aria-labelledby="role-title">
          <span className="section-number">01 / VAMOS COMEÇAR</span>
          <h2 id="role-title">Qual é o seu caminho?</h2>
          <p className="muted">Escolha como quer fazer parte da comunidade.</p>
          <a href="#/aluno/login" className="role-card">
            <span className="role-icon">
              <Icon name="book" size={28} />
            </span>
            <div>
              <h3>Quero aprender</h3>
              <p>Encontre professores e dê seu próximo passo em Libras.</p>
              <span>
                Entrar como aluno <Icon name="arrow" size={16} />
              </span>
            </div>
          </a>
          <a href="#/professor/login" className="role-card teacher">
            <span className="role-icon">
              <Icon name="people" size={28} />
            </span>
            <div>
              <h3>Quero ensinar</h3>
              <p>Compartilhe seu conhecimento e conecte-se com novos alunos.</p>
              <span>
                Entrar como professor <Icon name="arrow" size={16} />
              </span>
            </div>
          </a>
          <p className="role-footnote">
            Um espaço para aprender, ensinar e pertencer.
          </p>
        </section>
      </main>
      <footer className="public-footer">
        <span>Feito para aproximar pessoas.</span>
        <span>Libras conecta. Você faz parte.</span>
      </footer>
    </div>
  );
}
