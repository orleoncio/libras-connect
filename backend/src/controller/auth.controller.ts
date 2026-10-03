import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../service/auth.service.js';
import {
  LoginDto,
  RegistroAlunoDto,
  RegistroProfessorDto,
} from '../dto/auth.dto.js';
import { JwtGuard } from '../auth/jwt.guard.js';
import type { AuthRequest } from '../auth/jwt.guard.js';
import { TipoUsuario } from '../entity/usuario.js';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('alunos/registro') registrarAluno(@Body() dto: RegistroAlunoDto) {
    return this.auth.registrar(dto, TipoUsuario.ALUNO);
  }
  @Post('professores/registro') registrarProfessor(
    @Body() dto: RegistroProfessorDto,
  ) {
    return this.auth.registrar(dto, TipoUsuario.PROFESSOR);
  }
  @Post('alunos/login') @HttpCode(200) loginAluno(@Body() dto: LoginDto) {
    return this.auth.login(dto, TipoUsuario.ALUNO);
  }
  @Post('professores/login') @HttpCode(200) loginProfessor(
    @Body() dto: LoginDto,
  ) {
    return this.auth.login(dto, TipoUsuario.PROFESSOR);
  }
  @Get('me') @UseGuards(JwtGuard) me(@Req() request: AuthRequest) {
    return this.auth.me(request.usuario.sub);
  }
}
