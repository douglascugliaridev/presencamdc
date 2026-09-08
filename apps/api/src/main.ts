import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(helmet())
  app.useGlobalFilters(new AllExceptionsFilter())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}))
        return new BadRequestException(messages[0] ?? 'Dados inválidos')
      },
    }),
  )

  const origin = process.env.WEB_ORIGIN?.split(',').map((o) => o.trim()) ?? true
  app.enableCors({ origin, credentials: true })

  const port = Number(process.env.PORT ?? 3333)
  await app.listen(port, '0.0.0.0')
  console.log(`API rodando em http://localhost:${port}`)
}

void bootstrap()