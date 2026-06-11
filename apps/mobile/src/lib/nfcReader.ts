import { Platform } from 'react-native'
import NfcManager, { Ndef, NfcError, NfcEvents, NfcTech, type NdefRecord, type TagEvent } from 'react-native-nfc-manager'

import { extractNfcTokenFromUri, normalizeNfcToken } from './nfcToken'

export { extractNfcTokenFromUri, normalizeNfcToken } from './nfcToken'

const NFC_LOG_PREFIX = '[Flotory NFC]'
const NFC_SCAN_TIMEOUT_MS = 60_000
const NFC_ANDROID_READ_RETRY_MS = 50

let activeSessionId = 0

export function nfcLog(message: string, data?: unknown): void {
  if (!__DEV__) {
    return
  }

  if (data === undefined) {
    console.log(NFC_LOG_PREFIX, message)
    return
  }

  console.log(NFC_LOG_PREFIX, message, data)
}

function maskToken(token: string): string {
  if (token.length <= 8) {
    return token
  }

  return `${token.slice(0, 4)}…${token.slice(-4)}`
}

function bytesToHex(bytes: NdefRecord['type'] | NdefRecord['payload']): string {
  if (typeof bytes === 'string') {
    return bytes
  }

  const view = toUint8Array(bytes)
  return Array.from(view)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ')
}

function toUint8Array(bytes: NdefRecord['payload']): Uint8Array {
  if (bytes instanceof Uint8Array) {
    return bytes
  }

  return Uint8Array.from(bytes as ArrayLike<number>)
}

function isUriRecord(record: NdefRecord): boolean {
  return Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)
}

function isTextRecord(record: NdefRecord): boolean {
  return Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)
}

function decodeUriPayload(payload: NdefRecord['payload']): string {
  const bytes = toUint8Array(payload)
  if (bytes.length === 0) {
    return ''
  }

  try {
    return Ndef.uri.decodePayload(bytes)
  } catch {
    const prefix = Ndef.RTD_URI_PROTOCOLS[bytes[0]] ?? ''
    return prefix + String.fromCharCode(...bytes.slice(1))
  }
}

function decodeTextPayload(payload: NdefRecord['payload']): string {
  const bytes = toUint8Array(payload)
  return Ndef.text.decodePayload(bytes)
}

function describeNdefRecord(record: NdefRecord, index: number): Record<string, unknown> {
  const summary: Record<string, unknown> = {
    index,
    tnf: record.tnf,
    typeHex: bytesToHex(record.type),
    payloadHex: bytesToHex(record.payload),
    isUri: isUriRecord(record),
    isText: isTextRecord(record),
  }

  try {
    if (isUriRecord(record)) {
      summary.decodedUri = decodeUriPayload(record.payload)
    } else if (isTextRecord(record)) {
      summary.decodedText = decodeTextPayload(record.payload)
    }
  } catch (error) {
    summary.decodeError = error instanceof Error ? error.message : String(error)
  }

  return summary
}

function fastTokenFromNdefRecords(records: NdefRecord[]): string | null {
  for (const record of records) {
    if (isUriRecord(record)) {
      const token = extractNfcTokenFromUri(decodeUriPayload(record.payload))
      if (token) {
        return token
      }
    }

    if (isTextRecord(record)) {
      const token = extractNfcTokenFromUri(decodeTextPayload(record.payload))
      if (token) {
        return token
      }
    }
  }

  return null
}

function tokenFromNdefRecords(records: NdefRecord[]): string | null {
  nfcLog('tokenFromNdefRecords: start', { recordCount: records.length })

  for (const [index, record] of records.entries()) {
    const summary = describeNdefRecord(record, index)
    nfcLog('tokenFromNdefRecords: record', summary)

    if (isUriRecord(record)) {
      const uri = decodeUriPayload(record.payload)
      const token = extractNfcTokenFromUri(uri)
      if (token) {
        nfcLog('tokenFromNdefRecords: token from URI record', { index, token: maskToken(token) })
        return token
      }
    }

    if (isTextRecord(record)) {
      const text = decodeTextPayload(record.payload)
      const token = extractNfcTokenFromUri(text)
      if (token) {
        nfcLog('tokenFromNdefRecords: token from text record', { index, token: maskToken(token) })
        return token
      }
    }
  }

  nfcLog('tokenFromNdefRecords: no Flotory token found')
  return null
}

function emptyTagError(): Error {
  return new Error(
    'Could not read the NFC sticker. Hold the top of your iPhone on it for 2–3 seconds, then tap My QR again. If it still fails, use NFC Tools → Read to confirm the Flotory URL is on the chip.',
  )
}

function invalidTagError(): Error {
  return new Error('This tag is not a Flotory stamp stand. Ask staff for the correct NFC stand.')
}

