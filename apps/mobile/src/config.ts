import { Platform } from 'react-native'

export const API_URL = Platform.select({
  android: 'http://10.0.2.2:3333',
  default: 'http://localhost:3333',
})

export const MIN_ACCURACY_METERS = 50