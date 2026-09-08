import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateClassDto, CreateEventDto, QueryEventsDto, UpdateClassDto } from './dto/class.dto'
import { ReportQueryDto, UnblockDto } from './dto/report.dto'
import { CreateStudentDto, QueryStudentsDto, UpdateStudentDto } from './dto/student.dto'

const BCRYPT_COST = 10

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private assertAdmin(user: AuthenticatedUser) {
    if (user.role.toUpperCase() !== Role.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem executar esta ação')
    }
  }

  private normalizeSearch(search?: string) {
    return search?.trim().toLowerCase()
  }

  // ----------------------- Alunos -----------------------

  async listStudents(user: AuthenticatedUser, query: QueryStudentsDto) {
    this.assertAdmin(user)
    const search = this.normalizeSearch(query.search)
    return this.prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        ...(query.classId ? { classId: query.classId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        isBlocked: true,
        blockedAt: true,
        unblockedAt: true,
        class: { select: { id: true, name: true } },
        _count: { select: { absences: true, attendances: true } },
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  async createStudent(user: AuthenticatedUser, dto: CreateStudentDto) {
    this.assertAdmin(user)
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST)
    const student = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: Role.STUDENT,
        classId: dto.classId,
      },
      select: { id: true, name: true, email: true, classId: true },
    })
    await this.audit.log(user.id, 'student.create', 'user', student.id, { email: student.email })
    return student
  }

  async updateStudent(user: AuthenticatedUser, id: string, dto: UpdateStudentDto) {
    this.assertAdmin(user)
    const student = await this.prisma.user.findUnique({ where: { id } })
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Aluno não encontrado')
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { name: dto.name, classId: dto.classId, isBlocked: dto.isBlocked },
      select: { id: true, name: true, email: true, isBlocked: true },
    })
    await this.audit.log(user.id, 'student.update', 'user', id, {
      name: dto.name,
      classId: dto.classId,
    })
    return updated
  }

  async unblock(user: AuthenticatedUser, id: string, dto: UnblockDto) {
    this.assertAdmin(user)
    const student = await this.prisma.user.findUnique({ where: { id } })
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Aluno não encontrado')
    }
    if (!student.isBlocked) {
      throw new ConflictException('Aluno não está bloqueado')
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isBlocked: false,
        unblockedAt: new Date(),
        unblockedById: user.id,
        blockedAt: null,
      },
      select: { id: true, name: true, isBlocked: true, unblockedAt: true },
    })
    await this.audit.log(user.id, 'student.unblock', 'user', id, {
      reason: dto.reason ?? null,
    })
    return updated
  }

  // ----------------------- Turmas -----------------------

  async listClasses(_user: AuthenticatedUser) {
    return this.prisma.class.findMany({
      select: {
        id: true,
        name: true,
        church: { select: { id: true, name: true } },
        _count: { select: { users: true, events: true } },
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  async createClass(user: AuthenticatedUser, dto: CreateClassDto) {
    this.assertAdmin(user)
    const church = await this.prisma.church.findUnique({ where: { id: dto.churchId } })
    if (!church) {
      throw new NotFoundException('Igreja não encontrada')
    }
    const classe = await this.prisma.class.create({
      data: { name: dto.name, churchId: dto.churchId },
      select: { id: true, name: true, churchId: true },
    })
    await this.audit.log(user.id, 'class.create', 'class', classe.id, { name: classe.name })
    return classe
  }

  async updateClass(user: AuthenticatedUser, id: string, dto: UpdateClassDto) {
    this.assertAdmin(user)
    const classe = await this.prisma.class.findUnique({ where: { id } })
    if (!classe) {
      throw new NotFoundException('Turma não encontrada')
    }
    const updated = await this.prisma.class.update({
      where: { id },
      data: { name: dto.name, churchId: dto.churchId },
      select: { id: true, name: true, churchId: true },
    })
    await this.audit.log(user.id, 'class.update', 'class', id, {
      name: dto.name ?? classe.name,
    })
    return updated
  }

  async deleteClass(user: AuthenticatedUser, id: string) {
    this.assertAdmin(user)
    const classe = await this.prisma.class.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    })
    if (!classe) {
      throw new NotFoundException('Turma não encontrada')
    }
    if (classe._count.users > 0) {
      throw new ConflictException('Não é possível excluir turma com alunos vinculados')
    }
    await this.prisma.class.delete({ where: { id } })
    await this.audit.log(user.id, 'class.delete', 'class', id)
    return { deleted: true }
  }

  // ----------------------- Eventos -----------------------

  async listEvents(_user: AuthenticatedUser, query: QueryEventsDto) {
    return this.prisma.event.findMany({
      where: { classId: query.classId },
      select: {
        id: true,
        name: true,
        eventDate: true,
        class: { select: { id: true, name: true } },
        _count: { select: { attendances: true, absences: true } },
        createdAt: true,
      },
      orderBy: { eventDate: 'desc' },
    })
  }

  async createEvent(user: AuthenticatedUser, dto: CreateEventDto) {
    this.assertAdmin(user)
    const classe = await this.prisma.class.findUnique({ where: { id: dto.classId } })
    if (!classe) {
      throw new NotFoundException('Turma não encontrada')
    }
    const eventDate = new Date(dto.eventDate)
    try {
      const event = await this.prisma.event.create({
        data: { classId: dto.classId, name: dto.name, eventDate },
        select: { id: true, name: true, eventDate: true, classId: true },
      })
      await this.audit.log(user.id, 'event.create', 'event', event.id, {
        classId: event.classId,
      })
      return event
    } catch (error) {
      if ((error as { code?: string } | null)?.code === 'P2002') {
        throw new ConflictException('Já existe um evento nesta data para esta turma')
      }
      throw error
    }
  }

  async deleteEvent(user: AuthenticatedUser, id: string) {
    this.assertAdmin(user)
    const event = await this.prisma.event.findUnique({ where: { id } })
    if (!event) {
      throw new NotFoundException('Evento não encontrado')
    }
    await this.audit.log(user.id, 'event.delete', 'event', id, { name: event.name })
    await this.prisma.event.delete({ where: { id } })
    return { deleted: true }
  }

  // ----------------------- Igreja & Configurações -----------------------

  async getChurch() {
    const church = await this.prisma.church.findFirst({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
      },
    })
    return church
  }

  async updateChurch(user: AuthenticatedUser, data: {
    name?: string
    latitude?: number
    longitude?: number
    radiusMeters?: number
  }) {
    this.assertAdmin(user)
    const church = await this.prisma.church.findFirst()
    if (!church) {
      throw new NotFoundException('Igreja não cadastrada')
    }
    const updated = await this.prisma.church.update({
      where: { id: church.id },
      data: {
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusMeters: data.radiusMeters,
      },
      select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true },
    })
    await this.audit.log(user.id, 'church.update', 'church', church.id, {
      latitude: data.latitude,
      longitude: data.longitude,
      radiusMeters: data.radiusMeters,
    })
    return updated
  }

  async getSettings() {
    const settings = await this.prisma.setting.findMany()
    const map: Record<string, string> = {}
    for (const s of settings) {
      map[s.key] = s.value
    }
    return map
  }

  async updateSettings(user: AuthenticatedUser, data: Record<string, string>) {
    this.assertAdmin(user)
    for (const [key, value] of Object.entries(data)) {
      await this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    }
    await this.audit.log(user.id, 'settings.update', 'setting', undefined, data)
    return this.getSettings()
  }

  // ----------------------- Relatórios -----------------------

  async summary(user: AuthenticatedUser) {
    this.assertAdmin(user)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    const [totalStudents, blockedStudents, todayAttendances] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.user.count({ where: { role: Role.STUDENT, isBlocked: true } }),
      this.prisma.attendance.count({ where: { checkedInAt: { gte: start, lte: end } } }),
    ])

    return { totalStudents, blockedStudents, todayAttendances }
  }

  async attendanceByStudent(user: AuthenticatedUser, query: ReportQueryDto) {
    this.assertAdmin(user)
    return this.attendanceReport(user, 'student', query)
  }

  async attendanceByClass(user: AuthenticatedUser, query: ReportQueryDto) {
    this.assertAdmin(user)
    return this.attendanceReport(user, 'class', query)
  }

  async blockedStudents(user: AuthenticatedUser) {
    this.assertAdmin(user)
    return this.prisma.user.findMany({
      where: { role: Role.STUDENT, isBlocked: true },
      select: {
        id: true,
        name: true,
        email: true,
        blockedAt: true,
        unblockedAt: true,
        class: { select: { id: true, name: true } },
        _count: { select: { absences: true, attendances: true } },
      },
      orderBy: { blockedAt: 'desc' },
    })
  }

  private async attendanceReport(
    user: AuthenticatedUser,
    mode: 'student' | 'class',
    query: ReportQueryDto,
  ) {
    this.assertAdmin(user)
    const where: any = {}
    if (query.start) where.eventDate = { ...(where.eventDate ?? {}), gte: new Date(query.start) }
    if (query.end) where.eventDate = { ...(where.eventDate ?? {}), lte: new Date(query.end) }
    if (query.classId) where.classId = query.classId

    const events = await this.prisma.event.findMany({
      where,
      select: { id: true, name: true, eventDate: true, classId: true },
      orderBy: { eventDate: 'asc' },
    })
    const eventIds = events.map((e) => e.id)

    if (mode === 'class') {
      const classes = await this.prisma.class.findMany({
        select: {
          id: true,
          name: true,
          users: {
            select: {
              id: true,
              attendances: {
                where: { eventId: { in: eventIds } },
                select: { eventId: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      })
      return {
        events,
        classes: classes.map((c) => {
          const enrolled = c.users.length
          const totalExpected = enrolled * events.length
          const totalPresent = c.users.reduce((acc, u) => acc + u.attendances.length, 0)
          return {
            id: c.id,
            name: c.name,
            enrolled,
            totalExpected,
            totalPresent,
            totalAbsences: totalExpected - totalPresent,
            attendanceRate:
              totalExpected === 0 ? null : Math.round((totalPresent / totalExpected) * 100) / 100,
          }
        }),
      }
    }

    const students = await this.prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        ...(query.classId ? { classId: query.classId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        class: { select: { name: true } },
        attendances: {
          where: { eventId: { in: eventIds } },
          select: { eventId: true, checkedInAt: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return {
      events,
      students: students.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        className: s.class?.name ?? null,
        present: s.attendances.length,
        absences: eventIds.length - s.attendances.length,
      })),
    }
  }

  async listChurches(user: AuthenticatedUser) {
    this.assertAdmin(user)
    return this.prisma.church.findMany({
      select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true },
    })
  }
}