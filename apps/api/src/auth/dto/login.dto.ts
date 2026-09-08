import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email!: string

  @IsString({ message: 'Senha inválida' })
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  password!: string
}