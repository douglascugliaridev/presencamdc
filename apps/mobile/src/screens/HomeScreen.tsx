import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { APP_COLORS, haversineMeters } from '@presencamdc/shared'
import { MIN_ACCURACY_METERS } from '../config'
import { api, type CheckInResponse, type MeResponse, type StatusResponse } from '../services/api'
import { clearTokens } from '../services/storage'

interface HomeScreenProps {
  user: MeResponse
  onLogout: () => void
}

interface MyLocation {
  latitude: number
  longitude: number
  accuracy: number | null
}

export default function HomeScreen({ user, onLogout }: HomeScreenProps) {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [location, setLocation] = useState<MyLocation | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [locating, setLocating] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    try {
      const [statusData] = await Promise.all([api.get<StatusResponse>('/me/status')])
      setStatus(statusData)
      await acquireLocation()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao carregar dados' })
    } finally {
      setLocating(false)
    }
  }

  async function acquireLocation() {
    const permission = await Location.requestForegroundPermissionsAsync()
    if (permission.status !== 'granted') {
      setPermissionDenied(true)
      return
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })

    const accuracy = pos.coords.accuracy == null ? null : pos.coords.accuracy
    setLocation({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy,
    })
  }

  const church = user.class?.church ?? null
  const distanceMeters =
    church && location
      ? haversineMeters(
          location.latitude,
          location.longitude,
          church.latitude,
          church.longitude,
        )
      : null
  const insideRadius = church != null && distanceMeters != null && distanceMeters <= church.radiusMeters
  const accurate = location?.accuracy == null || location.accuracy <= MIN_ACCURACY_METERS
  const blocked = status?.isBlocked ?? false

  const canCheckIn = !blocked && insideRadius && accurate && location != null

  async function handleCheckIn() {
    if (!location) {
      return
    }
    setCheckingIn(true)
    setMessage(null)
    try {
      const attendance = await api.post<CheckInResponse>('/attendance/check-in', {
        latitude: location.latitude,
        longitude: location.longitude,
      })
      setMessage({
        type: 'success',
        text: `Presença marcada no evento "${attendance.event.name}"!`,
      })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao marcar presença' })
    } finally {
      setCheckingIn(false)
    }
  }

  function handleLogout() {
    Alert.alert('Sair', 'Deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          void clearTokens()
          onLogout()
        },
      },
    ])
  }

  function statusText(): string {
    if (blocked) return 'Presença disponível apenas para desbloqueados'
    if (permissionDenied) return 'Permita o acesso à localização para marcar presença'
    if (locating && !location) return 'Buscando localização...'
    if (!church) return 'Sua turma não possui igreja vinculada'
    if (!location) return 'Não foi possível obter sua localização'
    if (!accurate)
      return `Precisão do GPS insuficiente (${Math.round(location.accuracy ?? 0)}m). Aproxime-se ou tente novamente.`
    if (!insideRadius)
      return `Você está fora da igreja (${Math.round(distanceMeters ?? 0)}m de distância)`
    return `Você está dentro da área da igreja (${Math.round(distanceMeters ?? 0)}m)`
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerLogoBox}>
              <Image source={require('../../assets/images.png')} style={styles.headerLogoImg} resizeMode="contain" />
            </View>
            <Text style={styles.headerName} maxFontSizeMultiplier={1.4}>{user.name}</Text>
          </View>
          <Pressable onPress={handleLogout} hitSlop={12}>
            <Text style={styles.logout} maxFontSizeMultiplier={1.4}>Sair</Text>
          </Pressable>
        </View>

        {blocked && (
          <View style={[styles.banner, styles.bannerBlocked]}>
            <Text style={styles.bannerText} maxFontSizeMultiplier={1.4}>
              Você atingiu {status?.absencesCount} faltas e não pode mais marcar presença.
            </Text>
          </View>
        )}
        {!blocked && (status?.absencesCount ?? 0) > 0 && (
          <View style={[styles.banner, styles.bannerWarning]}>
            <Text style={styles.bannerTextWarning} maxFontSizeMultiplier={1.4}>
              Atenção: você já tem {status?.absencesCount} {status?.absencesCount === 1 ? 'falta' : 'faltas'}.
            </Text>
          </View>
        )}

        <View style={styles.checkInArea}>
          <Pressable
            style={({ pressed }) => [
              styles.checkInButton,
              blocked && styles.checkInButtonBlocked,
              insideRadius && !blocked && styles.checkInButtonEnabled,
              !canCheckIn && !blocked && styles.checkInButtonDisabled,
              pressed && canCheckIn && styles.checkInButtonPressed,
            ]}
            onPress={handleCheckIn}
            disabled={!canCheckIn || checkingIn}
          >
            {checkingIn ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.checkInInner}>
                <Text style={[styles.checkInText, insideRadius && !blocked && styles.checkInTextEnabled]} maxFontSizeMultiplier={1.3}>
                  Marcar Presença
                </Text>
                <Text style={[styles.checkInSubText, insideRadius && !blocked && styles.checkInTextEnabled]} maxFontSizeMultiplier={1.3}>
                  Toque para confirmar sua presença
                </Text>
              </View>
            )}
          </Pressable>

          <Text style={[styles.statusText, blocked && styles.statusBlocked]} maxFontSizeMultiplier={1.4}>{statusText()}</Text>

          {message && (
            <Text style={[styles.message, message.type === 'success' ? styles.messageSuccess : styles.messageError]} maxFontSizeMultiplier={1.4}>
              {message.text}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.backgroundLight,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  headerLogoBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerLogoImg: {
    width: 42,
    height: 42,
  },
  headerName: {
    color: APP_COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  logout: {
    color: APP_COLORS.primary,
    fontWeight: '600',
  },
  banner: {
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
  },
  bannerBlocked: {
    backgroundColor: APP_COLORS.danger,
  },
  bannerWarning: {
    backgroundColor: '#FEF3C7',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  bannerTextWarning: {
    color: '#92400E',
    fontSize: 14,
    lineHeight: 20,
  },
  checkInArea: {
    marginTop: 40,
    alignItems: 'center',
  },
  checkInButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: APP_COLORS.secondary,
    backgroundColor: '#FFFFFF',
  },
  checkInButtonEnabled: {
    backgroundColor: APP_COLORS.primary,
  },
  checkInButtonBlocked: {
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
  },
  checkInButtonDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
  },
  checkInButtonPressed: {
    backgroundColor: '#7F1414',
  },
  checkInInner: {
    alignItems: 'center',
    padding: 20,
  },
  checkInText: {
    color: '#0D0D0D',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  checkInSubText: {
    color: '#4B5563',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  checkInTextEnabled: {
    color: '#FFFFFF',
  },
  statusText: {
    marginTop: 24,
    fontSize: 15,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  statusBlocked: {
    color: APP_COLORS.danger,
    fontWeight: '600',
  },
  message: {
    marginTop: 16,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  messageSuccess: {
    color: APP_COLORS.success,
  },
  messageError: {
    color: APP_COLORS.danger,
  },
})