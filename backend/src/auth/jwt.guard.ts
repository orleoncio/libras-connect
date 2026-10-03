import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { TipoUsuario } from '../entity/usuario.js';
export interface AuthRequest extends Request {
  usuario: { sub: string; tipo: TipoUsuario };
}
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const match = /^Bearer ([^ ]+)$/i.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('Token ausente');
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        tipo: TipoUsuario;
      }>(match[1], { algorithms: ['HS256'] });
      if (
        typeof payload.sub !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(payload.sub) ||
        !Object.values(TipoUsuario).includes(payload.tipo)
      )
        throw new Error('Payload inválido');
      request.usuario = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
