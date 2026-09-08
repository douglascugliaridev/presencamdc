import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter'

function createHost() {
  const json = jest.fn()
  const response = { status: jest.fn(() => ({ json })), json }
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  }
  return { host, response }
}

describe('AllExceptionsFilter (mensagens de negócio ao usuário)', () => {
  const filter = new AllExceptionsFilter()

  it('mantém mensagem de negócio do check-in (403 bloqueado)', () => {
    const { host, response } = createHost()
    filter.catch(new ForbiddenException('Você está bloqueado por faltas e não pode marcar presença'), host as any)
    expect(response.status).toHaveBeenCalledWith(403)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Você está bloqueado por faltas e não pode marcar presença' }),
    )
  })

  it('mantém mensagem de conflito de presença duplicada (409)', () => {
    const { host, response } = createHost()
    filter.catch(new ConflictException('Presença já marcada para este evento'), host as any)
    expect(response.status).toHaveBeenCalledWith(409)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Presença já marcada para este evento' }),
    )
  })

  it('converte throttler para 429 com mensagem PT', () => {
    const { host, response } = createHost()
    filter.catch(new ThrottlerException('Too Many Requests'), host as any)
    expect(response.status).toHaveBeenCalledWith(429)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Muitas tentativas') }),
    )
  })

  it('converte erro Prisma P2002 em 409 com mensagem PT', () => {
    const { host, response } = createHost()
    const prismaError = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    })
    filter.catch(prismaError, host as any)
    expect(response.status).toHaveBeenCalledWith(409)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Já existe um registro com os mesmos dados' }),
    )
  })

  it('converte erro Prisma P2025 em 404 com mensagem PT', () => {
    const { host, response } = createHost()
    const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' })
    filter.catch(prismaError, host as any)
    expect(response.status).toHaveBeenCalledWith(404)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Registro não encontrado' }),
    )
  })

  it('não vaza erro interno cru para o usuário — usa mensagem PT genérica', () => {
    const { host, response } = createHost()
    const unexpected = new Error('Cannot read properties of undefined (reading x)')
    filter.catch(unexpected, host as any)
    expect(response.status).toHaveBeenCalledWith(500)
    const body = response.json.mock.calls[0][0] as { message: string }
    expect(body.message).toContain('Erro interno do servidor')
    expect(body.message).not.toContain('Cannot read properties')
  })

  it('mantém mensagens de validação PT (array) do class-validator', () => {
    const { host, response } = createHost()
    const error = new BadRequestException([
      'Latitude inválida',
      'Longitude inválida',
    ])
    filter.catch(error, host as any)
    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['Latitude inválida', 'Longitude inválida'],
      }),
    )
  })

  it('não transforma 401 genérico em outro status (mantém contrato REST)', () => {
    const { host, response } = createHost()
    filter.catch(new UnauthorizedException('Usuário ou senha incorretos'), host as any)
    expect(response.status).toHaveBeenCalledWith(401)
  })

  it('mantém 404 de negócio (não encontrado)', () => {
    const { host, response } = createHost()
    filter.catch(new NotFoundException('Nenhum culto/evento agendado para hoje'), host as any)
    expect(response.status).toHaveBeenCalledWith(404)
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Nenhum culto/evento agendado para hoje' }),
    )
  })
})