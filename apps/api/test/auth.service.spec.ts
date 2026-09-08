import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import * as bcrypt from 'bcryptjs'
import { AuthService } from '../src/auth/auth.service'
import { PrismaService } from '../src/prisma/prisma.service'

describe('AuthService', () => {
  let service: AuthService
  let prisma: { user: { findUnique: jest.Mock } }

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } }

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('token'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('secret'),
            get: jest.fn().mockReturnValue('15m'),
          },
        },
      ],
    }).compile()

    service = moduleRef.get(AuthService)
  })

  it('lança UnauthorizedException quando a senha é inválida', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'a@b.com',
      passwordHash: await bcrypt.hash('senha-certa', 10),
      role: 'ADMIN',
    })

    await expect(
      service.login({ email: 'a@b.com', password: 'senha-errada' }),
    ).rejects.toThrow(UnauthorizedException)
  })

  it('retorna access e refresh tokens em login válido', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'a@b.com',
      passwordHash: await bcrypt.hash('senha-certa', 10),
      role: 'ADMIN',
    })

    const tokens = await service.login({ email: 'a@b.com', password: 'senha-certa' })

    expect(tokens.accessToken).toBe('token')
    expect(tokens.refreshToken).toBe('token')
  })

  it('rejeita refresh token que não seja do tipo refresh', async () => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ type: 'access' }) }
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('secret') },
        },
      ],
    }).compile()

    service = moduleRef.get(AuthService)

    await expect(service.refresh('qualquer-token')).rejects.toThrow(UnauthorizedException)
  })
})