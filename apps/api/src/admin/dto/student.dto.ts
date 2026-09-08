import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator'

export class CreateStudentDto {
  @IsString({ message: 'Nome inválido' })
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
  name!: string

  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email!: string

  @IsString({ message: 'Senha inválida' })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  password!: string

  @IsUUID(undefined, { message: 'Selecione uma turma válida' })
  classId!: string
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString({ message: 'Nome inválido' })
  @MinLength(2, { message: 'O nome deve ter pelo menos 2 caracteres' })
  name?: string

  @IsOptional()
  @IsUUID(undefined, { message: 'Selecione uma turma válida' })
  classId?: string

  @IsOptional()
  @IsBoolean({ message: 'Valor inválido para bloqueio' })
  isBlocked?: boolean
}

export class QueryStudentsDto {
  @IsOptional()
  @IsString({ message: 'Busca inválida' })
  search?: string

  @IsOptional()
  @IsUUID(undefined, { message: 'Identificador de turma inválido' })
  classId?: string
}