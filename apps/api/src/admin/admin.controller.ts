import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { AdminService } from './admin.service'
import { CreateClassDto, CreateEventDto, QueryEventsDto, UpdateClassDto } from './dto/class.dto'
import { UpdateChurchDto } from './dto/church.dto'
import { ReportQueryDto, UnblockDto } from './dto/report.dto'
import { CreateStudentDto, QueryStudentsDto, UpdateStudentDto } from './dto/student.dto'

@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.summary(user)
  }

  // Alunos
  @Get('students')
  listStudents(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryStudentsDto) {
    return this.adminService.listStudents(user, query)
  }

  @Post('students')
  createStudent(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStudentDto) {
    return this.adminService.createStudent(user, dto)
  }

  @Patch('students/:id')
  updateStudent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.adminService.updateStudent(user, id, dto)
  }

  @Patch('students/:id/unblock')
  unblock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UnblockDto,
  ) {
    return this.adminService.unblock(user, id, dto)
  }

  // Turmas
  @Get('classes')
  listClasses(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.listClasses(user)
  }

  @Post('classes')
  createClass(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateClassDto) {
    return this.adminService.createClass(user, dto)
  }

  @Patch('classes/:id')
  updateClass(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.adminService.updateClass(user, id, dto)
  }

  @Delete('classes/:id')
  deleteClass(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.adminService.deleteClass(user, id)
  }

  // Eventos
  @Get('events')
  listEvents(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryEventsDto) {
    return this.adminService.listEvents(user, query)
  }

  @Post('events')
  createEvent(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.adminService.createEvent(user, dto)
  }

  @Delete('events/:id')
  deleteEvent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.adminService.deleteEvent(user, id)
  }

  // Relatórios
  @Get('reports/attendance/by-student')
  byStudent(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportQueryDto) {
    return this.adminService.attendanceByStudent(user, query)
  }

  @Get('reports/attendance/by-class')
  byClass(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportQueryDto) {
    return this.adminService.attendanceByClass(user, query)
  }

  @Get('reports/blocked-students')
  blockedStudents(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.blockedStudents(user)
  }

  // Igreja & Configurações
  @Get('church')
  getChurch(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.getChurch()
  }

  @Patch('church')
  updateChurch(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateChurchDto) {
    return this.adminService.updateChurch(user, dto)
  }

  @Get('settings')
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.getSettings()
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Record<string, string>,
  ) {
    return this.adminService.updateSettings(user, dto)
  }

  @Get('churches')
  listChurches(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.listChurches(user)
  }
}