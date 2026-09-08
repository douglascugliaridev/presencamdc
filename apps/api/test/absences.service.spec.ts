import { Test } from '@nestjs/testing'
import { AbsencesService } from '../src/absences/absences.service'
import { PrismaService } from '../src/prisma/prisma.service'

describe('AbsencesService', () => {
  let service: AbsencesService
  let prisma: any

  beforeEach(async () => {
    prisma = {
      event: { findMany: jest.fn() },
      user: { findMany: jest.fn(), update: jest.fn() },
      attendance: { findMany: jest.fn() },
      absence: { create: jest.fn(), count: jest.fn() },
      setting: { findUnique: jest.fn() },
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        AbsencesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = moduleRef.get(AbsencesService)
  })

  it('retorna zero quando não há eventos passados', async () => {
    prisma.event.findMany.mockResolvedValue([])
    const result = await service.processPastEvents()
    expect(result).toEqual({ absencesCreated: 0, blocked: [] })
  })

  it('cria faltas para alunos que não marcaram presença', async () => {
    prisma.event.findMany.mockResolvedValue([
      { id: 'evt-1', name: 'Culto', classId: 'c1', eventDate: new Date('2026-09-01') },
    ])
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1' },
      { id: 'u2' },
      { id: 'u3' },
    ])
    prisma.attendance.findMany.mockResolvedValue([{ userId: 'u2' }])
    prisma.absence.create.mockResolvedValue({})
    prisma.setting.findUnique.mockResolvedValue({ key: 'max_faltas', value: '3' })
    prisma.absence.count.mockResolvedValue(1)

    const result = await service.processPastEvents()

    expect(prisma.absence.create).toHaveBeenCalledTimes(2)
    expect(result.absencesCreated).toBe(2)
  })

  it('ignora faltas duplicadas (P2002)', async () => {
    prisma.event.findMany.mockResolvedValue([
      { id: 'evt-1', name: 'Culto', classId: 'c1', eventDate: new Date('2026-09-01') },
    ])
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }])
    prisma.attendance.findMany.mockResolvedValue([])
    prisma.absence.create.mockRejectedValue({ code: 'P2002' })

    const result = await service.processPastEvents()

    expect(result.absencesCreated).toBe(0)
  })

  it('bloqueia aluno que atingiu o limite de faltas', async () => {
    prisma.event.findMany.mockResolvedValue([
      { id: 'evt-1', name: 'Culto', classId: 'c1', eventDate: new Date('2026-09-01') },
    ])
    prisma.user.findMany
      .mockResolvedValueOnce([{ id: 'u1' }])
      .mockResolvedValueOnce([{ id: 'u1', isBlocked: false, unblockedAt: null }])
    prisma.attendance.findMany.mockResolvedValue([])
    prisma.absence.create.mockResolvedValue({})
    prisma.setting.findUnique.mockResolvedValue({ key: 'max_faltas', value: '3' })
    prisma.absence.count.mockResolvedValue(3)

    const result = await service.processPastEvents()

    expect(result.blocked).toEqual(['u1'])
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isBlocked: true }),
      }),
    )
  })

  it('não conta faltas anteriores ao último desbloqueio', async () => {
    prisma.setting.findUnique.mockResolvedValue({ key: 'max_faltas', value: '3' })
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', isBlocked: false, unblockedAt: new Date('2026-08-01') },
    ])
    prisma.absence.count.mockResolvedValue(1)

    const blocked = await service.applyAutomaticBlocking(['u1'])

    const where = prisma.absence.count.mock.calls[0][0].where
    expect(where.createdAt?.gt).toBeInstanceOf(Date)
    expect(blocked).toEqual([])
  })
})