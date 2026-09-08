'use client'

import { useEffect, useState } from 'react'
import { APP_COLORS } from '@presencamdc/shared'
import { api } from '@/lib/api'
import type { ByClassReport, Summary } from '@/lib/types'
import { Card } from './ui'

export default function Dashboard({ onNavigate }: { onNavigate: (s: 'students' | 'reports' | 'blocked') => void }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [today, setToday] = useState<ByClassReport | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [sum, report] = await Promise.all([
          api.get<Summary>('/admin/summary'),
          api.get<ByClassReport>('/admin/reports/attendance/by-class'),
        ])
        setSummary(sum)
        setToday(report)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard')
      }
    }
    load().catch(() => undefined)
  }, [])

  if (error) return <p className="text-sm text-danger">{error}</p>
  if (!summary || !today) return <p className="text-sm text-text-gray">Carregando...</p>

  const todayClasses = today.classes
    .filter((c) => c.totalExpected > 0)
    .sort((a, b) => (b.totalAbsences ?? 0) - (a.totalAbsences ?? 0))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-dark">Dashboard</h2>
        <p className="text-sm text-text-gray">{new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Alunos" value={summary.totalStudents} onClick={() => onNavigate('students')} />
        <StatCard
          label="Bloqueados por falta"
          value={summary.blockedStudents}
          tone="red"
          onClick={() => onNavigate('blocked')}
        />
        <StatCard label="Presenças hoje" value={summary.todayAttendances} onClick={() => onNavigate('reports')} />
      </div>

      <Card title="Presença hoje por turma">
        {todayClasses.length === 0 ? (
          <p className="text-sm text-text-gray">Nenhum evento hoje.</p>
        ) : (
          <div className="space-y-4">
            {todayClasses.map((c) => {
              const rate = c.attendanceRate ?? 0
              return (
                <div key={c.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-text-dark">{c.name}</span>
                    <span className="text-text-gray">
                      {c.totalPresent}/{c.totalExpected} · {rate}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-gray-200">
                    <div
                      className="h-full rounded"
                      style={{ width: `${rate}%`, background: APP_COLORS.primary }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
  onClick,
}: {
  label: string
  value: number
  tone?: 'red'
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition-transform hover:-translate-y-0.5"
    >
      <p className={`text-3xl font-bold ${tone ? 'text-danger' : 'text-primary'}`}>{value}</p>
      <p className="mt-1 text-sm text-text-gray">{label}</p>
    </button>
  )
}