import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AttendanceService } from '../src/attendance/attendance.service'
import { GeoService } from '../src/common/geo/geo.service'
import { PrismaService } from '../src/prisma/prisma.service'

const CHURCH = {
  id: 'church-1',
  name: 'Igreja Teste',
  latitude: 0,
  longitude: 0,
  radiusMeters: 100,
}

const STUDENT = {
  id: 'student-1',
  name: 'Aluno',
  email: 'aluno@teste.com',
  role: 'STUDENT',
  isBlocked: false,
  classId: 'class-1',
  class: { church: CHURCH },
}

describe('AttendanceService — check-in', () => {
  let service: AttendanceService
  let prisma: any

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      event: { findFirst: jest.fn() },
      attendance: { findUnique: jest.fn(), create: jest.fn() },
      setting: { findUnique: jest.fn() },
      absence: { count: jest.fn() },
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        AttendanceService,
        GeoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = moduleRef.get(AttendanceService)
  })

  it('rejeita aluno bloqueado antes de qualquer outra checagem', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...STUDENT, isBlocked: true })

    await expect(
      service.checkIn(
        { id: 'student-1', email: 'a@b.com', role: 'student' },
        { latitude: 0, longitude: 0 },
      ),
    ).rejects.toThrow(ForbiddenException)
    expect(prisma.event.findFirst).not.toHaveBeenCalled()
  })

  it('rejeita aluno sem igreja vinculada à turma', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...STUDENT,
      class: { church: null },
    })

    await expect(
      service.checkIn(
        { id: 'student-1', email: 'a@b.com', role: 'student' },
        { latitude: 0, longitude: 0 },
      ),
    ).rejects.toThrow(ForbiddenException)
  })

  it('rejeita quando não há evento hoje', async () => {
    prisma.user.findUnique.mockResolvedValue(STUDENT)
    prisma.event.findFirst.mockResolvedValue(null)

    await expect(
      service.checkIn(
        { id: 'student-1', email: 'a@b.com', role: 'student' },
        { latitude: 0, longitude: 0 },
      ),
    ).rejects.toThrow(NotFoundException)
  })

  it('rejeita check-in fora do raio da igreja', async () => {
    prisma.user.findUnique.mockResolvedValue(STUDENT)
    prisma.event.findFirst.mockResolvedValue({ id: 'event-1', name: 'Culto' })

    // ~111km de distância da igreja (0,0)
    await expect(
      service.checkIn(
        { id: 'student-1', email: 'a@b.com', role: 'student' },
        { latitude: 1, longitude: 0 },
      ),
    ).rejects.toThrow(ForbiddenException)
  })

  it('evita duplicidade quando a presença já existe', async () => {
    prisma.user.findUnique.mockResolvedValue(STUDENT)
    prisma.event.findFirst.mockResolvedValue({ id: 'event-1', name: 'Culto' })
    prisma.attendance.findUnique.mockResolvedValue({ id: 'attendance-1' })

    await expect(
      service.checkIn(
        { id: 'student-1', email: 'a@b.com', role: 'student' },
        { latitude: 0, longitude: 0 },
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('evita duplicidade por constraint do banco (P2002)', async () => {
    prisma.user.findUnique.mockResolvedValue(STUDENT)
    prisma.event.findFirst.mockResolvedValue({ id: 'event-1', name: 'Culto' })
    prisma.attendance.findUnique.mockResolvedValue(null)
    prisma.attendance.create.mockRejectedValue({ code: 'P2002' })

    await expect(
      service.checkIn(
        { id: 'student-1', email: 'a@b.com', role: 'student' },
        { latitude: 0, longitude: 0 },
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('cria presença quando dentro do raio e evento existe', async () => {
    prisma.user.findUnique.mockResolvedValue(STUDENT)
    prisma.event.findFirst.mockResolvedValue({
      id: 'event-1',
      name: 'Culto',
      eventDate: new Date(),
    })
    prisma.attendance.findUnique.mockResolvedValue(null)
    prisma.attendance.create.mockResolvedValue({
      id: 'attendance-1',
      checkedInAt: new Date(),
    })

    const result = await service.checkIn(
      { id: 'student-1', email: 'a@b.com', role: 'student' },
      { latitude: 0, longitude: 0 },
    )

    expect(result.id).toBe('attendance-1')
    expect(prisma.attendance.create).toHaveBeenCalledWith({
      data: {
        userId: 'student-1',
        eventId: 'event-1',
        latitude: 0,
        longitude: 0,
      },
    })
  })

  it('retorna status com faltas após o último desbloqueio', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-1',
      isBlocked: false,
      unblockedAt: new Date('2026-01-01'),
    })
    prisma.setting.findUnique.mockResolvedValue({ key: 'max_faltas', value: '3' })
    prisma.absence.count.mockResolvedValue(2)

    const status = await service.status('student-1')

    expect(status).toEqual({ absencesCount: 2, maxAbsences: 3, isBlocked: false })
  })
})