import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { User } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import type { JwtPayload } from './auth.types'
import { ConfigService } from '@nestjs/config'

export interface UserTokens {
  accessToken: string
  refreshToken: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<UserTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Usuário ou senha incorretos')
    }
    return this.signTokens(user)
  }

  async refresh(refreshToken: string): Promise<UserTokens> {
    let payload: JwtPayload
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      })
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado')
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token inválido')
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado')
    }

    return this.signTokens(user)
  }

  private async signTokens(user: User): Promise<UserTokens> {
    const base: Omit<JwtPayload, 'type'> = {
      sub: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...base, type: 'access' satisfies JwtPayload['type'] },
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
        },
      ),
      this.jwt.signAsync(
        { ...base, type: 'refresh' satisfies JwtPayload['type'] },
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d',
        },
      ),
    ])

    return { accessToken, refreshToken }
  }
}