import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { HorarioProfessor } from '../entity/horario-professor.entity.js';
import { ProfessorPerfil } from '../entity/usuario.entity.js';
import type { RegistrarHorariosDto } from '../dto/registrar-horarios.dto.js';
const UMA_HORA = 60 * 60 * 1000;
// Segunda a domingo, no fuso de referência da plataforma.
function semana(inicio: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Recife',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(inicio);
  const value = (key: string) =>
    Number(parts.find((part) => part.type === key)!.value);
  const day = new Date(
    Date.UTC(value('year'), value('month') - 1, value('day')),
  );
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.getTime();
}
@Injectable()
export class HorarioProfessorService {
  constructor(private readonly db: DataSource) {}
  async registrar(professorId: string, dto: RegistrarHorariosDto) {
    const agora = Date.now();
    const horarios = dto.horarios
      .map((item) => {
        const inicio = new Date(item.inicio);
        if (!Number.isFinite(inicio.getTime()) || inicio.getTime() <= agora)
          throw new BadRequestException('Horários devem estar no futuro');
        return {
          professorId,
          inicio,
          fim: new Date(inicio.getTime() + UMA_HORA),
          livre: true,
        };
      })
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    if (
      horarios.some(
        (item) => semana(item.inicio) !== semana(horarios[0].inicio),
      )
    )
      throw new BadRequestException(
        'Envie horários de uma mesma semana (segunda a domingo, America/Recife)',
      );
    for (let index = 1; index < horarios.length; index++) {
      if (horarios[index].inicio < horarios[index - 1].fim)
        throw new ConflictException(
          'O lote contém horários duplicados ou sobrepostos',
        );
    }
    try {
      return await this.db.transaction(async (manager) => {
        const professor = await manager.findOneBy(ProfessorPerfil, {
          usuarioId: professorId,
        });
        if (!professor)
          throw new ForbiddenException('Perfil de professor não encontrado');
        // A exclusão GiST no PostgreSQL impede conflitos inclusive entre requisições simultâneas.
        return manager.save(
          HorarioProfessor,
          horarios.map((item) => manager.create(HorarioProfessor, item)),
        );
      });
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const code = (error.driverError as { code?: string }).code;
        if (code === '23P01' || code === '23505')
          throw new ConflictException(
            'Existe um horário duplicado ou sobreposto para este professor',
          );
      }
      throw error;
    }
  }
}
