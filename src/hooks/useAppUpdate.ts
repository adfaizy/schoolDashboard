import { useCallback, useEffect, useState } from 'react'
import {
  applyUpdate, checkForUpdate, downloadUpdate, initLiveUpdate,
  installedVersion, pendingVersion, updateSource, type UpdateManifest,
} from '../lib/updates'

export type UpdateController = {
  version: string | null
  pending: string | null
  busy: boolean
  message: string
  source: string
  check: (manual?: boolean) => Promise<void>
  restart: () => Promise<void>
}

export function useAppUpdate(notify: (message: string, kind: 'success' | 'error') => void): UpdateController {
  const [version, setVersion] = useState<string | null>(() => installedVersion())
  const [pending, setPending] = useState<string | null>(() => pendingVersion())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const check = useCallback(async (manual = false) => {
    setBusy(true)
    try {
      const manifest: UpdateManifest | null = await checkForUpdate()
      if (!manifest) {
        setMessage('You are on the latest version.')
        if (manual) notify('Already up to date', 'success')
        return
      }
      await downloadUpdate(manifest)
      setPending(manifest.version)
      setMessage(`Version ${manifest.version} downloaded. Restart to apply.`)
      notify('Update downloaded — restart to apply', 'success')
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Update check failed'
      setMessage(text)
      if (manual) notify(text, 'error')
    } finally {
      setBusy(false)
    }
  }, [notify])

  const restart = useCallback(async () => {
    setBusy(true)
    try {
      await applyUpdate()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not restart', 'error')
      setBusy(false)
    }
  }, [notify])

  useEffect(() => {
    const start = async () => {
      await initLiveUpdate()
      setVersion(installedVersion())
      setPending(pendingVersion())
      await check(false)
    }
    void start()
    const timer = window.setInterval(() => { void check(false) }, 30 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [check])

  return { version, pending, busy, message, source: updateSource, check, restart }
}
