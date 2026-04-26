/**
 * Cloudflare API Client
 *
 * Client for communicating with Cloudflare Workers API.
 * Handles documents, bookmarks, reading sessions, and user data.
 */

import { ApiResponse, ApisauceInstance, create } from "apisauce"

import Config from "@/config"
import { supabaseAuth } from "@/services/supabase"

import { GeneralApiProblem, getGeneralApiProblem } from "../api/apiProblem"
import type {
  SyncDocument,
  SyncBookmark,
  SyncReadingSession,
  SyncCheckpoint,
  SyncPullResult,
  SyncPushPayload,
  SyncConflict,
  UserProfile,
  UserPreferences,
} from "../sync/types"

export interface CloudflareApiConfig {
  url: string
  timeout: number
}

export const DEFAULT_CLOUDFLARE_CONFIG: CloudflareApiConfig = {
  url: Config.CLOUDFLARE_API_URL || "https://api.reader.app",
  timeout: 30000,
}

/**
 * Cloudflare Workers API client
 */
export class CloudflareApi {
  apisauce: ApisauceInstance
  config: CloudflareApiConfig

  constructor(config: CloudflareApiConfig = DEFAULT_CLOUDFLARE_CONFIG) {
    this.config = config
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    })

    // Add auth token to requests
    this.apisauce.addAsyncRequestTransform(async (request) => {
      const token = await supabaseAuth.getAccessToken()
      if (token && request.headers) {
        request.headers.Authorization = `Bearer ${token}`
      }
    })
  }

  // ==================== User Profile ====================

  async getUserProfile(): Promise<{ kind: "ok"; profile: UserProfile } | GeneralApiProblem> {
    const response: ApiResponse<UserProfile> = await this.apisauce.get("/api/user/profile")

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    if (!response.data) {
      return { kind: "bad-data" }
    }

    return { kind: "ok", profile: response.data }
  }

  async updateUserProfile(
    profile: Partial<UserProfile>,
  ): Promise<{ kind: "ok"; profile: UserProfile } | GeneralApiProblem> {
    const response: ApiResponse<UserProfile> = await this.apisauce.patch(
      "/api/user/profile",
      profile,
    )

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    if (!response.data) {
      return { kind: "bad-data" }
    }

    return { kind: "ok", profile: response.data }
  }

  async updatePreferences(
    preferences: Partial<UserPreferences>,
  ): Promise<{ kind: "ok"; preferences: UserPreferences } | GeneralApiProblem> {
    const response: ApiResponse<UserPreferences> = await this.apisauce.patch(
      "/api/user/preferences",
      preferences,
    )

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    if (!response.data) {
      return { kind: "bad-data" }
    }

    return { kind: "ok", preferences: response.data }
  }

  // ==================== Documents ====================

  async getDocuments(): Promise<{ kind: "ok"; documents: SyncDocument[] } | GeneralApiProblem> {
    const response: ApiResponse<{ documents: SyncDocument[] }> =
      await this.apisauce.get("/api/documents")

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", documents: response.data?.documents ?? [] }
  }

  async createDocument(
    document: Omit<SyncDocument, "id" | "userId" | "createdAt" | "updatedAt" | "version">,
  ): Promise<{ kind: "ok"; document: SyncDocument } | GeneralApiProblem> {
    const response: ApiResponse<SyncDocument> = await this.apisauce.post("/api/documents", document)

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    if (!response.data) {
      return { kind: "bad-data" }
    }

    return { kind: "ok", document: response.data }
  }

  async updateDocument(
    id: string,
    updates: Partial<SyncDocument>,
  ): Promise<{ kind: "ok"; document: SyncDocument } | GeneralApiProblem> {
    const response: ApiResponse<SyncDocument> = await this.apisauce.patch(
      `/api/documents/${id}`,
      updates,
    )

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    if (!response.data) {
      return { kind: "bad-data" }
    }

    return { kind: "ok", document: response.data }
  }

  async deleteDocument(id: string): Promise<{ kind: "ok" } | GeneralApiProblem> {
    const response = await this.apisauce.delete(`/api/documents/${id}`)

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok" }
  }

  async getDocumentContent(
    id: string,
  ): Promise<{ kind: "ok"; content: string; url?: string } | GeneralApiProblem> {
    const response: ApiResponse<{ content: string; url?: string }> = await this.apisauce.get(
      `/api/documents/${id}/content`,
    )

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    if (!response.data) {
      return { kind: "bad-data" }
    }

    return { kind: "ok", content: response.data.content, url: response.data.url }
  }

  async uploadDocumentContent(
    id: string,
    content: string,
  ): Promise<{ kind: "ok"; url: string } | GeneralApiProblem> {
    const response: ApiResponse<{ url: string }> = await this.apisauce.post(
      `/api/documents/${id}/content`,
      {
        content,
      },
    )

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    if (!response.data) {
      return { kind: "bad-data" }
    }

    return { kind: "ok", url: response.data.url }
  }

  // ==================== Bookmarks ====================

  async getBookmarks(
    documentId?: string,
  ): Promise<{ kind: "ok"; bookmarks: SyncBookmark[] } | GeneralApiProblem> {
    const params = documentId ? { documentId } : {}
    const response: ApiResponse<{ bookmarks: SyncBookmark[] }> = await this.apisauce.get(
      "/api/bookmarks",
      params,
    )

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", bookmarks: response.data?.bookmarks ?? [] }
  }

  async createBookmark(
    bookmark: Omit<SyncBookmark, "id" | "userId" | "createdAt" | "updatedAt">,
  ): Promise<{ kind: "ok"; bookmark: SyncBookmark } | GeneralApiProblem> {
    const response: ApiResponse<SyncBookmark> = await this.apisauce.post("/api/bookmarks", bookmark)

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    if (!response.data) {
      return { kind: "bad-data" }
    }

    return { kind: "ok", bookmark: response.data }
  }

  async updateBookmark(
    id: string,
    updates: Partial<SyncBookmark>,
  ): Promise<{ kind: "ok"; bookmark: SyncBookmark } | GeneralApiProblem> {
    const response: ApiResponse<SyncBookmark> = await this.apisauce.patch(
      `/api/bookmarks/${id}`,
      updates,
    )

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    if (!response.data) {
      return { kind: "bad-data" }
    }

    return { kind: "ok", bookmark: response.data }
  }

  async deleteBookmark(id: string): Promise<{ kind: "ok" } | GeneralApiProblem> {
    const response = await this.apisauce.delete(`/api/bookmarks/${id}`)

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok" }
  }

  // ==================== Reading Sessions ====================

  async getReadingSessions(
    documentId?: string,
  ): Promise<{ kind: "ok"; sessions: SyncReadingSession[] } | GeneralApiProblem> {
    const params = documentId ? { documentId } : {}
    const response: ApiResponse<{ sessions: SyncReadingSession[] }> = await this.apisauce.get(
      "/api/sessions",
      params,
    )

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", sessions: response.data?.sessions ?? [] }
  }

  async createReadingSession(
    session: Omit<SyncReadingSession, "id" | "userId">,
  ): Promise<{ kind: "ok"; session: SyncReadingSession } | GeneralApiProblem> {
    const response: ApiResponse<SyncReadingSession> = await this.apisauce.post(
      "/api/sessions",
      session,
    )

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    if (!response.data) {
      return { kind: "bad-data" }
    }

    return { kind: "ok", session: response.data }
  }

  // ==================== Sync ====================

  async pullChanges(
    checkpoint?: SyncCheckpoint,
    limit = 100,
  ): Promise<{ kind: "ok"; result: SyncPullResult } | GeneralApiProblem> {
    const response: ApiResponse<SyncPullResult> = await this.apisauce.post("/api/sync/pull", {
      checkpoint,
      limit,
    })

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    if (!response.data) {
      return { kind: "bad-data" }
    }

    return { kind: "ok", result: response.data }
  }

  async pushChanges(
    payload: SyncPushPayload,
  ): Promise<
    { kind: "ok"; checkpoint: SyncCheckpoint; conflicts: SyncConflict[] } | GeneralApiProblem
  > {
    const response: ApiResponse<{ checkpoint: SyncCheckpoint; conflicts: SyncConflict[] }> =
      await this.apisauce.post("/api/sync/push", payload)

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    if (!response.data) {
      return { kind: "bad-data" }
    }

    return {
      kind: "ok",
      checkpoint: response.data.checkpoint,
      conflicts: response.data.conflicts,
    }
  }

  async resolveConflicts(resolutions: SyncConflict[]): Promise<{ kind: "ok" } | GeneralApiProblem> {
    const response = await this.apisauce.post("/api/sync/resolve", { resolutions })

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok" }
  }

  // ==================== Health Check ====================

  async healthCheck(): Promise<{ kind: "ok"; healthy: boolean } | GeneralApiProblem> {
    const response: ApiResponse<{ status: string }> = await this.apisauce.get("/api/health")

    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    return { kind: "ok", healthy: response.data?.status === "ok" }
  }
}

// Singleton instance
export const cloudflareApi = new CloudflareApi()
