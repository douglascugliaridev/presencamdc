import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        class: {
          select: {
            id: true,
            name: true,
            church: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
                radiusMeters: true,
              },
            },
          },
        },
        createdAt: true,
      },
    })

    if (!user) {
      throw new NotFoundException('Usuário não encontrado')
    }

    return { ...user, role: user.role.toLowerCase() }
  }
}