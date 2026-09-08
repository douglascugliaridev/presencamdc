import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const PASSWORD = 'admin123'

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(12, 0, 0, 0)
  return d
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10)

  const church = await prisma.church.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { latitude: -23.5505, longitude: -46.6333, radiusMeters: 100 },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Igreja Mais de Cristo',
      latitude: -23.5505,
      longitude: -46.6333,
      radiusMeters: 100,
    },
  })

  const classe = await prisma.class.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: { churchId: church.id },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Discipulado Nova Geração',
      churchId: church.id,
    },
  })

  await prisma.user.upsert({
    where: { email: 'admin@maisdecristo.com.br' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@maisdecristo.com.br',
      passwordHash,
      role: Role.ADMIN,
    },
  })

  const student1 = await prisma.user.upsert({
    where: { email: 'aluno@maisdecristo.com.br' },
    update: { classId: classe.id },
    create: {
      name: 'Aluno de Teste',
      email: 'aluno@maisdecristo.com.br',
      passwordHash,
      role: Role.STUDENT,
      classId: classe.id,
    },
  })

  const student2 = await prisma.user.upsert({
    where: { email: 'aluno2@maisdecristo.com.br' },
    update: { classId: classe.id },
    create: {
      name: 'Aluno Com Faltas',
      email: 'aluno2@maisdecristo.com.br',
      passwordHash,
      role: Role.STUDENT,
      classId: classe.id,
    },
  })

  await prisma.setting.upsert({
    where: { key: 'max_faltas' },
    update: {},
    create: { key: 'max_faltas', value: '3' },
  })

  // Eventos dos últimos 3 dias + o de hoje (4 cultos)
  const events: { id: string; date: Date }[] = []
  for (let i = 3; i >= 0; i--) {
    const date = daysAgo(i)
    const event = await prisma.event.upsert({
      where: { classId_eventDate: { classId: classe.id, eventDate: date } },
      update: {},
      create: { classId: classe.id, name: 'Culto', eventDate: date },
    })
    events.push({ id: event.id, date })
  }

  // Aluno de Teste: presença nos 3 eventos passados (hoje ainda livre p/ testar check-in)
  for (const event of events.slice(0, -1)) {
    await prisma.attendance.upsert({
      where: {
        userId_eventId: { userId: student1.id, eventId: event.id },
      },
      update: {},
      create: {
        userId: student1.id,
        eventId: event.id,
        latitude: church.latitude,
        longitude: church.longitude,
        checkedInAt: event.date,
      },
    })
  }

  // Aluno Com Faltas: nenhuma presença — o job de faltas vai bloquear ao iniciar a API
  await prisma.absence.deleteMany({ where: { userId: student2.id } })
  await prisma.user.update({
    where: { id: student2.id },
    data: { isBlocked: false, blockedAt: null, unblockedAt: null, unblockedById: null },
  })

  console.log('Seed concluído:')
  console.log('  admin@maisdecristo.com.br / admin123')
  console.log('  aluno@maisdecristo.com.br / admin123 (1 presença de teste hoje livre)')
  console.log('  aluno2@maisdecristo.com.br / admin123 (sem presenças -> será bloqueado pelo job)')
  console.log('4 eventos criados (últimos 3 dias + hoje).')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })