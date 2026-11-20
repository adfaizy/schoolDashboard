import { Capacitor } from '@capacitor/core'
import { LiveUpdate } from '@capawesome/capacitor-live-update'

const BASE = (
  import.meta.env.VITE_UPDATE_URL ||
  'https://raw.githubusercontent.com/adfaizy/schoolDashboard/gh-pages'
).replace(/\/$/, '')

const VERSION_KEY = 'schooldashboard.update.version'
const PENDING_KEY = 'schooldashboard.update.pending'

export type UpdateManifest = {
  version: string
  url: string
  createdAt?: string
}

export type UpdateState =
  | { status: 'unavailable' | 'current' | 'checking' | 'downloading' | 'idle'; version: string | null; message?: string }
  | { status: 'available' | 'downloaded' | 'error'; version: string | null; message?: string }

export const updateSource = BASE

let readyPromise: Promise<void> | null = null

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function storageSet(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage unavailable — the live bundle still works.
  }
}

export function installedVersion(): string | null {
  return storageGet(VERSION_KEY)
}

export function pendingVersion(): string | null {
  return storageGet(PENDING_KEY)
}

async function currentBundleId(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const { bundleId } = await LiveUpdate.getCurrentBundle()
    return bundleId && bundleId !== 'public' ? bundleId : null
  } catch {
    return null
  }
}

async function confirmBundle(): Promise<void> {
  try {
    const bundleId = await currentBundleId()
    storageSet(VERSION_KEY, bundleId)
    storageSet(PENDING_KEY, null)
  } catch {
    // Non-fatal: the next check will still compare against the live bundle.
  }
}

async function doInit(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  const result = await LiveUpdate.ready()
  // ready() performs any pending rollback, so read the actual bundle afterwards.
  await confirmBundle()
  if (result.rollback) {
    // The old bundle is active again; pending state was cleared above so the
    // update is simply downloaded again on the next check.
  }
}

/** Mark the currently running bundle as healthy and stop the rollback timer. */
export async function initLiveUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (!readyPromise) {
    readyPromise = doInit().catch(() => {
      // Allow a retry on the next launch if the native bridge was not ready.
      readyPromise = null
    })
  }
  return readyPromise
}

export async function checkForUpdate(): Promise<UpdateManifest | null> {
  if (!Capacitor.isNativePlatform()) return null
  await initLiveUpdate()
  const response = await fetch(`${BASE}/app-update.json?t=${Date.now()}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Update server returned HTTP ${response.status}`)
  const manifest = (await response.json()) as UpdateManifest
  if (!manifest.version || !manifest.url) throw new Error('Invalid update manifest')
  const current = await currentBundleId()
  if (manifest.version === current || manifest.version === pendingVersion()) return null
  return manifest
}

export async function downloadUpdate(manifest: UpdateManifest): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await initLiveUpdate()
  const url = new URL(manifest.url, `${BASE}/`).toString()
  try {
    await LiveUpdate.deleteBundle({ bundleId: manifest.version })
  } catch {
    // Bundle may not exist yet — that is fine.
  }
  await LiveUpdate.downloadBundle({ bundleId: manifest.version, url })
  await LiveUpdate.setNextBundle({ bundleId: manifest.version })
  storageSet(PENDING_KEY, manifest.version)
}

export async function applyUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await initLiveUpdate()
  await LiveUpdate.reload()
}

/** Download in the background and apply on the next app start. */
export async function backgroundUpdate(): Promise<boolean> {
  try {
    const manifest = await checkForUpdate()
    if (!manifest) return false
    await downloadUpdate(manifest)
    return true
  } catch {
    return false
  }
}
