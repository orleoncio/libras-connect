import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AlunoGuard } from '../auth/aluno.guard.js';
import { ProfessorGuard } from '../auth/professor.guard.js';
import { PlataformaController } from '../controller/plataforma.controller.js';
import { PlataformaService } from '../service/plataforma.service.js';
@Module({
  imports: [AuthModule],
  controllers: [PlataformaController],
  providers: [PlataformaService, AlunoGuard, ProfessorGuard],
})
export class PlataformaModule {}
