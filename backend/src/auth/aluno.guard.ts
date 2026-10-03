import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { TipoUsuario } from '../entity/usuario.js';
import type { AuthRequest } from './jwt.guard.js';
@Injectable()
export class AlunoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (
      context.switchToHttp().getRequest<AuthRequest>().usuario?.tipo !==
      TipoUsuario.ALUNO
    )
      throw new ForbiddenException('Apenas alunos podem acessar esta operação');
    return true;
  }
}
