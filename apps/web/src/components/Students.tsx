'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '@/lib/api'
import type { AdminClass, AdminStudent } from '@/lib/types'
import { Badge, Button, Card, EmptyState, Field, Modal, inputClass } from './ui'

interface Filters {
  search: string
  blocked?: boolean
}

export default function Students() {
  const [students, setStudents] = useState<AdminStudent[]>([])
  const [classes, setClasses] = useState<AdminClass[]>([])
  const [filters, setFilters] = useState<Filters>({ search: '' })
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminStudent | null>(null)
  const [unblocking, setUnblocking] = useState<AdminStudent | null>(null)

  async function loadStudents() {
    try {
      const qs = new URLSearchParams()
      if (filters.search) qs.set('search', filters.search)
      if (filters.blocked) qs.set('blocked', 'true')
      const list = await api.get<AdminStudent[]>(`/admin/students${qs.size ? `?${qs}` : ''}`)
      setStudents(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar alunos')
    }
  }

  useEffect(() => {
    loadStudents().catch(() => undefined)
    api
      .get<AdminClass[]>('/admin/classes')
      .then(setClasses)
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  async function handleUnblock(student: AdminStudent, reason: string) {
    await api.patch(`/admin/students/${student.id}/unblock`, { reason })
    setUnblocking(null)
    await loadStudents()
  }

  return (
    <Card title="Alunos" actions={<Button onClick={() => setCreating(true)}>Novo aluno</Button>}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Buscar por nome ou e-mail"
          className={`${inputClass} max-w-xs`}
        />
        <label className="flex items-center gap-2 text-sm text-text-gray">
          <input
            type="checkbox"
            checked={!!filters.blocked}
            onChange={(e) => setFilters((f) => ({ ...f, blocked: e.target.checked || undefined }))}
          />
          Somente bloqueados
        </label>
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {students.length === 0 ? (
        <EmptyState>Nenhum aluno encontrado.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-text-gray">
                <th className="pb-2 font-medium">Nome</th>
                <th className="pb-2 font-medium">E-mail</th>
                <th className="pb-2 font-medium">Turma</th>
                <th className="pb-2 font-medium">Faltas</th>
                <th className="pb-2 font-medium">Situação</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 font-medium text-text-dark">{s.name}</td>
                  <td className="py-2.5 text-text-gray">{s.email}</td>
                  <td className="py-2.5">{s.class?.name ?? '—'}</td>
                  <td className="py-2.5">{s._count.absences}</td>
                  <td className="py-2.5">
                    {s.isBlocked ? (
                      <Badge tone="red">Bloqueado</Badge>
                    ) : (
                      <Badge tone="green">Ativo</Badge>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setEditing(s)}>
                        Editar
                      </Button>
                      {s.isBlocked && (
                        <Button variant="success" onClick={() => setUnblocking(s)}>
                          Desbloquear
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <StudentModal
          title="Novo aluno"
          classes={classes}
          onClose={() => setCreating(false)}
          onSubmit={async (body) => {
            await api.post('/admin/students', body)
            setCreating(false)
            await loadStudents()
          }}
        />
      )}
      {editing && (
        <StudentModal
          title={`Editar ${editing.name}`}
          classes={classes}
          student={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (body) => {
            await api.patch(`/admin/students/${editing.id}`, body)
            setEditing(null)
            await loadStudents()
          }}
        />
      )}
      {unblocking && (
        <UnblockModal student={unblocking} onClose={() => setUnblocking(null)} onConfirm={handleUnblock} />
      )}
    </Card>
  )
}

function StudentModal({
  title,
  classes,
  student,
  onClose,
  onSubmit,
}: {
  title: string
  classes: AdminClass[]
  student?: AdminStudent
  onClose: () => void
  onSubmit: (body: {
    name: string
    email?: string
    password?: string
    classId?: string | null
  }) => Promise<void>
}) {
  const [name, setName] = useState(student?.name ?? '')
  const [email, setEmail] = useState(student?.email ?? '')
  const [password, setPassword] = useState('')
  const [classId, setClassId] = useState<string | undefined>(student?.class?.id)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        name,
        ...(student ? {} : { email, password }),
        classId: classId || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome">
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </Field>
        {!student && (
          <>
            <Field label="E-mail">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Senha inicial">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
              />
            </Field>
          </>
        )}
        <Field label="Turma">
          <select value={classId ?? ''} onChange={(e) => setClassId(e.target.value)} className={inputClass}>
            <option value="">Sem turma</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function UnblockModal({
  student,
  onClose,
  onConfirm,
}: {
  student: AdminStudent
  onClose: () => void
  onConfirm: (s: AdminStudent, reason: string) => Promise<void>
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