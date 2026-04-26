/**
 * Cloudflare Worker - Core API
 * 
 * Main entry point for Cloudflare Workers API.
 * Handles authentication, document management, and sync operations.
 */

import { jwtVerify, importSPKI } from "jose"

// Environment bindings
export interface Env {
  DB: D1Database
  DOCUMENTS: R2Bucket
  CACHE: KVNamespace
  IMPORT_QUEUE: Queue<ImportJob>
  SUPABASE_JWT_SECRET: string
}

interface ImportJob {
  type: "import_kindle" | "import_readwise" | "import_url"
  userId: string
  payload: unknown
  priority: number
}

interface User {
  id: string
  email: string
  supabaseId: string
}

interface Document {
  id: string
  userId: string
  title: string
  contentUrl?: string
  wordCount: number
  source?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  version: number
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
}

// Handle CORS preflight
function handleCORS(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }
  return null
}

// Verify Supabase JWT using jose library
async function verifyAuth(request: Request, env: Env): Promise<User | null> {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.slice(7)

  try {
    // For Supabase JWT verification in Cloudflare Workers
    // We need to use the JWT secret to verify
    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
    
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    })

    return {
      id: payload.sub as string,
      email: payload.email as string,
      supabaseId: payload.sub as string,
    }
  } catch (error) {
    console.error("JWT verification failed:", error)
    return null
  }
}

// Rate limiting check
async function checkRateLimit(kv: KVNamespace, userId: string, limit = 100): Promise<boolean> {
  const key = `rate_limit:${userId}:${Math.floor(Date.now() / 60000)}`
  const current = await kv.get(key)
  const count = current ? parseInt(current) : 0

  if (count >= limit) {
    return false
  }

  await kv.put(key, String(count + 1), { expirationTtl: 60 })
  return true
}

// Error response helper
function errorResponse(message: string, status: number = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  })
}

// JSON response helper
function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  })
}

// Main fetch handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS
    const corsResponse = handleCORS(request)
    if (corsResponse) return corsResponse

    const url = new URL(request.url)
    const path = url.pathname

    // Health check (public)
    if (path === "/api/health") {
      return jsonResponse({ status: "ok" })
    }

    // Auth required for all other routes
    const user = await verifyAuth(request, env)
    if (!user) {
      return errorResponse("Unauthorized", 401)
    }

    // Rate limiting
    const allowed = await checkRateLimit(env.CACHE, user.id)
    if (!allowed) {
      return errorResponse("Rate limited", 429)
    }

    try {
      // Route handlers
      if (path === "/api/user/profile") {
        return handleUserProfile(request, env, user)
      }

      if (path.startsWith("/api/documents")) {
        return handleDocuments(request, env, user, path)
      }

      if (path.startsWith("/api/bookmarks")) {
        return handleBookmarks(request, env, user, path)
      }

      if (path.startsWith("/api/sessions")) {
        return handleSessions(request, env, user, path)
      }

      if (path === "/api/sync/pull") {
        return handleSyncPull(request, env, user)
      }

      if (path === "/api/sync/push") {
        return handleSyncPush(request, env, user, ctx)
      }

      if (path === "/api/sync/resolve") {
        return handleSyncResolve(request, env, user)
      }

      return errorResponse("Not found", 404)
    } catch (error) {
      console.error("API Error:", error)
      return errorResponse("Internal server error", 500)
    }
  },
}

// User profile handlers
async function handleUserProfile(request: Request, env: Env, user: User): Promise<Response> {
  if (request.method === "GET") {
    const result = await env.DB.prepare(
      "SELECT id, email, created_at, updated_at FROM users WHERE id = ?"
    )
      .bind(user.id)
      .first()

    if (!result) {
      // Create user if doesn't exist
      await env.DB.prepare(
        "INSERT INTO users (id, email, supabase_id, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))"
      )
        .bind(user.id, user.email, user.supabaseId)
        .run()

      return jsonResponse({
        id: user.id,
        email: user.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        preferences: {
          default_wpm: 300,
          default_chunk_size: 1,
          theme: "system",
          auto_sync: true,
          sync_on_wifi_only: false,
        },
      })
    }

    return jsonResponse(result)
  }

  if (request.method === "PATCH") {
    const updates = await request.json()
    // Update user logic here
    return jsonResponse({ success: true })
  }

  return errorResponse("Method not allowed", 405)
}

