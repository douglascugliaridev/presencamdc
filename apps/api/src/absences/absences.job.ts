import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { AbsencesService } from './absences.service'

@Injectable()
export class AbsencesJob implements OnModuleInit {
  private readonly logger = new Logger(AbsencesJob.name)

  constructor(private readonly absencesService: AbsencesService) {}

  async onModuleInit() {
    await this.run()
  }

  @Cron(CronExpression.EVERY_HOUR)
  async run() {
    try {
      await this.absencesService.processPastEvents()
    } catch (error) {
      this.logger.error(`Falha ao processar faltas: ${(error as Error).message}`)
    }
  }
}