function tokenFromTagEvent(tag: TagEvent | null | undefined, fast = false): string {
  const records = tag?.ndefMessage ?? []
  const token = fast ? fastTokenFromNdefRecords(records) : tokenFromNdefRecords(records)

  if (token) {
    return token
  }

  if (records.length === 0) {
    throw emptyTagError()
  }

  throw invalidTagError()
}

export async function isNfcHardwareSupported(): Promise<boolean> {
  try {
    const supported = await NfcManager.isSupported()
    nfcLog('isNfcHardwareSupported', { supported })
    return supported
  } catch (error) {
    nfcLog('isNfcHardwareSupported: failed', { error: error instanceof Error ? error.message : String(error) })
    return false
  }
}

export async function isNfcEnabled(): Promise<boolean> {
  try {
    const enabled = await NfcManager.isEnabled()
    nfcLog('isNfcEnabled', { enabled })
    return enabled
  } catch (error) {
    nfcLog('isNfcEnabled: failed', { error: error instanceof Error ? error.message : String(error) })
    return false
  }
}

/**
 * Foreground NFC read — expects tag programmed with https://flotory.com/t/{token}.
 * Requires a dev/production native build (not Expo Go).
 */
function beginNfcSession(): number {
  activeSessionId += 1
  return activeSessionId
}

function isActiveNfcSession(sessionId: number): boolean {
  return sessionId === activeSessionId
}

export function invalidateNfcSession(): void {
  activeSessionId += 1
  nfcLog('invalidateNfcSession', { sessionId: activeSessionId })
}

function nfcTimeout<T>(promise: Promise<T>, ms: number, message: string, sessionId: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      nfcLog('nfcTimeout: fired', { sessionId, ms })
      reject(new Error(message))
    }, ms)

    promise
      .then((value) => {
        clearTimeout(timer)
        if (!isActiveNfcSession(sessionId)) {
          reject(new Error('NFC scan was cancelled.'))
          return
        }
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

/** Await native NFC teardown — must complete before navigating or animations won't show. */
export async function forceCloseNfcSheet(): Promise<void> {
  invalidateNfcSession()

  if (Platform.OS === 'ios') {
    await Promise.allSettled([
      NfcManager.unregisterTagEvent(),
      NfcManager.invalidateSessionIOS(),
      NfcManager.cancelTechnologyRequest(),
    ])
    nfcLog('forceCloseNfcSheet: ios session closed')
    return
  }

  try {
    await NfcManager.cancelTechnologyRequest()
    nfcLog('forceCloseNfcSheet: android session closed')
  } catch (error) {
    nfcLog('forceCloseNfcSheet: android close skipped', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/** Fire-and-forget NFC sheet dismiss (prefer forceCloseNfcSheet when navigating). */
export function dismissNfcSheetImmediately(): void {
  void forceCloseNfcSheet()
}

/** Dismiss the native NFC sheet (async wrapper for cleanup paths). */
export async function closeNfcSession(): Promise<void> {
  await forceCloseNfcSheet()
}

export async function cancelNfcScan(): Promise<void> {
  nfcLog('cancelNfcScan')
  invalidateNfcSession()
  await closeNfcSession()
}

/** Clear a stale Core NFC session before starting a new read (helps iOS retries). */
export async function ensureNfcSessionReady(): Promise<void> {
  await forceCloseNfcSheet()
}

/**
 * iOS fast path: Core NFC auto-dismisses the sheet after the first NDEF read.
 * Avoids the slower tag-session + manual invalidate flow.
 */
async function readFlotoryNfcTokenIOS(sessionId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false
    let pendingToken: string | null = null
    let sheetClosed = false

    const finish = (action: 'resolve' | 'reject', value: string | Error) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeout)
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null)
      NfcManager.setEventListener(NfcEvents.SessionClosed, null)

      if (action === 'resolve') {
        resolve(value as string)
        return
      }

      reject(value)
    }

    const resolveAfterSheetClosed = () => {
      if (!pendingToken) {
        return
      }

      nfcLog('readFlotoryNfcTokenIOS: sheet closed, continuing', {
        token: maskToken(pendingToken),
      })
      finish('resolve', pendingToken)
    }

    const timeout = setTimeout(() => {
      finish(
        'reject',
        new Error('NFC timed out. Hold the top of your iPhone on the tag for 2–3 seconds, then try again.'),
      )
    }, NFC_SCAN_TIMEOUT_MS)

    NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag: TagEvent) => {
      if (!isActiveNfcSession(sessionId)) {
        finish('reject', new Error('NFC scan was cancelled.'))
        return
      }

      nfcLog('readFlotoryNfcTokenIOS: tag discovered', {
        recordCount: tag?.ndefMessage?.length ?? 0,
      })

      try {
        pendingToken = tokenFromTagEvent(tag, true)
        nfcLog('readFlotoryNfcTokenIOS: waiting for native sheet to close', {
          token: maskToken(pendingToken),
        })

        if (sheetClosed) {
          resolveAfterSheetClosed()
        }
      } catch (error) {
        finish('reject', error instanceof Error ? error : new Error(String(error)))
      }
    })

    NfcManager.setEventListener(NfcEvents.SessionClosed, (error?: Error | null) => {
      if (settled) {
        return
      }

      sheetClosed = true

      if (pendingToken) {
        resolveAfterSheetClosed()
        return
      }

      if (error instanceof NfcError.SessionInvalidated) {
        nfcLog('readFlotoryNfcTokenIOS: session invalidated before token parsed')
        return
      }

      if (!error) {
        finish('reject', new Error('NFC scan cancelled. Tap the center button to try again.'))
        return
      }

      finish('reject', error)
    })

    void NfcManager.registerTagEvent({
      alertMessage: 'Hold your phone near the NFC stand',
      invalidateAfterFirstRead: true,
    }).catch((error) => {
      finish('reject', error instanceof Error ? error : new Error(String(error)))
    })
  })
}

