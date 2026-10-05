import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AlunoGuard } from '../auth/aluno.guard.js';
import { ProfessorGuard } from '../auth/professor.guard.js';
import { PlataformaController } from '../controller/plataforma.controller.js';
import { PlataformaService } from '../service/plataforma.service.js';
import { AulaController } from '../controller/aula.controller.js';
import { NotificacaoController } from '../controller/notificacao.controller.js';
import { AulaService } from '../service/aula.service.js';
import { NotificacaoService } from '../service/notificacao.service.js';
@Module({
  imports: [AuthModule],
  controllers: [PlataformaController, AulaController, NotificacaoController],
  providers: [
    PlataformaService,
    AulaService,
    NotificacaoService,
    AlunoGuard,
    ProfessorGuard,
  ],
})
export class PlataformaModule {}
