import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import type { AuthRequest } from '../auth/jwt.guard.js';
import { ProfessorGuard } from '../auth/professor.guard.js';
import { LinkMeetDto } from '../dto/link-meet.dto.js';
import { AulaService } from '../service/aula.service.js';
@Controller('aulas')
@UseGuards(JwtGuard)
export class AulaController {
  constructor(private readonly aulas: AulaService) {}
  @Get(':id') detalhes(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.aulas.detalhes(req.usuario.sub, req.usuario.tipo, id);
  }
  @Patch(':id/link') @UseGuards(ProfessorGuard) atualizarLink(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkMeetDto,
  ) {
    return this.aulas.atualizarLink(req.usuario.sub, id, dto.linkMeet);
  }
  @Post(':id/iniciar') @UseGuards(ProfessorGuard) iniciar(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.aulas.iniciar(req.usuario.sub, id);
  }
}
