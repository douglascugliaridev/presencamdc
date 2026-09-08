import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

export type AuditAction =
  | 'student.create'
  | 'student.update'
  | 'student.unblock'
  | 'class.create'
  | 'class.update'
  | 'class.delete'
  | 'event.create'
  | 'event.delete'
  | 'settings.update'
  | 'church.update'

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    actorId: string,
    action: AuditAction,
    entity: string,
    entityId?: string,
    detail?: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        detail: (detail ?? {}) as Prisma.InputJsonValue,
      },
    })
  }
}