async function requestNdefTechnology(sessionId: number): Promise<void> {
  nfcLog('requestNdefTechnology: waiting for tag tap', { sessionId })

  await nfcTimeout(
    NfcManager.requestTechnology(NfcTech.Ndef, {
      alertMessage: 'Hold your phone near the NFC stand',
      invalidateAfterFirstRead: true,
    }),
    NFC_SCAN_TIMEOUT_MS,
    'NFC timed out. Hold the top of your iPhone on the tag for 2–3 seconds, then try again.',
    sessionId,
  )
}

async function collectNdefRecords(): Promise<{ records: NdefRecord[]; tag: TagEvent | null }> {
  let tag: TagEvent | null = null

  try {
    tag = await NfcManager.getTag()
    nfcLog('collectNdefRecords: getTag', { recordCount: tag?.ndefMessage?.length ?? 0 })
  } catch (error) {
    nfcLog('collectNdefRecords: getTag failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  let records = tag?.ndefMessage ?? []

  if (records.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, NFC_ANDROID_READ_RETRY_MS))
    try {
      tag = await NfcManager.getTag()
      records = tag?.ndefMessage ?? []
      nfcLog('collectNdefRecords: retried getTag', { recordCount: records.length })
    } catch (error) {
      nfcLog('collectNdefRecords: retry getTag failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { records, tag }
}

async function readFlotoryNfcTokenAndroid(sessionId: number): Promise<string> {
  await requestNdefTechnology(sessionId)
  nfcLog('readFlotoryNfcTokenAndroid: NDEF technology acquired', { sessionId })

  if (!isActiveNfcSession(sessionId)) {
    throw new Error('NFC scan was cancelled.')
  }

  const { records, tag } = await collectNdefRecords()
  await forceCloseNfcSheet()

  nfcLog('readFlotoryNfcTokenAndroid: tag received', {
    id: tag?.id ?? null,
    techTypes: tag?.techTypes ?? [],
    maxSize: tag?.maxSize ?? null,
    recordCount: records.length,
  })

  const token = tokenFromNdefRecords(records)
  if (!token) {
    if (records.length === 0) {
      throw emptyTagError()
    }
    throw invalidTagError()
  }

  nfcLog('readFlotoryNfcTokenAndroid: success', { token: maskToken(token) })
  return token
}

export async function readFlotoryNfcToken(): Promise<string> {
  const sessionId = beginNfcSession()
  nfcLog('readFlotoryNfcToken: start', { sessionId, platform: Platform.OS })

  const supported = await isNfcHardwareSupported()
  if (!supported) {
    nfcLog('readFlotoryNfcToken: hardware unsupported')
    throw new Error('NFC is not available on this device. Use a physical iPhone build from Xcode.')
  }

  const enabled = await isNfcEnabled()
  if (!enabled) {
    nfcLog('readFlotoryNfcToken: NFC disabled in settings')
    throw new Error('Turn on NFC in your phone settings, then try again.')
  }

  await NfcManager.start()
  nfcLog('readFlotoryNfcToken: NfcManager started')

  try {
    if (!isActiveNfcSession(sessionId)) {
      throw new Error('NFC scan was cancelled.')
    }

    if (Platform.OS === 'ios') {
      return await readFlotoryNfcTokenIOS(sessionId)
    }

    return await readFlotoryNfcTokenAndroid(sessionId)
  } catch (error) {
    const message = error instanceof Error ? error.message.trim() : ''
    nfcLog('readFlotoryNfcToken: failed', {
      error: message || '(empty — user likely dismissed the iOS NFC sheet)',
      name: error instanceof Error ? error.name : undefined,
      raw: error,
    })
    if (error instanceof Error && !message) {
      throw new Error('NFC scan cancelled. Tap the center button to try again.')
    }
    throw error
  } finally {
    if (Platform.OS === 'ios') {
      try {
        await NfcManager.unregisterTagEvent()
      } catch {
        // Session already closed after a successful read.
      }
    } else {
      await forceCloseNfcSheet()
    }
  }
}
