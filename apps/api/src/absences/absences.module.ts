import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { AbsencesJob } from './absences.job'
import { AbsencesService } from './absences.service'

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [AbsencesService, AbsencesJob],
})
export class AbsencesModule {}