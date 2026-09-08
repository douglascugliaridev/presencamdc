import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from '@presencamdc/shared'
import { API_URL } from '../config'
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './storage'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = await getAccessToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new Error(CONNECTION_ERROR_MESSAGE)
  }

  if (res.status === 401 && token) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return request<T>(path, options)
    }
    await clearTokens()
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  const data: unknown = res.status === 204 ? null : await res.json().catch(() => null)

  if (!res.ok) {
    const bodyMessage = (data as { message?: unknown } | null)?.message
    throw new Error(apiErrorMessage(res.status, bodyMessage))
  }

  return data as T
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) {
    return false
  }

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) {
      return false
    }

    const data = (await res.json()) as { accessToken: string; refreshToken: string }
    await saveTokens(data.accessToken, data.refreshToken)
    return true
  } catch {
    return false
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
}

export interface ChurchInfo {
  id: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
}

export interface MeResponse {
  id: string
  name: string
  email: string
  role: string
  isBlocked: boolean
  class: {
    id: string
    name: string
    church: ChurchInfo | null
  } | null
}

export interface StatusResponse {
  absencesCount: number
  maxAbsences: number
  isBlocked: boolean
}

export interface CheckInResponse {
  id: string
  checkedInAt: string
  event: {
    id: string
    name: string
    eventDate: string
  }
}