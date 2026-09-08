export * from './error-messages'

export type Role = 'student' | 'admin'

export interface UserTokens {
  accessToken: string
  refreshToken: string
}

export interface UserStatus {
  absencesCount: number
  maxAbsences: number
  isBlocked: boolean
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return 6_371_000 * c
}

export const APP_COLORS = {
  primary: '#A61C1C',
  secondary: '#E8873A',
  backgroundDark: '#0D0D0D',
  backgroundLight: '#F5F5F5',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#DC2626',
} as const