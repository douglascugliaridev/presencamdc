import { IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateChurchDto {
  @IsOptional()
  @IsString({ message: 'Nome da igreja inválido' })
  name?: string

  @IsOptional()
  @Type(() => Number)
  @IsLatitude({ message: 'Latitude inválida' })
  latitude?: number

  @IsOptional()
  @Type(() => Number)
  @IsLongitude({ message: 'Longitude inválida' })
  longitude?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Raio deve ser um número inteiro' })
  @Min(1, { message: 'O raio deve ser de pelo menos 1 metro' })
  @Max(100_000, { message: 'O raio máximo é de 100 km' })
  radiusMeters?: number
}