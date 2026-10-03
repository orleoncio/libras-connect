import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import type { EntityManager } from 'typeorm';
import {
  AlunoPerfil,
  ProfessorPerfil,
  UsuarioRegistro,
} from '../entity/usuario.entity.js';
import { HorarioProfessor } from '../entity/horario-professor.entity.js';
import { Aula } from '../entity/aula.entity.js';
import {
  Solicitacao,
  StatusSolicitacao,
} from '../entity/solicitacao.entity.js';
import { NivelLibras, TipoUsuario } from '../entity/usuario.js';
import type {
  PerfilAlunoDto,
  PerfilProfessorDto,
} from '../dto/plataforma.dto.js';
const niveis = Object.values(NivelLibras);
@Injectable()
export class PlataformaService {
  constructor(private readonly db: DataSource) {}
  async perfil(
    id: string,
    tipo: TipoUsuario,
    dto: PerfilAlunoDto | PerfilProfessorDto,
  ) {
    try {
      await this.db.transaction(async (manager) => {
        await manager.update(
          UsuarioRegistro,
          { id, tipo },
          {
            nome: dto.nome,
            email: dto.email,
            telefone: dto.telefone,
            nivelLibras: dto.nivelLibras,
          },
        );
        if (tipo === TipoUsuario.ALUNO)
          await manager.update(
            AlunoPerfil,
            { usuarioId: id },
            {
              objetivoAprendizado:
                (dto as PerfilAlunoDto).objetivoAprendizado ?? null,
            },
          );
        else {
          const { biografia, especialidades, anosExperiencia } =
            dto as PerfilProfessorDto;
          await manager.update(
            ProfessorPerfil,
            { usuarioId: id },
            { biografia, especialidades, anosExperiencia },
          );
        }
      });
    } catch (error) {
      this.conflito(error, 'Email já cadastrado');
    }
    return { mensagem: 'Perfil atualizado' };
  }
  async professores(alunoId: string) {
    const aluno = await this.db
      .getRepository(UsuarioRegistro)
      .findOneBy({ id: alunoId, tipo: TipoUsuario.ALUNO });
    if (!aluno) throw new ForbiddenException('Perfil de aluno não encontrado');
    // A comparação usa a ordem explícita A1 < A2 < B1 < B2 < C1 < C2.
    const superiores = niveis.slice(niveis.indexOf(aluno.nivelLibras) + 1);
    if (!superiores.length) return [];
    return this.db.query(
      `SELECT u.id, u.nome, u."nivelLibras", p.biografia, p.especialidades, p."anosExperiencia",
      json_agg(json_build_object('id', h.id, 'inicio', h.inicio, 'fim', h.fim) ORDER BY h.inicio) AS horarios
      FROM usuarios u JOIN professores p ON p."usuarioId" = u.id
      JOIN horarios_professores h ON h."professorId" = u.id
      WHERE u."nivelLibras"::text = ANY($1::text[]) AND h.livre AND h.inicio > now()
      GROUP BY u.id, p."usuarioId" ORDER BY u.nome`,
      [superiores],
    );
  }
  async horarios(professorId: string) {
    return this.db
      .getRepository(HorarioProfessor)
      .find({ where: { professorId }, order: { inicio: 'ASC' } });
  }
  private async alunoSemConflito(
    manager: EntityManager,
    alunoId: string,
    horario: HorarioProfessor,
  ) {
    const aulas = await manager.query(
      `SELECT a.id FROM aulas a JOIN horarios_professores h ON h.id = a."horarioId"
      WHERE a."alunoId" = $1 AND h.inicio < $3 AND h.fim > $2 LIMIT 1`,
      [alunoId, horario.inicio, horario.fim],
    );
    if (aulas.length)
      throw new ConflictException('O aluno já possui uma aula nesse período');
  }
  async solicitar(alunoId: string, horarioId: string) {
    try {
      return await this.db.transaction(async (manager) => {
        const alunoPerfil = await manager.findOne(AlunoPerfil, {
          where: { usuarioId: alunoId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!alunoPerfil)
          throw new ForbiddenException('Perfil de aluno não encontrado');
        const horario = await manager.findOne(HorarioProfessor, {
          where: { id: horarioId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!horario) throw new NotFoundException('Horário não encontrado');
        if (!horario.livre || horario.inicio.getTime() <= Date.now())
          throw new ConflictException('Este horário não está disponível');
        const aluno = await manager.findOneByOrFail(UsuarioRegistro, {
          id: alunoId,
        });
        const professor = await manager.findOneByOrFail(UsuarioRegistro, {
          id: horario.professorId,
        });
        if (
          niveis.indexOf(professor.nivelLibras) <=
          niveis.indexOf(aluno.nivelLibras)
        )
          throw new ForbiddenException(
            'Escolha um professor com nível de Libras superior ao seu',
          );
        await this.alunoSemConflito(manager, alunoId, horario);
        return manager.save(
          Solicitacao,
          manager.create(Solicitacao, {
            alunoId,
            horarioId,
            status: StatusSolicitacao.PENDENTE,
          }),
        );
      });
    } catch (error) {
      this.conflito(error, 'Você já enviou uma solicitação para este horário');
    }
  }
  async solicitacoes(id: string, tipo: TipoUsuario) {
    return this.db.query(
      `SELECT s.id, s.status, s."horarioId", s."criadoEm", h.inicio, h.fim,
      aluno.nome AS "alunoNome", aluno."nivelLibras" AS "alunoNivel", professor.nome AS "professorNome"
      FROM solicitacoes s JOIN horarios_professores h ON h.id = s."horarioId"
      JOIN usuarios aluno ON aluno.id = s."alunoId" JOIN usuarios professor ON professor.id = h."professorId"
      WHERE ${tipo === TipoUsuario.ALUNO ? 's."alunoId"' : 'h."professorId"'} = $1
      ORDER BY s."criadoEm" DESC`,
      [id],
    );
  }
  async decidir(professorId: string, id: string, aceitar: boolean) {
    return this.db.transaction(async (manager) => {
      const original = await manager.findOneBy(Solicitacao, { id });
      if (!original) throw new NotFoundException('Solicitação não encontrada');
      // Sempre bloqueie aluno antes de horário para serializar aceites e evitar deadlocks.
      if (aceitar)
        await manager.findOne(AlunoPerfil, {
          where: { usuarioId: original.alunoId },
          lock: { mode: 'pessimistic_write' },
        });
      const horario = await manager.findOne(HorarioProfessor, {
        where: { id: original.horarioId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!horario || horario.professorId !== professorId)
        throw new ForbiddenException('Esta solicitação não pertence a você');
      const solicitacao = await manager.findOneByOrFail(Solicitacao, { id });
      if (solicitacao.status !== StatusSolicitacao.PENDENTE)
        throw new ConflictException('Esta solicitação já foi respondida');
      if (!aceitar) {
        solicitacao.status = StatusSolicitacao.RECUSADA;
        return manager.save(Solicitacao, solicitacao);
      }
      if (!horario.livre || horario.inicio.getTime() <= Date.now())
        throw new ConflictException('Este horário não está disponível');
      await this.alunoSemConflito(manager, solicitacao.alunoId, horario);
      const aula = await manager.save(
        Aula,
        manager.create(Aula, {
          horarioId: horario.id,
          alunoId: solicitacao.alunoId,
        }),
      );
      horario.livre = false;
      await manager.save(HorarioProfessor, horario);
      solicitacao.status = StatusSolicitacao.ACEITA;
      await manager.save(Solicitacao, solicitacao);
      // Apenas uma aula ocupa o horário. Os demais alunos recebem uma recusa.
      await manager.update(
        Solicitacao,
        { horarioId: horario.id, status: StatusSolicitacao.PENDENTE },
        { status: StatusSolicitacao.RECUSADA },
      );
      return aula;
    });
  }
  async aulas(id: string, tipo: TipoUsuario) {
    return this.db.query(
      `SELECT a.id, a."horarioId", h.inicio, h.fim, aluno.nome AS "alunoNome", professor.nome AS "professorNome"
      FROM aulas a JOIN horarios_professores h ON h.id = a."horarioId"
      JOIN usuarios aluno ON aluno.id = a."alunoId" JOIN usuarios professor ON professor.id = h."professorId"
      WHERE ${tipo === TipoUsuario.ALUNO ? 'a."alunoId"' : 'h."professorId"'} = $1 ORDER BY h.inicio`,
      [id],
    );
  }
  private conflito(error: unknown, mensagem: string): never {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    )
      throw new ConflictException(mensagem);
    throw error;
  }
}
