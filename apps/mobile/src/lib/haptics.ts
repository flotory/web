import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

async function run(feedback: () => Promise<void>) {
  if (Platform.OS === 'web') return
  try {
    await feedback()
  } catch {
    // Haptics unavailable on some devices/simulators.
  }
}

export function hapticTabChange() {
  void run(() => Haptics.selectionAsync())
}

export function hapticLightTap() {
  void run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
}

export function hapticSuccess() {
  void run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
}
