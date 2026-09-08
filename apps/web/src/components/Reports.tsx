'use client'

import { useCallback, useEffect, useState } from 'react'
import { APP_COLORS } from '@presencamdc/shared'
import { api, downloadCsv } from '@/lib/api'
import type { AdminClass, ByClassReport, ByStudentReport } from '@/lib/types'
import { Badge, Button, Card, EmptyState, inputClass } from './ui'

type Mode = 'student' | 'class'

export default function Reports() {
  const [classes, setClasses] = useState<AdminClass[]>([])
  const [mode, setMode] = useState<Mode>('student')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [classId, setClassId] = useState('')
  const [byStudent, setByStudent] = useState<ByStudentReport | null>(null)
  const [byClass, setByClass] = useState<ByClassReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      if (start) qs.set('start', new Date(start + 'T00:00:00').toISOString())
      if (end) qs.set('end', new Date(end + 'T23:59:59').toISOString())
      if (classId) qs.set('classId', classId)
      const query = qs.size ? `?${qs.toString()}` : ''
      if (mode === 'student') {
        setByStudent(await api.get<ByStudentReport>(`/admin/reports/attendance/by-student${query}`))
      } else {
        setByClass(await api.get<ByClassReport>(`/admin/reports/attendance/by-class${query}`))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }, [mode, start, end, classId])

  useEffect(() => {
    load().catch(() => undefined)
    api
      .get<AdminClass[]>('/admin/classes')
      .then(setClasses)
      .catch(() => undefined)
  }, [load])

  function exportCsv() {
    if (mode === 'student' && byStudent) {
      downloadCsv(
        'relatorio-por-aluno.csv',
        [
          ['Aluno', 'Email', 'Turma', 'Presencas', 'Faltas'],
          ...byStudent.students.map((s) => [s.name, s.email, s.className ?? '', s.present, s.absences]),
        ],
      )
    } else if (mode === 'class' && byClass) {
      downloadCsv(
        'relatorio-por-turma.csv',
        [
          ['Turma', 'Matriculados', 'Esperado', 'Presentes', 'Faltas', 'Taxa de Presenca'],
          ...byClass.classes.map((c) => [
            c.name,
            c.enrolled,
            c.totalExpected,
            c.totalPresent,
            c.totalAbsences,
            c.attendanceRate !== null ? `${c.attendanceRate}%` : '-',
          ]),
        ],
      )
    }
  }

  return (
    <Card
      title="Relatórios de presença"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={exportCsv} disabled={!byStudent && !byClass}>
            Exportar CSV
          </Button>
          <Button onClick={() => load()} disabled={loading}>
            {loading ? 'Gerando...' : 'Gerar'}
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border border-gray-300 p-0.5">
          {(['student', 'class'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1 text-sm font-medium ${
                mode === m ? 'text-white' : 'text-text-gray hover:text-text-dark'
              }`}
              style={mode === m ? { background: APP_COLORS.primary } : undefined}
            >
              {m === 'student' ? 'Por aluno' : 'Por turma'}
            </button>
          ))}
        </div>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
        <span className="text-text-gray">até</span>
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${inputClass} max-w-xs`}>
          <option value="">Todas as turmas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {mode === 'student' ? (
        byStudent && <StudentReport data={byStudent} onReset={() => { setStart(''); setEnd(''); setClassId('') }} />
      ) : (
        byClass && <ClassReport data={byClass} onReset={() => { setStart(''); setEnd(''); setClassId('') }} />
      )}
    </Card>
  )
}

function StudentReport({ data, onReset }: { data: ByStudentReport; onReset: () => void }) {
  if (data.students.length === 0) {
    return (
      <EmptyState>
        Sem dados no período.{' '}
        <button onClick={onReset} className="text-primary underline">
          Limpar filtros
        </button>
      </EmptyState>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-text-gray">
            <th className="pb-2 font-medium">Aluno</th>
            <th className="pb-2 font-medium">Turma</th>
            <th className="pb-2 font-medium">Eventos no período</th>
            <th className="pb-2 font-medium">Presenças</th>
            <th className="pb-2 font-medium">Faltas</th>
          </tr>
        </thead>
        <tbody>
          {data.students.map((s) => (
            <tr key={s.id} className="border-b border-gray-100 last:border-0">
              <td className="py-2.5">
                <span className="font-medium text-text-dark">{s.name}</span>
                <span className="ml-2 text-xs text-text-gray">{s.email}</span>
              </td>
              <td className="py-2.5">{s.className ?? '—'}</td>
              <td className="py-2.5">{data.events.length}</td>
              <td className="py-2.5 text-success">{s.present}</td>
              <td className="py-2.5">
                {s.absences > 0 ? <Badge tone="red">{s.absences}</Badge> : <span>{s.absences}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClassReport({ data, onReset }: { data: ByClassReport; onReset: () => void }) {
  if (data.classes.length === 0) {
    return (
      <EmptyState>
        Sem dados no período.{' '}
        <button onClick={onReset} className="text-primary underline">
          Limpar filtros
        </button>
      </EmptyState>
    )
  }
  const maxRate = Math.max(...data.classes.map((c) => c.attendanceRate ?? 0), 1)
  return (
    <div className="space-y-4">
      {data.classes.map((c) => {
        const rate = c.attendanceRate ?? 0
        return (
          <div key={c.id} className="rounded-md border border-gray-200 p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-text-dark">{c.name}</span>
              <span className={`text-sm font-semibold ${rate >= 60 ? 'text-success' : 'text-danger'}`}>{rate}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded bg-gray-200">
              <div
                className="h-full rounded"
                style={{ width: `${(rate / maxRate) * 100}%`, background: rate >= 60 ? '#26A641' : APP_COLORS.primary }}
              />
            </div>
            <p className="mt-2 text-xs text-text-gray">
              {c.totalPresent} presenças · {c.totalAbsences} faltas · {c.totalExpected} esperadas · {c.enrolled}{' '}
              matriculados
            </p>
          </div>
        )
      })}
    </div>
  )
}