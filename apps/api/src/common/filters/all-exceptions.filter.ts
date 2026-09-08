import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import { Prisma } from '@prisma/client'
import type { Response } from 'express'

interface ErrorBody {
  message?: string | string[]
  error?: string
}

function isPrismaKnownError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    (typeof error === 'object' && error !== null && 'code' in error && typeof (error as { code?: unknown }).code === 'string')
  )
}

function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): {
  status: number
  message: string
} {
  switch (error.code) {
    case 'P2002':
      return { status: HttpStatus.CONFLICT, message: 'Já existe um registro com os mesmos dados' }
    case 'P2025':
      return { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado' }
    case 'P2003':
      return { status: HttpStatus.BAD_REQUEST, message: 'Solicitação inválida' }
    default:
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Erro interno do servidor. Tente novamente.' }
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter')

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message: string | string[] = 'Erro interno do servidor. Tente novamente.'

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS
      message = 'Muitas tentativas. Aguarde um momento e tente novamente.'
    } else if (exception instanceof HttpException) {
      status = exception.getStatus()
      const body = exception.getResponse() as ErrorBody | string
      message = typeof body === 'string' ? body : body.message ?? exception.message
    } else if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS
      message = 'Muitas tentativas. Aguarde um momento e tente novamente.'
    } else if (isPrismaKnownError(exception)) {
      const mapped = mapPrismaError(exception)
      status = mapped.status
      message = mapped.message
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      )
    }

    response.status(status).json({ statusCode: status, message })
  }
}