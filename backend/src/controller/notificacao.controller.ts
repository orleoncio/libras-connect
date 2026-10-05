import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import type { AuthRequest } from '../auth/jwt.guard.js';
import { AlunoGuard } from '../auth/aluno.guard.js';
import { NotificacaoService } from '../service/notificacao.service.js';
@Controller('notificacoes')
@UseGuards(JwtGuard, AlunoGuard)
export class NotificacaoController {
  constructor(private readonly notificacoes: NotificacaoService) {}
  @Get() listar(@Req() req: AuthRequest) {
    return this.notificacoes.listar(req.usuario.sub);
  }
  @Patch(':id/lida') marcarLida(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificacoes.marcarLida(req.usuario.sub, id);
  }
}
