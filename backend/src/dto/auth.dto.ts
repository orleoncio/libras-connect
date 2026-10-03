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
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { NivelLibras } from '../entity/usuario.js';
export class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^[\s\S]{8,72}$/u)
  senha: string;
}
export class RegistroUsuarioDto extends LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string;
  @IsString() @Matches(/^\+?[0-9 ()-]{8,25}$/) telefone: string;
  @IsEnum(NivelLibras) nivelLibras: NivelLibras;
}
export class RegistroAlunoDto extends RegistroUsuarioDto {
  @IsOptional() @IsString() @MaxLength(1000) objetivoAprendizado?: string;
}
export class RegistroProfessorDto extends RegistroUsuarioDto {
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
