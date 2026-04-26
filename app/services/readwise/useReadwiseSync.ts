import { useState, useCallback, useEffect } from "react"

import {
  readwiseApi,
  getApiToken,
  setApiToken,
  getSyncState,
  isSyncEnabled,
  setSyncEnabled,
  type ReadwiseResult,
  type SyncStats,
  type ReadwiseApiProblem,
} from "./api"

/**
 * React hook for Readwise sync management
 *
 * @example
 * ```typescript
 * function SettingsScreen() {
 *   const {
 *     apiToken,
 *     setApiToken: saveToken,
 *     isAuthenticated,
 *     sync,
 *     isSyncing,
 *     lastSync,
 *     syncEnabled,
 *     setSyncEnabled: enableSync,
 *     error,
 *     importProgress,
 *   } = useReadwiseSync()
 *
 *   return (
 *     <View>
 *       <TextInput
 *         value={apiToken}
 *         onChangeText={saveToken}
 *         placeholder="Readwise API Token"
 *         secureTextEntry
 *       />
 *       <Switch value={syncEnabled} onValueChange={enableSync} />
 *       <Button
 *         title={isSyncing ? `Syncing... ${importProgress}` : "Sync Now"}
 *         onPress={sync}
 *         disabled={isSyncing || !isAuthenticated}
 *       />
 *       {lastSync && <Text>Last sync: {lastSync}</Text>}
 *       {error && <Text>Error: {error}</Text>}
 *     </View>
 *   )
 * }
 * ```
 */
export function useReadwiseSync() {
  const [apiToken, setApiTokenState] = useState<string>(getApiToken() ?? "")
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(readwiseApi.isAuthenticated())
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncEnabled, setSyncEnabledState] = useState<boolean>(isSyncEnabled())
  const [error, setError] = useState<ReadwiseApiProblem | null>(null)
  const [lastSyncStats, setLastSyncStats] = useState<SyncStats | null>(null)
  const [importProgress, setImportProgress] = useState(0)

  // Re-check authentication when token changes
  useEffect(() => {
    setIsAuthenticated(readwiseApi.isAuthenticated())
  }, [apiToken])

  /**
   * Save the API token
   */
  const saveToken = useCallback((token: string) => {
    setApiTokenState(token)
    setApiToken(token)
    setError(null)
  }, [])

  /**
   * Enable/disable automatic sync
   */
  const enableSync = useCallback((enabled: boolean) => {
    setSyncEnabledState(enabled)
    setSyncEnabled(enabled)
  }, [])

  /**
   * Perform a sync operation
   */
  const sync = useCallback(async (): Promise<ReadwiseResult<SyncStats>> => {
    if (!isAuthenticated) {
      const problem = { kind: "unauthorized" as const, message: "Please configure API token first" }
      setError(problem)
      return { kind: "error", problem }
    }

    setIsSyncing(true)
    setError(null)
    setImportProgress(0)

    try {
      const result = await readwiseApi.incrementalSync((imported) => {
        setImportProgress(imported)
      })

      if (result.kind === "error") {
        setError(result.problem)
        setIsSyncing(false)
        return result
      }

      const stats: SyncStats = {
        imported: result.data.highlights.length,
        exported: 0,
        errors: 0,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }

      setLastSyncStats(stats)
      setIsSyncing(false)
      return { kind: "ok", data: stats }
    } catch (e) {
      const problem: ReadwiseApiProblem = {
        kind: "unknown",
        message: e instanceof Error ? e.message : "Sync failed",
      }
      setError(problem)
      setIsSyncing(false)
      return { kind: "error", problem }
    }
  }, [isAuthenticated])

  /**
   * Verify the API token is valid
   */
  const verifyToken = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) return false

    setError(null)
    const result = await readwiseApi.verifyToken()

    if (result.kind === "error") {
      setError(result.problem)
      return false
    }

    return result.data
  }, [isAuthenticated])

  const syncState = getSyncState()

  return {
    // State
    apiToken,
    isAuthenticated,
    isSyncing,
    syncEnabled,
    error,
    lastSync: syncState.lastSyncAt,
    lastSyncStats,
    importProgress,

    // Actions
    setApiToken: saveToken,
    setSyncEnabled: enableSync,
    sync,
    verifyToken,
  }
}
