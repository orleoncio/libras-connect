import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { Aula } from '../entity/aula.entity.js';
import { HorarioProfessor } from '../entity/horario-professor.entity.js';
import { Notificacao } from '../entity/notificacao.entity.js';
import { TipoUsuario } from '../entity/usuario.js';
import { normalizarLinkMeet } from '../dto/link-meet.dto.js';
@Injectable()
export class AulaService {
  constructor(private readonly db: DataSource) {}
  async detalhes(usuarioId: string, tipo: TipoUsuario, id: string) {
    const rows = await this.db.query(
      `SELECT a.id, a."horarioId", a."iniciadaEm", h.inicio, h.fim,
      aluno.nome AS "alunoNome", professor.nome AS "professorNome",
      CASE WHEN $2 = 'professor' OR a."iniciadaEm" IS NOT NULL THEN a."linkMeet" ELSE NULL END AS "linkMeet"
      FROM aulas a JOIN horarios_professores h ON h.id = a."horarioId"
      JOIN usuarios aluno ON aluno.id = a."alunoId" JOIN usuarios professor ON professor.id = h."professorId"
      WHERE ${tipo === TipoUsuario.ALUNO ? 'a."alunoId"' : 'h."professorId"'} = $1 AND a.id = $3`,
      [usuarioId, tipo, id],
    );
    if (!rows.length) throw new NotFoundException('Aula não encontrada');
    return rows[0];
  }
  private async aulaDoProfessor(
    manager: EntityManager,
    professorId: string,
    id: string,
  ) {
    const aula = await manager.findOne(Aula, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!aula) throw new NotFoundException('Aula não encontrada');
    const horario = await manager.findOneBy(HorarioProfessor, {
      id: aula.horarioId,
    });
    if (!horario || horario.professorId !== professorId)
      throw new ForbiddenException('Esta aula não pertence a você');
    return aula;
  }
  async atualizarLink(professorId: string, id: string, linkMeet: string) {
    return this.db.transaction(async (manager) => {
      const aula = await this.aulaDoProfessor(manager, professorId, id);
      if (aula.iniciadaEm)
        throw new ConflictException(
          'O link não pode ser alterado após iniciar a aula',
        );
      aula.linkMeet = normalizarLinkMeet(linkMeet);
      await manager.save(Aula, aula);
      return {
        id: aula.id,
        linkMeet: aula.linkMeet,
        iniciadaEm: aula.iniciadaEm ?? null,
      };
    });
  }
  async iniciar(professorId: string, id: string) {
    return this.db.transaction(async (manager) => {
      const aula = await this.aulaDoProfessor(manager, professorId, id);
      if (!aula.linkMeet)
        throw new ConflictException(
          'Adicione o link do Google Meet antes de iniciar a aula',
        );
      if (!aula.iniciadaEm) {
        aula.iniciadaEm = new Date();
        await manager.save(Aula, aula);
        await manager.save(
          Notificacao,
          manager.create(Notificacao, {
            aulaId: aula.id,
            alunoId: aula.alunoId,
          }),
        );
      }
      return {
        id: aula.id,
        linkMeet: aula.linkMeet,
        iniciadaEm: aula.iniciadaEm,
      };
    });
  }
}
