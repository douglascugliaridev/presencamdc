import { Type } from 'class-transformer'
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

export class ReportQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'Informe uma data inicial válida' })
  start?: string

  @IsOptional()
  @IsDateString({}, { message: 'Informe uma data final válida' })
  end?: string

  @IsOptional()
  @IsUUID(undefined, { message: 'Identificador de turma inválido' })
  classId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limite deve ser um número inteiro' })
  @Min(1, { message: 'Limite deve ser entre 1 e 100' })
  @Max(100, { message: 'Limite deve ser entre 1 e 100' })
  limit?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Deslocamento deve ser um número inteiro' })
  @Min(0, { message: 'Deslocamento não pode ser negativo' })
  offset?: number
}

export class UnblockDto {
  @IsOptional()
  @IsString({ message: 'Motivo inválido' })
  reason?: string
}