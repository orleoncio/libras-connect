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
import { AlunoGuard } from '../auth/aluno.guard.js';
import { ProfessorGuard } from '../auth/professor.guard.js';
import { TipoUsuario } from '../entity/usuario.js';
import {
  CriarSolicitacaoDto,
  PerfilAlunoDto,
  PerfilProfessorDto,
} from '../dto/plataforma.dto.js';
import { PlataformaService } from '../service/plataforma.service.js';
import { LinkMeetDto } from '../dto/link-meet.dto.js';
@Controller()
@UseGuards(JwtGuard)
export class PlataformaController {
  constructor(private readonly plataforma: PlataformaService) {}
  @Patch('alunos/me') @UseGuards(AlunoGuard) perfilAluno(
    @Req() req: AuthRequest,
    @Body() dto: PerfilAlunoDto,
  ) {
    return this.plataforma.perfil(req.usuario.sub, TipoUsuario.ALUNO, dto);
  }
  @Patch('professores/me') @UseGuards(ProfessorGuard) perfilProfessor(
    @Req() req: AuthRequest,
    @Body() dto: PerfilProfessorDto,
  ) {
    return this.plataforma.perfil(req.usuario.sub, TipoUsuario.PROFESSOR, dto);
  }
  @Get('professores') @UseGuards(AlunoGuard) professores(
    @Req() req: AuthRequest,
  ) {
    return this.plataforma.professores(req.usuario.sub);
  }
  @Get('professores/me/horarios') @UseGuards(ProfessorGuard) horarios(
    @Req() req: AuthRequest,
  ) {
    return this.plataforma.horarios(req.usuario.sub);
  }
  @Post('solicitacoes') @UseGuards(AlunoGuard) solicitar(
    @Req() req: AuthRequest,
    @Body() dto: CriarSolicitacaoDto,
  ) {
    return this.plataforma.solicitar(req.usuario.sub, dto.horarioId);
  }
  @Get('solicitacoes') solicitacoes(@Req() req: AuthRequest) {
    return this.plataforma.solicitacoes(req.usuario.sub, req.usuario.tipo);
  }
  @Patch('solicitacoes/:id/aceitar') @UseGuards(ProfessorGuard) aceitar(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkMeetDto,
  ) {
    return this.plataforma.decidir(req.usuario.sub, id, true, dto.linkMeet);
  }
  @Patch('solicitacoes/:id/recusar') @UseGuards(ProfessorGuard) recusar(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.plataforma.decidir(req.usuario.sub, id, false);
  }
  @Get('aulas') aulas(@Req() req: AuthRequest) {
    return this.plataforma.aulas(req.usuario.sub, req.usuario.tipo);
  }
}
