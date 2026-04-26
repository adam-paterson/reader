/**
 * Tests for Readwise API service
 */

import {
  ReadwiseApi,
  getApiToken,
  setApiToken,
  clearApiToken,
  getSyncState,
  saveSyncState,
} from "../api"
import { READWISE_STORAGE_KEYS, type ReadwiseSyncState } from "../types"
import { storage } from "@/utils/storage"

// Mock storage
jest.mock("@/utils/storage", () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
  loadString: jest.fn(),
  saveString: jest.fn(),
  load: jest.fn(),
  save: jest.fn(),
}))

describe("Readwise Storage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getApiToken", () => {
    it("should return null when no token is stored", () => {
      const { loadString } = require("@/utils/storage")
      loadString.mockReturnValue(null)

      const result = getApiToken()
      expect(result).toBeNull()
      expect(loadString).toHaveBeenCalledWith(READWISE_STORAGE_KEYS.API_TOKEN)
    })

    it("should return the stored token", () => {
      const { loadString } = require("@/utils/storage")
      const mockToken = "test-api-token-123"
      loadString.mockReturnValue(mockToken)

      const result = getApiToken()
      expect(result).toBe(mockToken)
    })
  })

  describe("setApiToken", () => {
    it("should save the token to storage", () => {
      const { saveString } = require("@/utils/storage")
      saveString.mockReturnValue(true)

      const token = "my-api-token"
      const result = setApiToken(token)

      expect(result).toBe(true)
      expect(saveString).toHaveBeenCalledWith(READWISE_STORAGE_KEYS.API_TOKEN, token)
    })
  })

  describe("clearApiToken", () => {
    it("should remove the token from storage", () => {
      clearApiToken()
      expect(storage.delete).toHaveBeenCalledWith(READWISE_STORAGE_KEYS.API_TOKEN)
    })
  })

  describe("getSyncState", () => {
    it("should return default state when nothing is stored", () => {
      const { load } = require("@/utils/storage")
      load.mockReturnValue(null)

      const result = getSyncState()

      expect(result).toEqual({
        lastSyncAt: null,
        lastSyncCount: 0,
        nextPageCursor: null,
      })
    })

    it("should return stored sync state", () => {
      const { load } = require("@/utils/storage")
      const mockState: ReadwiseSyncState = {
        lastSyncAt: "2024-01-15T10:30:00Z",
        lastSyncCount: 42,
        nextPageCursor: "cursor123",
      }
      load.mockReturnValue(mockState)

      const result = getSyncState()
      expect(result).toEqual(mockState)
    })
  })

  describe("saveSyncState", () => {
    it("should save sync state to storage", () => {
      const { save } = require("@/utils/storage")
      save.mockReturnValue(true)

      const state: ReadwiseSyncState = {
        lastSyncAt: "2024-01-15T10:30:00Z",
        lastSyncCount: 10,
        nextPageCursor: null,
      }

      const result = saveSyncState(state)

      expect(result).toBe(true)
      expect(save).toHaveBeenCalledWith(READWISE_STORAGE_KEYS.SYNC_STATE, state)
    })
  })
})

describe("ReadwiseApi", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("constructor", () => {
    it("should create instance with provided token", () => {
      const api = new ReadwiseApi({ apiToken: "test-token" })
      expect(api.isAuthenticated()).toBe(true)
    })

    it("should create instance with token from storage", () => {
      const { loadString } = require("@/utils/storage")
      loadString.mockReturnValue("stored-token")

      const api = new ReadwiseApi()
      expect(api.isAuthenticated()).toBe(true)
    })

    it("should create unauthenticated instance when no token available", () => {
      const { loadString } = require("@/utils/storage")
      loadString.mockReturnValue(null)

      const api = new ReadwiseApi()
      expect(api.isAuthenticated()).toBe(false)
    })
  })

  describe("exportHighlights", () => {
    it("should return error when not authenticated", async () => {
      const { loadString } = require("@/utils/storage")
      loadString.mockReturnValue(null)

      const api = new ReadwiseApi()
      const result = await api.exportHighlights([{ text: "test" }])

      expect(result.kind).toBe("error")
      if (result.kind === "error") {
        expect(result.problem.kind).toBe("unauthorized")
      }
    })

    it("should return ok with empty array for empty highlights", async () => {
      const api = new ReadwiseApi({ apiToken: "test-token" })
      const result = await api.exportHighlights([])

      expect(result.kind).toBe("ok")
      if (result.kind === "ok") {
        expect(result.data).toEqual([])
      }
    })
  })

  describe("importHighlights", () => {
    it("should return error when not authenticated", async () => {
      const { loadString } = require("@/utils/storage")
      loadString.mockReturnValue(null)

      const api = new ReadwiseApi()
      const result = await api.importHighlights()

      expect(result.kind).toBe("error")
      if (result.kind === "error") {
        expect(result.problem.kind).toBe("unauthorized")
      }
    })
  })

  describe("verifyToken", () => {
    it("should return error when not authenticated", async () => {
      const { loadString } = require("@/utils/storage")
      loadString.mockReturnValue(null)

      const api = new ReadwiseApi()
      const result = await api.verifyToken()

      expect(result.kind).toBe("error")
      if (result.kind === "error") {
        expect(result.problem.kind).toBe("unauthorized")
      }
    })
  })
})
