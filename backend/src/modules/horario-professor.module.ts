import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProfessorGuard } from '../auth/professor.guard.js';
import { HorarioProfessorController } from '../controller/horario-professor.controller.js';
import { HorarioProfessorService } from '../service/horario-professor.service.js';
@Module({
  imports: [AuthModule],
  controllers: [HorarioProfessorController],
  providers: [HorarioProfessorService, ProfessorGuard],
})
export class HorarioProfessorModule {}
