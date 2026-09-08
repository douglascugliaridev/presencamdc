import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator'

export class CreateClassDto {
  @IsString({ message: 'Nome da turma inválido' })
  @MinLength(2, { message: 'O nome da turma deve ter pelo menos 2 caracteres' })
  name!: string

  @IsUUID(undefined, { message: 'Selecione uma igreja válida' })
  churchId!: string
}

export class UpdateClassDto {
  @IsOptional()
  @IsString({ message: 'Nome da turma inválido' })
  @MinLength(2, { message: 'O nome da turma deve ter pelo menos 2 caracteres' })
  name?: string

  @IsOptional()
  @IsUUID(undefined, { message: 'Selecione uma igreja válida' })
  churchId?: string
}

export class CreateEventDto {
  @IsUUID(undefined, { message: 'Selecione uma turma válida' })
  classId!: string

  @IsString({ message: 'Nome do evento inválido' })
  @MinLength(2, { message: 'O nome do evento deve ter pelo menos 2 caracteres' })
  name!: string

  @IsDateString({}, { message: 'Informe uma data válida' })
  eventDate!: string
}

export class QueryEventsDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'Identificador de turma inválido' })
  classId?: string
}