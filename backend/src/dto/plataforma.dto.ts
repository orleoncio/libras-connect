import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { NivelLibras } from '../entity/usuario.js';
export class PerfilUsuarioDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string;
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
  @IsString() @Matches(/^\+?[0-9 ()-]{8,25}$/) telefone: string;
  @IsEnum(NivelLibras) nivelLibras: NivelLibras;
}
export class PerfilAlunoDto extends PerfilUsuarioDto {
  @IsOptional() @IsString() @MaxLength(1000) objetivoAprendizado?: string;
}
export class PerfilProfessorDto extends PerfilUsuarioDto {
  @IsString() @MinLength(1) @MaxLength(2000) biografia: string;
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  especialidades: string[];
  @IsInt() @Min(0) @Max(100) anosExperiencia: number;
}
export class CriarSolicitacaoDto {
  @IsUUID() horarioId: string;
}
