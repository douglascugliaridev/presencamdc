'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '@/lib/api'
import type { AdminClass, Church } from '@/lib/types'
import { Button, Card, EmptyState, Field, Modal, inputClass } from './ui'

export default function Classes() {
  const [classes, setClasses] = useState<AdminClass[]>([])
  const [churches, setChurches] = useState<Church[]>([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminClass | null>(null)

  async function load() {
    try {
      setClasses(await api.get<AdminClass[]>('/admin/classes'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar turmas')
    }
  }

  useEffect(() => {
    load().catch(() => undefined)
    api
      .get<Church[]>('/admin/churches')
      .then(setChurches)
      .catch(() => undefined)
  }, [])

  async function handleDelete(c: AdminClass) {
    if (!window.confirm(`Excluir a turma "${c.name}"? Essa ação não pode ser desfeita.`)) return
    try {
      await api.del(`/admin/classes/${c.id}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  return (
    <Card title="Turmas" actions={<Button onClick={() => setCreating(true)}>Nova turma</Button>}>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      {classes.length === 0 ? (
        <EmptyState>Nenhuma turma cadastrada.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-text-gray">
                <th className="pb-2 font-medium">Nome</th>
                <th className="pb-2 font-medium">Igreja</th>
                <th className="pb-2 font-medium">Alunos</th>
                <th className="pb-2 font-medium">Eventos</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 font-medium text-text-dark">{c.name}</td>
                  <td className="py-2.5 text-text-gray">{c.church?.name ?? '—'}</td>
                  <td className="py-2.5">{c._count.users}</td>
                  <td className="py-2.5">{c._count.events}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setEditing(c)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => handleDelete(c)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <ClassModal
          title={creating ? 'Nova turma' : `Editar ${editing?.name}`}
          churches={churches}
          initial={{
            name: editing?.name ?? '',
            churchId: editing?.church?.id,
          }}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSubmit={async (body) => {
            if (editing) {
              await api.patch(`/admin/classes/${editing.id}`, body)
            } else {
              await api.post('/admin/classes', body)
            }
            setCreating(false)
            setEditing(null)
            await load()
          }}
        />
      )}
    </Card>
  )
}

function ClassModal({
  title,
  churches,
  initial,
  onClose,
  onSubmit,
}: {
  title: string
  churches: Church[]
  initial: { name: string; churchId?: string }
  onClose: () => void
  onSubmit: (body: { name: string; churchId: string | null }) => Promise<void>
}) {
  const [name, setName] = useState(initial.name)
  const [churchId, setChurchId] = useState<string | undefined>(initial.churchId)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit({ name, churchId: churchId || null })
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
        <Field label="Igreja">
          <select value={churchId ?? ''} onChange={(e) => setChurchId(e.target.value)} className={inputClass}>
            <option value="">Selecione</option>
            {churches.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
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