// Documents handlers
async function handleDocuments(request: Request, env: Env, user: User, path: string): Promise<Response> {
  const docId = path.split("/")[3]

  if (request.method === "GET" && !docId) {
    // List documents
    const { results } = await env.DB.prepare(
      "SELECT id, title, word_count, source, created_at, updated_at, version FROM documents WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC"
    )
      .bind(user.id)
      .all()

    return jsonResponse({ documents: results || [] })
  }

  if (request.method === "POST" && !docId) {
    // Create document
    const data = (await request.json()) as Partial<Document>
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await env.DB.prepare(
      "INSERT INTO documents (id, user_id, title, word_count, source, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, 1)"
    )
      .bind(id, user.id, data.title || "Untitled", data.wordCount || 0, data.source || null, now, now)
      .run()

    return jsonResponse({
      id,
      user_id: user.id,
      title: data.title,
      word_count: data.wordCount,
      source: data.source,
      created_at: now,
      updated_at: now,
      version: 1,
    }, 201)
  }

  if (request.method === "GET" && docId) {
    // Get single document
    const result = await env.DB.prepare(
      "SELECT * FROM documents WHERE id = ? AND user_id = ?"
    )
      .bind(docId, user.id)
      .first()

    if (!result) {
      return errorResponse("Document not found", 404)
    }

    return jsonResponse(result)
  }

  if (request.method === "PATCH" && docId) {
    // Update document
    const updates = await request.json()
    const now = new Date().toISOString()

    await env.DB.prepare(
      "UPDATE documents SET title = ?, word_count = ?, source = ?, updated_at = ?, version = version + 1 WHERE id = ? AND user_id = ?"
    )
      .bind(
        updates.title || "Untitled",
        updates.wordCount || 0,
        updates.source || null,
        now,
        docId,
        user.id
      )
      .run()

    return jsonResponse({ success: true })
  }

  if (request.method === "DELETE" && docId) {
    // Soft delete
    const now = new Date().toISOString()

    await env.DB.prepare(
      "UPDATE documents SET deleted_at = ?, updated_at = ?, version = version + 1 WHERE id = ? AND user_id = ?"
    )
      .bind(now, now, docId, user.id)
      .run()

    return jsonResponse({ success: true })
  }

  return errorResponse("Method not allowed", 405)
}

