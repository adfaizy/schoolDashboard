import { Capacitor } from '@capacitor/core'
import { LiveUpdate } from '@capawesome/capacitor-live-update'

const BASE = (
  import.meta.env.VITE_UPDATE_URL ||
  'https://raw.githubusercontent.com/adfaizy/schoolDashboard/gh-pages'
).replace(/\/$/, '')

const VERSION_KEY = 'schooldashboard.update.version'

export type UpdateManifest = {
  version: string
  url: string
  createdAt?: string
}

export type UpdateState =
  | { status: 'unavailable' | 'current' | 'checking' | 'downloading' | 'idle'; version: string | null; message?: string }
  | { status: 'available' | 'downloaded' | 'error'; version: string | null; message?: string }

let readyCalled = false

export const updateSource = BASE

export async function initLiveUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    if (!readyCalled) {
      await LiveUpdate.ready()
      readyCalled = true
    }
  } catch {
    // Non-fatal: the bundled app still works.
  }
}

export function installedVersion(): string | null {
  try {
    return localStorage.getItem(VERSION_KEY)
  } catch {
    return null
  }
}

export async function checkForUpdate(): Promise<UpdateManifest | null> {
  if (!Capacitor.isNativePlatform()) return null
  await initLiveUpdate()
  const response = await fetch(`${BASE}/app-update.json?t=${Date.now()}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Update server returned HTTP ${response.status}`)
  const manifest = (await response.json()) as UpdateManifest
  if (!manifest.version || !manifest.url) throw new Error('Invalid update manifest')
  if (manifest.version === installedVersion()) return null
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
  try {
    localStorage.setItem(VERSION_KEY, manifest.version)
  } catch {
    // Storage unavailable — update still staged for next launch.
  }
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
