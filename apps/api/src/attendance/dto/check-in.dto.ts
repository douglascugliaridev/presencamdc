import { IsLatitude, IsLongitude, IsNumber } from 'class-validator'

export class CheckInDto {
  @IsNumber({}, { message: 'Latitude deve ser numérica' })
  @IsLatitude({ message: 'Latitude inválida' })
  latitude!: number

  @IsNumber({}, { message: 'Longitude deve ser numérica' })
  @IsLongitude({ message: 'Longitude inválida' })
  longitude!: number
}