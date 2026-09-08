'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { APP_COLORS } from '@presencamdc/shared'
import { api, saveTokens } from '@/lib/api'
import type { Me } from '@/lib/types'

export default function AdminLogin({ onSuccess }: { onSuccess: (user: Me) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const tokens = await api.post<{ accessToken: string; refreshToken: string }>('/auth/login', {
        email,
        password,
      })
      saveTokens(tokens.accessToken, tokens.refreshToken)
      const me = await api.get<Me>('/me')
      if (me.role !== 'admin') {
        throw new Error('Acesso negado: apenas administradores podem usar o painel')
      }
      onSuccess(me)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={{ background: APP_COLORS.backgroundDark }}
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <div className="mx-auto mb-6 flex h-28 w-52 items-center justify-center rounded-xl border border-gray-800 bg-[#0D0D0D] p-3">
          <img src="/images.png" alt="Mais de Cristo" className="h-20 w-auto object-contain" />
        </div>
        <p className="mb-6 text-center text-sm text-text-gray">Painel administrativo</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-text-gray">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-text-gray">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md py-2 font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: APP_COLORS.primary }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}