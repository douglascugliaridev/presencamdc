import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { APP_COLORS } from '@presencamdc/shared'
import { api, type MeResponse } from './src/services/api'
import { getAccessToken } from './src/services/storage'
import HomeScreen from './src/screens/HomeScreen'
import LoginScreen from './src/screens/LoginScreen'

export default function App() {
  const [user, setUser] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void bootstrap()
  }, [])

  async function bootstrap() {
    const token = await getAccessToken()
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const me = await api.get<MeResponse>('/me')
      setUser(me)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.splash}>
          <View style={styles.splashLogoBox}>
            <Image source={require('./assets/images.png')} style={styles.splashLogoImg} resizeMode="contain" />
          </View>
          <Text style={styles.splashLogo}>MAIS DE CRISTO</Text>
          <ActivityIndicator color={APP_COLORS.secondary} style={{ marginTop: 24 }} />
          <StatusBar style="light" />
        </View>
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style={user ? 'dark' : 'light'} />
        {user ? (
          <HomeScreen user={user} onLogout={() => setUser(null)} />
        ) : (
          <LoginScreen onLogin={(me) => setUser(me)} />
        )}
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.backgroundLight,
  },
  splash: {
    flex: 1,
    backgroundColor: APP_COLORS.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoBox: {
    backgroundColor: '#0D0D0D',
    borderRadius: 20,
    width: 220,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  splashLogoImg: {
    width: 190,
    height: 78,
  },
  splashLogo: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
})