import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import type { AuthRequest } from '../auth/jwt.guard.js';
import { ProfessorGuard } from '../auth/professor.guard.js';
import { RegistrarHorariosDto } from '../dto/registrar-horarios.dto.js';
import { HorarioProfessorService } from '../service/horario-professor.service.js';
@Controller('professores/me/horarios')
@UseGuards(JwtGuard, ProfessorGuard)
export class HorarioProfessorController {
  constructor(private readonly horarios: HorarioProfessorService) {}
  @Post() registrar(
    @Req() request: AuthRequest,
    @Body() dto: RegistrarHorariosDto,
  ) {
    return this.horarios.registrar(request.usuario.sub, dto);
  }
}
