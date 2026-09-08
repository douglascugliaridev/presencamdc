'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '@/lib/api'
import type { Church } from '@/lib/types'
import { Button, Card, Field, inputClass } from './ui'

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [church, setChurch] = useState<Church | null>(null)
  const [maxAbsences, setMaxAbsences] = useState('')
  const [churchName, setChurchName] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [radius, setRadius] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.get<Record<string, string>>('/admin/settings'), api.get<Church>('/admin/church')])
      .then(([settingsData, churchData]) => {
        setSettings(settingsData)
        setMaxAbsences(settingsData['max_faltas'] ?? '')
        setChurch(churchData)
        setChurchName(churchData.name)
        setLatitude(String(churchData.latitude))
        setLongitude(String(churchData.longitude))
        setRadius(String(churchData.radiusMeters))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar configurações'))
  }, [])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await api.patch('/admin/settings', {
        ...settings,
        max_faltas: maxAbsences.trim(),
      })
      await api.patch('/admin/church', {
        name: churchName,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radiusMeters: Number(radius),
      })
      const churchData = await api.get<Church>('/admin/church')
      setChurch(churchData)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card title="Configurações">
        {!church ? (
          <p className="text-sm text-text-gray">Carregando...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-text-dark">
                Regras de presença
              </h3>
              <Field label="Limite de faltas antes do bloqueio">
                <input
                  type="number"
                  min={1}
                  value={maxAbsences}
                  onChange={(e) => setMaxAbsences(e.target.value)}
                  required
                  className={`${inputClass} max-w-[160px]`}
                />
              </Field>
              <p className="mt-1 text-xs text-text-gray">
                Ao atingir esse número de faltas, o aluno é bloqueado automaticamente.
              </p>
            </div>

            <div>
              <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-text-dark">
                Igreja
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nome da igreja">
                  <input value={churchName} onChange={(e) => setChurchName(e.target.value)} required className={inputClass} />
                </Field>
                <Field label="Raio de tolerância (metros)">
                  <input
                    type="number"
                    min={1}
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label="Latitude">
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                    className={inputClass}
                  />
                </Field>
                <Field label="Longitude">
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                    className={inputClass}
                  />
                </Field>
              </div>
              <p className="mt-1 text-xs text-text-gray">
                Alunos devem marcar presença dentro desse raio da igreja.
              </p>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            {saved && <p className="text-sm text-success">Configurações salvas com sucesso.</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}