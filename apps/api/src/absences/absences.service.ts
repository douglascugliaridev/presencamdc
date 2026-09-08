import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const MAX_ABSENCES_KEY = 'max_faltas'
const DEFAULT_MAX_ABSENCES = 3

@Injectable()
export class AbsencesService {
  private readonly logger = new Logger(AbsencesService.name)

  constructor(private readonly prisma: PrismaService) {}

  async processPastEvents(): Promise<{ absencesCreated: number; blocked: string[] }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const pastEvents = await this.prisma.event.findMany({
      where: { eventDate: { lt: today } },
      select: { id: true, name: true, classId: true, eventDate: true },
    })

    if (pastEvents.length === 0) {
      this.logger.log('Nenhum evento passado para processar faltas')
      return { absencesCreated: 0, blocked: [] }
    }

    const affectedUserIds = new Set<string>()
    let absencesCreated = 0

    for (const event of pastEvents) {
      const students = await this.prisma.user.findMany({
        where: { role: 'STUDENT', classId: event.classId },
        select: { id: true },
      })
      if (students.length === 0) continue

      const attended = await this.prisma.attendance.findMany({
        where: { eventId: event.id },
        select: { userId: true },
      })
      const attendedIds = new Set(attended.map((a) => a.userId))

      for (const student of students) {
        if (attendedIds.has(student.id)) continue
        try {
          await this.prisma.absence.create({
            data: { userId: student.id, eventId: event.id },
          })
          absencesCreated += 1
          affectedUserIds.add(student.id)
        } catch (error) {
          if ((error as { code?: string } | null)?.code === 'P2002') continue
          throw error
        }
      }
    }

    const blocked = await this.applyAutomaticBlocking([...affectedUserIds])
    this.logger.log(
      `Faltas processadas: ${absencesCreated} criadas, ${blocked.length} alunos bloqueados`,
    )
    return { absencesCreated, blocked }
  }

  async applyAutomaticBlocking(userIds: string[]): Promise<string[]> {
    const blocked: string[] = []
    if (userIds.length === 0) return blocked

    const setting = await this.prisma.setting.findUnique({ where: { key: MAX_ABSENCES_KEY } })
    const maxAbsences = Number(setting?.value ?? DEFAULT_MAX_ABSENCES)

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, isBlocked: true, unblockedAt: true },
    })

    for (const user of users) {
      if (user.isBlocked) continue
      const absencesCount = await this.prisma.absence.count({
        where: {
          userId: user.id,
          ...(user.unblockedAt ? { createdAt: { gt: user.unblockedAt } } : {}),
        },
      })
      if (absencesCount >= maxAbsences) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isBlocked: true, blockedAt: new Date() },
        })
        blocked.push(user.id)
      }
    }

    return blocked
  }
}