// Bookmarks handlers
async function handleBookmarks(request: Request, env: Env, user: User, path: string): Promise<Response> {
  const bookmarkId = path.split("/")[3]

  if (request.method === "GET" && !bookmarkId) {
    const url = new URL(request.url)
    const documentId = url.searchParams.get("documentId")

    let query = "SELECT * FROM bookmarks WHERE user_id = ?"
    let params: (string | null)[] = [user.id]

    if (documentId) {
      query += " AND document_id = ?"
      params.push(documentId)
    }

    query += " ORDER BY created_at DESC"

    const { results } = await env.DB.prepare(query)
      .bind(...params)
      .all()

    return jsonResponse({ bookmarks: results || [] })
  }

  if (request.method === "POST" && !bookmarkId) {
    const data = await request.json()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await env.DB.prepare(
      "INSERT INTO bookmarks (id, user_id, document_id, position, text, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(id, user.id, data.documentId, data.position, data.text || null, data.note || null, now, now)
      .run()

    return jsonResponse({ id, user_id: user.id, ...data, created_at: now, updated_at: now }, 201)
  }

  return errorResponse("Method not allowed", 405)
}

// Sessions handlers
async function handleSessions(request: Request, env: Env, user: User, path: string): Promise<Response> {
  const sessionId = path.split("/")[3]

  if (request.method === "GET" && !sessionId) {
    const url = new URL(request.url)
    const documentId = url.searchParams.get("documentId")

    let query = "SELECT * FROM reading_sessions WHERE user_id = ?"
    let params: (string | null)[] = [user.id]

    if (documentId) {
      query += " AND document_id = ?"
      params.push(documentId)
    }

    query += " ORDER BY started_at DESC"

    const { results } = await env.DB.prepare(query)
      .bind(...params)
      .all()

    return jsonResponse({ sessions: results || [] })
  }

  if (request.method === "POST" && !sessionId) {
    const data = await request.json()
    const id = crypto.randomUUID()

    await env.DB.prepare(
      "INSERT INTO reading_sessions (id, user_id, document_id, started_at, ended_at, words_read, final_wpm, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        id,
        user.id,
        data.documentId,
        data.startedAt,
        data.endedAt || null,
        data.wordsRead || 0,
        data.finalWpm || 300,
        data.progress || 0
      )
      .run()

    // Queue analytics aggregation
    // ctx.waitUntil(...) - handled by caller

    return jsonResponse({ id, user_id: user.id, ...data }, 201)
  }

  return errorResponse("Method not allowed", 405)
}

// Sync pull handler
async function handleSyncPull(request: Request, env: Env, user: User): Promise<Response> {
  const data = await request.json()
  const checkpoint = data.checkpoint
  const limit = data.limit || 100

  // Get changes since checkpoint
  const { results: documents } = await env.DB.prepare(
    "SELECT * FROM documents WHERE user_id = ? AND updated_at > ? ORDER BY updated_at LIMIT ?"
  )
    .bind(user.id, checkpoint?.timestamp || "1970-01-01", limit)
    .all()

  const { results: bookmarks } = await env.DB.prepare(
    "SELECT * FROM bookmarks WHERE user_id = ? AND updated_at > ? ORDER BY updated_at LIMIT ?"
  )
    .bind(user.id, checkpoint?.timestamp || "1970-01-01", limit)
    .all()

  const { results: sessions } = await env.DB.prepare(
    "SELECT * FROM reading_sessions WHERE user_id = ? AND started_at > ? ORDER BY started_at LIMIT ?"
  )
    .bind(user.id, checkpoint?.timestamp || "1970-01-01", limit)
    .all()

  const newCheckpoint = {
    id: crypto.randomUUID(),
    user_id: user.id,
    device_id: data.deviceId || "unknown",
    timestamp: new Date().toISOString(),
    last_sequence: 0,
  }

  return jsonResponse({
    documents: documents || [],
    bookmarks: bookmarks || [],
    sessions: sessions || [],
    checkpoint: newCheckpoint,
    has_more: (documents?.length || 0) >= limit,
  })
}

// Sync push handler
async function handleSyncPush(request: Request, env: Env, user: User, ctx: ExecutionContext): Promise<Response> {
  const data = await request.json()
  const { documents, bookmarks, sessions, checkpoint } = data

  const conflicts: Array<{ type: string; id: string; error: string }> = []

  // Process documents in the background
  ctx.waitUntil(
    (async () => {
      for (const doc of documents || []) {
        try {
          // Check for conflicts
          const existing = await env.DB.prepare(
            "SELECT version FROM documents WHERE id = ? AND user_id = ?"
          )
            .bind(doc.id, user.id)
            .first()

          if (existing && (existing.version as number) > doc.version) {
            conflicts.push({ type: "document", id: doc.id, error: "Conflict: remote version is newer" })
            continue
          }

          // Insert or update
          await env.DB.prepare(
            `INSERT INTO documents (id, user_id, title, word_count, source, created_at, updated_at, version, deleted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             word_count = excluded.word_count,
             source = excluded.source,
             updated_at = excluded.updated_at,
             version = excluded.version,
             deleted_at = excluded.deleted_at`
          )
            .bind(doc.id, user.id, doc.title, doc.wordCount, doc.source || null, doc.createdAt, doc.updatedAt, doc.version, doc.deletedAt || null)
            .run()
        } catch (error) {
          console.error("Failed to sync document:", doc.id, error)
          conflicts.push({ type: "document", id: doc.id, error: String(error) })
        }
      }

      // Similar processing for bookmarks and sessions...
    })()
  )

  return jsonResponse({
    checkpoint: {
      id: crypto.randomUUID(),
      user_id: user.id,
      device_id: checkpoint?.deviceId || "unknown",
      timestamp: new Date().toISOString(),
      last_sequence: 0,
    },
    conflicts,
  })
}

// Sync resolve handler
async function handleSyncResolve(request: Request, env: Env, user: User): Promise<Response> {
  const data = await request.json()
  // Process conflict resolutions
  return jsonResponse({ success: true })
}
