'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '@/lib/api'
import type { BlockedStudent } from '@/lib/types'
import { Badge, Button, Card, EmptyState, Field, Modal, inputClass } from './ui'

export default function BlockedStudents() {
  const [students, setStudents] = useState<BlockedStudent[]>([])
  const [error, setError] = useState('')
  const [unblocking, setUnblocking] = useState<BlockedStudent | null>(null)

  async function load() {
    try {
      setStudents(await api.get<BlockedStudent[]>('/admin/reports/blocked-students'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar bloqueados')
    }
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  async function handleUnblock(student: BlockedStudent, reason: string) {
    await api.patch(`/admin/students/${student.id}/unblock`, { reason })
    setUnblocking(null)
    await load()
  }

  return (
    <Card title="Alunos bloqueados por faltas">
      <p className="mb-4 text-sm text-text-gray">
        Alunos que atingiram o limite de faltas. O bloqueio impede o check-in pelo aplicativo.
      </p>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      {students.length === 0 ? (
        <EmptyState>Nenhum aluno bloqueado no momento.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-text-gray">
                <th className="pb-2 font-medium">Nome</th>
                <th className="pb-2 font-medium">E-mail</th>
                <th className="pb-2 font-medium">Turma</th>
                <th className="pb-2 font-medium">Faltas</th>
                <th className="pb-2 font-medium">Bloqueado em</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 font-medium text-text-dark">
                    {s.name} <Badge tone="red">Bloqueado</Badge>
                  </td>
                  <td className="py-2.5 text-text-gray">{s.email}</td>
                  <td className="py-2.5">{s.class?.name ?? '—'}</td>
                  <td className="py-2.5 text-danger">{s._count.absences}</td>
                  <td className="py-2.5 text-text-gray">
                    {s.blockedAt ? new Date(s.blockedAt).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="py-2.5 text-right">
                    <Button variant="success" onClick={() => setUnblocking(s)}>
                      Desbloquear
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {unblocking && (
        <UnblockModal student={unblocking} onClose={() => setUnblocking(null)} onConfirm={handleUnblock} />
      )}
    </Card>
  )
}

function UnblockModal({
  student,
  onClose,
  onConfirm,
}: {
  student: BlockedStudent
  onClose: () => void
  onConfirm: (s: BlockedStudent, reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onConfirm(student, reason)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desbloquear')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Desbloquear ${student.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-gray">Registre o motivo do desbloqueio para a auditoria.</p>
        <Field label="Motivo">
          <input value={reason} onChange={(e) => setReason(e.target.value)} required className={inputClass} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="success" disabled={saving}>
            {saving ? 'Desbloqueando...' : 'Desbloquear'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}