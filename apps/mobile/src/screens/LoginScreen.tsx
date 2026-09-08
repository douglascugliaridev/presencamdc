import { useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { APP_COLORS, apiErrorMessage, CONNECTION_ERROR_MESSAGE } from '@presencamdc/shared'
import { API_URL } from '../config'
import { saveTokens } from '../services/storage'
import type { MeResponse } from '../services/api'

interface LoginScreenProps {
  onLogin: (user: MeResponse) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError('')
    setLoading(true)
    try {
      let res: Response
      try {
        res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
      } catch {
        throw new Error(CONNECTION_ERROR_MESSAGE)
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: unknown } | null
        throw new Error(apiErrorMessage(res.status, data?.message))
      }

      const data = (await res.json()) as { accessToken: string; refreshToken: string }
      await saveTokens(data.accessToken, data.refreshToken)

      let meRes: Response
      try {
        meRes = await fetch(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        })
      } catch {
        throw new Error(CONNECTION_ERROR_MESSAGE)
      }
      if (!meRes.ok) {
        throw new Error(apiErrorMessage(meRes.status, undefined))
      }
      onLogin((await meRes.json()) as MeResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.logoCard}>
            <Image source={require('../../assets/images.png')} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.4}>Marcação de presença</Text>

          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={APP_COLORS.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={APP_COLORS.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error} maxFontSizeMultiplier={1.4}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (pressed || loading || !email || !password) && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText} maxFontSizeMultiplier={1.4}>Entrar</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.backgroundDark,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
  },
  logoCard: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    width: 220,
    height: 130,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  logoImg: {
    width: 190,
    height: 78,
  },
  subtitle: {
    color: APP_COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: APP_COLORS.textPrimary,
    marginBottom: 12,
  },
  error: {
    color: APP_COLORS.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})