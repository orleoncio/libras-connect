import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsISO8601,
  Matches,
  ValidateNested,
} from 'class-validator';
export class InicioHorarioDto {
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/,
    { message: 'inicio deve conter data, hora, segundos e fuso (Z ou ±HH:MM)' },
  )
  inicio: string;
}
export class RegistrarHorariosDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(168)
  @ValidateNested({ each: true })
  @Type(() => InicioHorarioDto)
  horarios: InicioHorarioDto[];
}
