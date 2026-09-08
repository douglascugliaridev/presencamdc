import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AdminService } from '../src/admin/admin.service'
import { AuditService } from '../src/common/audit/audit.service'
import { PrismaService } from '../src/prisma/prisma.service'

const ADMIN = { id: 'admin-1', email: 'admin@x.com', role: 'admin' }

describe('AdminService', () => {
  let service: AdminService
  let prisma: any

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      class: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      event: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
      church: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      setting: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
      attendance: { count: jest.fn() },
      auditLog: { create: jest.fn() },
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile()

    service = moduleRef.get(AdminService)
  })

  it('lista apenas alunos (role student)', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 's1', name: 'Ana' }])
    const result = await service.listStudents(ADMIN, {})
    expect(result).toHaveLength(1)
    expect(prisma.user.findMany.mock.calls[0][0].where.role).toBe('STUDENT')
  })

  it('cria aluno com senha criptografada (bcrypt)', async () => {
    prisma.user.create.mockResolvedValue({ id: 's1', name: 'Ana', email: 'ana@x.com' })
    const result = await service.createStudent(ADMIN, {
      name: 'Ana',
      email: 'ana@x.com',
      password: 'segredo123',
      classId: 'class-1',
    })
    const data = prisma.user.create.mock.calls[0][0].data
    expect(data.passwordHash).not.toBe('segredo123')
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/)
    expect(result.id).toBe('s1')
  })

  it('não permite desbloquear aluno que não está bloqueado', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 's1',
      role: 'STUDENT',
      isBlocked: false,
    })
    await expect(service.unblock(ADMIN, 's1', {})).rejects.toThrow(ConflictException)
  })

  it('desbloqueia e registra quem desbloqueou', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 's1', role: 'STUDENT', isBlocked: true })
    prisma.user.update.mockResolvedValue({ id: 's1', isBlocked: false })
    await service.unblock(ADMIN, 's1', { reason: 'compareceu' })
    const data = prisma.user.update.mock.calls[0][0].data
    expect(data.isBlocked).toBe(false)
    expect(data.unblockedById).toBe('admin-1')
    expect(data.unblockedAt).toBeInstanceOf(Date)
  })

  it('bloqueia exclusão de turma com alunos vinculados', async () => {
    prisma.class.findUnique.mockResolvedValue({ id: 'c1', _count: { users: 3 } })
    await expect(service.deleteClass(ADMIN, 'c1')).rejects.toThrow(ConflictException)
  })

  it('impede criação de evento duplicado na mesma data/turma', async () => {
    prisma.class.findUnique.mockResolvedValue({ id: 'c1' })
    prisma.event.create.mockRejectedValue({ code: 'P2002' })
    await expect(
      service.createEvent(ADMIN, { classId: 'c1', name: 'Culto', eventDate: '2026-09-10' }),
    ).rejects.toThrow(ConflictException)
  })

  it('lança Forbidden para não-admin', async () => {
    const studentUser = { id: 's1', email: 's@x.com', role: 'student' }
    await expect(service.listStudents(studentUser, {})).rejects.toThrow(ForbiddenException)
  })

  it('gera status summary do dashboard', async () => {
    prisma.user.count.mockResolvedValueOnce(10).mockResolvedValueOnce(2)
    prisma.attendance.count.mockResolvedValue(5)
    const summary = await service.summary(ADMIN)
    expect(summary).toEqual({ totalStudents: 10, blockedStudents: 2, todayAttendances: 5 })
  })
})