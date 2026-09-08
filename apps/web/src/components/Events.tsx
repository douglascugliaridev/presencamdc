'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '@/lib/api'
import type { AdminClass, AdminEvent } from '@/lib/types'
import { Badge, Button, Card, EmptyState, Field, Modal, inputClass } from './ui'

export default function Events() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [classes, setClasses] = useState<AdminClass[]>([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [classFilter, setClassFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const filtered = useMemo(
    () =>
      events.filter((ev) => {
        if (classFilter && ev.classId !== classFilter) return false
        const day = ev.eventDate.slice(0, 10)
        if (from && day < from) return false
        if (to && day > to) return false
        return true
      }),
    [events, classFilter, from, to],
  )

  async function load() {
    try {
      setEvents(await api.get<AdminEvent[]>('/admin/events'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos')
    }
  }

  useEffect(() => {
    load().catch(() => undefined)
    api
      .get<AdminClass[]>('/admin/classes')
      .then(setClasses)
      .catch(() => undefined)
  }, [])

  async function handleDelete(ev: AdminEvent) {
    if (!window.confirm(`Excluir o evento "${ev.name}" de ${new Date(ev.eventDate).toLocaleDateString('pt-BR')}?`)) {
      return
    }
    try {
      await api.del(`/admin/events/${ev.id}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  return (
    <Card title="Eventos" actions={<Button onClick={() => setCreating(true)}>Novo evento</Button>}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={`${inputClass} max-w-xs`}>
          <option value="">Todas as turmas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        <span className="text-text-gray">até</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState>Nenhum evento encontrado.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-text-gray">
              <th className="pb-2 font-medium">Nome</th>
              <th className="pb-2 font-medium">Data</th>
              <th className="pb-2 font-medium">Turma</th>
              <th className="pb-2 font-medium">Presenças</th>
              <th className="pb-2 font-medium">Faltas</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev) => {
              const date = new Date(ev.eventDate + 'T12:00:00')
              const today = new Date().toDateString() === date.toDateString()
              return (
                <tr key={ev.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 font-medium text-text-dark">{ev.name}</td>
                  <td className="py-2.5">
                    {date.toLocaleDateString('pt-BR')}
                    {today && <span className="ml-2"><Badge tone="yellow">Hoje</Badge></span>}
                  </td>
                  <td className="py-2.5 text-text-gray">{ev.class.name}</td>
                  <td className="py-2.5">{ev._count.attendances}</td>
                  <td className="py-2.5 text-text-gray">{ev._count.absences}</td>
                  <td className="py-2.5 text-right">
                    <Button variant="danger" onClick={() => handleDelete(ev)}>
                      Excluir
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {creating && (
        <EventModal
          classes={classes}
          onClose={() => setCreating(false)}
          onSubmit={async (body) => {
            await api.post('/admin/events', body)
            setCreating(false)
            await load()
          }}
        />
      )}
    </Card>
  )
}

function EventModal({
  classes,
  onClose,
  onSubmit,
}: {
  classes: AdminClass[]
  onClose: () => void
  onSubmit: (body: { name: string; classId: string; eventDate: string }) => Promise<void>
}) {
  const [name, setName] = useState('Culto')
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit({ name, classId, eventDate })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Novo evento" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome">
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </Field>
        <Field label="Turma">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} required className={inputClass}>
            <option value="" disabled>
              Selecione
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data">
          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className={inputClass} />
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