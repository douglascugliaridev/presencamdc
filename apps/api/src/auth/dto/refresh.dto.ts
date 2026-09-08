import { IsString } from 'class-validator'

export class RefreshDto {
  @IsString({ message: 'Token de renovação inválido' })
  refreshToken!: string
}