import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator'
import { GeoService } from '../common/geo/geo.service'
import { PrismaService } from '../prisma/prisma.service'
import { CheckInDto } from './dto/check-in.dto'

const MAX_ABSENCES_KEY = 'max_faltas'
const DEFAULT_MAX_ABSENCES = 3

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  async checkIn(user: AuthenticatedUser, dto: CheckInDto) {
    const student = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { class: { include: { church: true } } },
    })

    if (!student) {
      throw new NotFoundException('Usuário não encontrado')
    }

    if (student.isBlocked) {
      throw new ForbiddenException(
        'Você está bloqueado por faltas e não pode marcar presença',
      )
    }

    const classId = student.classId
    if (!classId) {
      throw new ForbiddenException('Seu usuário não está vinculado a uma turma')
    }

    const church = student.class?.church
    if (!church) {
      throw new ForbiddenException('Sua turma não possui uma igreja vinculada')
    }

    const event = await this.findTodayEvent(classId)
    if (!event) {
      throw new NotFoundException('Nenhum culto/evento agendado para hoje')
    }

    const distanceMeters = this.geo.calculateDistanceMeters(
      dto.latitude,
      dto.longitude,
      church.latitude,
      church.longitude,
    )

    if (!this.geo.isWithinRadius(distanceMeters, church.radiusMeters)) {
      throw new ForbiddenException(
        `Você está fora do raio permitido (${Math.round(distanceMeters)}m de distância)`,
      )
    }

    const existing = await this.prisma.attendance.findUnique({
      where: {
        userId_eventId: { userId: student.id, eventId: event.id },
      },
    })
    if (existing) {
      throw new ConflictException('Presença já marcada para este evento')
    }

    try {
      const attendance = await this.prisma.attendance.create({
        data: {
          userId: student.id,
          eventId: event.id,
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      })

      return {
        id: attendance.id,
        checkedInAt: attendance.checkedInAt,
        event: { id: event.id, name: event.name, eventDate: event.eventDate },
      }
    } catch (error) {
      if ((error as { code?: string } | null)?.code === 'P2002') {
        throw new ConflictException('Presença já marcada para este evento')
      }
      throw error
    }
  }

  async status(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isBlocked: true, unblockedAt: true },
    })

    if (!user) {
      throw new NotFoundException('Usuário não encontrado')
    }

    const setting = await this.prisma.setting.findUnique({
      where: { key: MAX_ABSENCES_KEY },
    })
    const maxAbsences = Number(setting?.value ?? DEFAULT_MAX_ABSENCES)

    const absencesCount = await this.prisma.absence.count({
      where: {
        userId,
        ...(user.unblockedAt
          ? { createdAt: { gt: user.unblockedAt } }
          : {}),
      },
    })

    return {
      absencesCount,
      maxAbsences,
      isBlocked: user.isBlocked,
    }
  }

  private findTodayEvent(classId: string) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)

    const end = new Date()
    end.setHours(23, 59, 59, 999)

    return this.prisma.event.findFirst({
      where: {
        classId,
        eventDate: { gte: start, lte: end },
      },
    })
  }
}