import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { TipoUsuario } from '../entity/usuario.js';
import type { AuthRequest } from './jwt.guard.js';
@Injectable()
export class ProfessorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (
      context.switchToHttp().getRequest<AuthRequest>().usuario?.tipo !==
      TipoUsuario.PROFESSOR
    )
      throw new ForbiddenException(
        'Apenas professores podem cadastrar horários',
      );
    return true;
  }
}
