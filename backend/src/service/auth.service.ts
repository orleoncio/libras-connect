import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource, QueryFailedError } from 'typeorm';
import { compare, hash } from 'bcryptjs';
import { Aluno, Professor, TipoUsuario, Usuario } from '../entity/usuario.js';
import {
  AlunoPerfil,
  ProfessorPerfil,
  UsuarioRegistro,
} from '../entity/usuario.entity.js';
import type {
  LoginDto,
  RegistroAlunoDto,
  RegistroProfessorDto,
} from '../dto/auth.dto.js';
@Injectable()
export class AuthService {
  constructor(
    private readonly db: DataSource,
    private readonly jwt: JwtService,
  ) {}
  async registrar(
    dto: RegistroAlunoDto | RegistroProfessorDto,
    tipo: TipoUsuario,
  ) {
    if (Buffer.byteLength(dto.senha, 'utf8') > 72)
      throw new BadRequestException('Senha deve ter no máximo 72 bytes');
    const senhaHash = await hash(dto.senha, 12);
    try {
      const usuario = await this.db.transaction(async (manager) => {
        const registro = manager.create(UsuarioRegistro, {
          nome: dto.nome,
          email: dto.email,
          telefone: dto.telefone,
          nivelLibras: dto.nivelLibras,
          tipo,
          senhaHash,
        });
        await manager.save(registro);
        if (tipo === TipoUsuario.ALUNO) {
          const objetivoAprendizado =
            (dto as RegistroAlunoDto).objetivoAprendizado ?? null;
          await manager.save(AlunoPerfil, {
            usuarioId: registro.id,
            objetivoAprendizado,
          });
          return Object.assign(new Aluno(), registro, { objetivoAprendizado });
        }
        const { biografia, especialidades, anosExperiencia } =
          dto as RegistroProfessorDto;
        await manager.save(ProfessorPerfil, {
          usuarioId: registro.id,
          biografia,
          especialidades,
          anosExperiencia,
        });
        return Object.assign(new Professor(), registro, {
          biografia,
          especialidades,
          anosExperiencia,
        });
      });
      return this.publico(usuario);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException('Email já cadastrado');
      }
      throw error;
    }
  }
  async login(dto: LoginDto, tipo: TipoUsuario) {
    const usuario = await this.db
      .getRepository(UsuarioRegistro)
      .createQueryBuilder('usuario')
      .addSelect('usuario.senhaHash')
      .where('usuario.email = :email', { email: dto.email })
      .andWhere('usuario.tipo = :tipo', { tipo })
      .getOne();
    if (
      !usuario ||
      Buffer.byteLength(dto.senha, 'utf8') > 72 ||
      !(await compare(dto.senha, usuario.senhaHash))
    ) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    return {
      accessToken: await this.jwt.signAsync({
        sub: usuario.id,
        tipo: usuario.tipo,
      }),
      tokenType: 'Bearer',
      expiresIn: 3600,
      usuario: await this.me(usuario.id),
    };
  }
  async me(id: string) {
    const usuario = await this.db
      .getRepository(UsuarioRegistro)
      .findOneBy({ id });
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado');
    if (usuario.tipo === TipoUsuario.ALUNO) {
      const perfil = await this.db
        .getRepository(AlunoPerfil)
        .findOneBy({ usuarioId: id });
      if (!perfil) throw new UnauthorizedException('Perfil não encontrado');
      return this.publico(
        Object.assign(new Aluno(), usuario, {
          objetivoAprendizado: perfil.objetivoAprendizado,
        }),
      );
    }
    const perfil = await this.db
      .getRepository(ProfessorPerfil)
      .findOneBy({ usuarioId: id });
    if (!perfil) throw new UnauthorizedException('Perfil não encontrado');
    return this.publico(
      Object.assign(new Professor(), usuario, {
        biografia: perfil.biografia,
        especialidades: perfil.especialidades,
        anosExperiencia: perfil.anosExperiencia,
      }),
    );
  }
  private publico(usuario: Usuario) {
    const { senhaHash: _senhaHash, ...publico } = usuario;
    return publico;
  }
}
