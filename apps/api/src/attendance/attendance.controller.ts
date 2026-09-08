import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator'
import { AttendanceService } from './attendance.service'
import { CheckInDto } from './dto/check-in.dto'

@Controller()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('attendance/check-in')
  @HttpCode(HttpStatus.CREATED)
  checkIn(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(user, dto)
  }

  @Get('me/status')
  @HttpCode(HttpStatus.OK)
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.status(user.id)
  }
}