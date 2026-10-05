import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Notificacao } from '../entity/notificacao.entity.js';
@Injectable()
export class NotificacaoService {
  constructor(private readonly db: DataSource) {}
  async listar(alunoId: string) {
    return this.db.query(
      `SELECT n.id, n."aulaId", n."criadoEm", n."lidaEm", a."linkMeet", h.inicio,
      professor.nome AS "professorNome"
      FROM notificacoes n JOIN aulas a ON a.id = n."aulaId"
      JOIN horarios_professores h ON h.id = a."horarioId" JOIN usuarios professor ON professor.id = h."professorId"
      WHERE n."alunoId" = $1 ORDER BY n."criadoEm" DESC`,
      [alunoId],
    );
  }
  async marcarLida(alunoId: string, id: string) {
    return this.db.transaction(async (manager) => {
      const notificacao = await manager.findOne(Notificacao, {
        where: { id, alunoId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!notificacao)
        throw new NotFoundException('Notificação não encontrada');
      if (!notificacao.lidaEm) {
        notificacao.lidaEm = new Date();
        await manager.save(Notificacao, notificacao);
      }
      return { id: notificacao.id, lidaEm: notificacao.lidaEm };
    });
  }
}
