import NfcManager, { Ndef, NfcEvents, NfcTech } from 'react-native-nfc-manager'

const NFC_LOG_PREFIX = '[Flotory NFC]'
const NFC_SCAN_TIMEOUT_MS = 60_000

let activeSessionId = 0

type NdefRecord = {
  tnf: number
  type: number[] | Uint8Array
  payload: number[] | Uint8Array
}

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

function bytesToHex(bytes: number[] | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes)
  return Array.from(view)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ')
}

function toUint8Array(bytes: number[] | Uint8Array): Uint8Array {
  return bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes)
}

function isUriRecord(record: NdefRecord): boolean {
  return Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)
}

function isTextRecord(record: NdefRecord): boolean {
  return Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)
}

function decodeUriPayload(payload: number[] | Uint8Array): string {
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

function decodeTextPayload(payload: number[] | Uint8Array): string {
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

/** Normalize token parsed from URLs / NFC records. */
export function normalizeNfcToken(token: string): string {
  return token.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

/** Parse Flotory tap URL from an NFC tag URI record → stamp token */
export function extractNfcTokenFromUri(uri: string): string | null {
  const trimmed = uri.trim()
  if (!trimmed) {
    nfcLog('extractNfcTokenFromUri: empty input')
    return null
  }

  const direct = trimmed.match(/\/t\/([^/?#]+)/i)
  if (direct?.[1]) {
    const token = normalizeNfcToken(decodeURIComponent(direct[1]))
    if (!token) {
      return null
    }
    nfcLog('extractNfcTokenFromUri: matched direct path', { input: trimmed, token: maskToken(token) })
    return token
  }

  try {
    const url = new URL(trimmed)
    const match = url.pathname.match(/^\/t\/([^/]+)$/i)
    const token = match?.[1] ? normalizeNfcToken(decodeURIComponent(match[1])) : null
    if (token === '') {
      return null
    }
    nfcLog('extractNfcTokenFromUri: parsed URL', {
      input: trimmed,
      pathname: url.pathname,
      token: token ? maskToken(token) : null,
    })
    return token
  } catch (error) {
    nfcLog('extractNfcTokenFromUri: URL parse failed', {
      input: trimmed,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
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

async function requestNdefTechnology(sessionId: number): Promise<void> {
  nfcLog('requestNdefTechnology: waiting for tag tap', {
    sessionId,
    hint: 'Hold the top-back of your iPhone on the NTAG sticker until the session completes.',
  })

  const onSessionClosed = (event?: unknown) => {
    nfcLog('requestNdefTechnology: SessionClosed event', { sessionId, event })
  }

  NfcManager.setEventListener(NfcEvents.SessionClosed, onSessionClosed)

  try {
    await nfcTimeout(
      NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Hold your phone near the Flotory stamp stand',
        invalidateAfterFirstRead: true,
      }),
      NFC_SCAN_TIMEOUT_MS,
      'NFC timed out. Hold the top of your iPhone on the tag for 2–3 seconds, then try again.',
      sessionId,
    )
  } finally {
    NfcManager.setEventListener(NfcEvents.SessionClosed, null)
  }
}

export async function cancelNfcScan(): Promise<void> {
  nfcLog('cancelNfcScan')
  invalidateNfcSession()
  try {
    await NfcManager.cancelTechnologyRequest()
    nfcLog('cancelNfcScan: session cancelled')
  } catch (error) {
    nfcLog('cancelNfcScan: already closed', { error: error instanceof Error ? error.message : String(error) })
  }
}

export async function readFlotoryNfcToken(): Promise<string> {
  const sessionId = beginNfcSession()
  nfcLog('readFlotoryNfcToken: start', { sessionId })

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

    await requestNdefTechnology(sessionId)
    nfcLog('readFlotoryNfcToken: NDEF technology acquired', { sessionId })

    if (!isActiveNfcSession(sessionId)) {
      throw new Error('NFC scan was cancelled.')
    }

    const tag = await NfcManager.getTag()
    nfcLog('readFlotoryNfcToken: tag received', {
      id: tag?.id ?? null,
      techTypes: tag?.techTypes ?? [],
      maxSize: tag?.maxSize ?? null,
      recordCount: tag?.ndefMessage?.length ?? 0,
    })

    const records = tag?.ndefMessage ?? []
    const token = tokenFromNdefRecords(records)

    if (!token) {
      nfcLog('readFlotoryNfcToken: no token parsed from tag')
      throw new Error('This tag is not a Flotory stamp stand. Ask staff for the correct NFC stand.')
    }

    nfcLog('readFlotoryNfcToken: success', { token: maskToken(token) })
    return token
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
    try {
      await NfcManager.cancelTechnologyRequest()
      nfcLog('readFlotoryNfcToken: session closed')
    } catch (error) {
      nfcLog('readFlotoryNfcToken: session close skipped', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
