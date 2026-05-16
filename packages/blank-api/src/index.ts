// ── Types ──

export interface BlankOptions {
  /** Base URL of your Blank instance. Default: https://blank.o3dn.info */
  baseUrl?: string
  /** Request timeout in ms. Default: 10000 */
  timeout?: number
  /** Number of retries on failure. Default: 2 */
  retries?: number
}

export interface TokenInfo {
  name: string
  owner_name: string | null
  post_count: number
  created_at: string
  last_used_at: string | null
}

export interface CreatePostInput {
  title: string
  content: string
  author?: string
  source?: string
}

export interface EditPostInput {
  editToken: string
  title?: string
  content?: string
  author?: string
}

export interface BlankPost {
  slug: string
  title: string
  author: string | null
  url: string
  edit_token?: string
  content?: string
  source?: string | null
  created_at: string
  updated_at?: string
}

export interface ListPostsOptions {
  page?: number
  limit?: number
}

export interface ListPostsResult {
  posts: BlankPost[]
  total: number
  page: number
  limit: number
}

export interface PresignedUrl {
  upload_url: string
  key: string
  public_url: string
  expires_in: number
}

export interface ApiResponse<T = Record<string, unknown>> {
  ok: boolean
  error?: string
  code?: string
  [key: string]: unknown
}

// ── Error class ──

export class BlankError extends Error {
  public code: string
  public status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'BlankError'
    this.code = code
    this.status = status
  }
}

// ── Main Client ──

export class Blank {
  private token: string
  private baseUrl: string
  private timeout: number
  private retries: number

  constructor(token: string, options?: BlankOptions) {
    if (!token || !token.startsWith('blk_')) {
      throw new Error('Invalid Blank API token. Tokens must start with "blk_"')
    }
    this.token = token
    this.baseUrl = (options?.baseUrl || 'https://blank.o3dn.info').replace(/\/$/, '')
    this.timeout = options?.timeout || 10000
    this.retries = options?.retries ?? 2
  }

  // ── Internal HTTP client ──

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown
      headers?: Record<string, string>
      noAuth?: boolean
    }
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`
    const headers: Record<string, string> = {
      ...options?.headers,
    }

    if (!options?.noAuth) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    if (options?.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const response = await fetch(url, {
          method,
          headers,
          body: options?.body
            ? options.body instanceof FormData
              ? options.body
              : JSON.stringify(options.body)
            : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const data = await response.json() as ApiResponse<T>

        if (!data.ok) {
          throw new BlankError(
            data.error || 'Unknown error',
            data.code || 'UNKNOWN',
            response.status
          )
        }

        return data as T
      } catch (err) {
        lastError = err as Error

        // Don't retry on client errors (4xx)
        if (err instanceof BlankError && err.status >= 400 && err.status < 500) {
          throw err
        }

        // Wait before retry with exponential backoff
        if (attempt < this.retries) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 200))
        }
      }
    }

    throw lastError || new Error('Request failed')
  }

  // ── Token ──

  /** Get info about your API token. */
  async getTokenInfo(): Promise<TokenInfo> {
    const res = await this.request<ApiResponse>('GET', '/token')
    return {
      name: res.name as string,
      owner_name: res.owner_name as string | null,
      post_count: res.post_count as number,
      created_at: res.created_at as string,
      last_used_at: res.last_used_at as string | null,
    }
  }

  /** Revoke your API token. This action is irreversible. */
  async revokeToken(): Promise<void> {
    await this.request('DELETE', '/token')
  }

  // ── Posts ──

  /** Create a new post and publish it to the web. */
  async createPost(data: CreatePostInput): Promise<BlankPost> {
    const res = await this.request<ApiResponse>('POST', '/post', { body: data })
    return res.post as BlankPost
  }

  /** Get a post by its slug. No authentication required. */
  async getPost(slug: string): Promise<BlankPost> {
    const res = await this.request<ApiResponse>('GET', `/post/${encodeURIComponent(slug)}`, {
      noAuth: true,
    })
    return res.post as BlankPost
  }

  /** Edit an existing post. Requires the per-post edit token. */
  async editPost(slug: string, data: EditPostInput): Promise<BlankPost> {
    const { editToken, ...body } = data
    const res = await this.request<ApiResponse>('PATCH', `/post/${encodeURIComponent(slug)}`, {
      body,
      headers: { 'X-Edit-Token': editToken },
    })
    return res.post as BlankPost
  }

  /** Delete a post. Requires the per-post edit token. */
  async deletePost(slug: string, editToken: string): Promise<void> {
    await this.request('DELETE', `/post/${encodeURIComponent(slug)}`, {
      headers: { 'X-Edit-Token': editToken },
    })
  }

  /** List all posts created with this token. */
  async listPosts(options?: ListPostsOptions): Promise<ListPostsResult> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await this.request<ApiResponse>('GET', `/post${qs}`)
    return {
      posts: res.posts as BlankPost[],
      total: res.total as number,
      page: res.page as number,
      limit: res.limit as number,
    }
  }

  // ── Image Upload ──

  /** Upload an image from a Buffer or Blob. Returns the public URL. */
  async uploadImage(file: Blob | Buffer | Uint8Array, filename?: string): Promise<string> {
    const formData = new FormData()

    if (file instanceof Blob) {
      formData.append('file', file, filename || 'image.png')
    } else {
      // Buffer or Uint8Array — convert to Blob
      const blob = new Blob([new Uint8Array(file)])
      formData.append('file', blob, filename || 'image.png')
    }

    const res = await this.request<ApiResponse>('POST', '/upload', {
      body: formData,
    })
    return res.url as string
  }

  /** Upload an image from a URL. The server will download and re-host it. Great for bots. */
  async uploadImageFromUrl(url: string): Promise<string> {
    const res = await this.request<ApiResponse>('POST', '/upload/url', {
      body: { url },
    })
    return res.url as string
  }

  /** Get a pre-signed URL for direct-to-R2 upload (bypasses server size limits). */
  async getPresignedUploadUrl(filename: string, contentType?: string): Promise<PresignedUrl> {
    const params = new URLSearchParams({ filename })
    if (contentType) params.set('contentType', contentType)
    const res = await this.request<ApiResponse>('GET', `/upload/presign?${params.toString()}`)
    return {
      upload_url: res.upload_url as string,
      key: res.key as string,
      public_url: res.public_url as string,
      expires_in: res.expires_in as number,
    }
  }

  // ── Static Utilities ──

  /** Convert plain text to simple HTML paragraphs. */
  static textToHtml(text: string): string {
    return text
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${Blank.escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
      .join('\n')
  }

  /** Convert basic markdown to HTML. */
  static markdownToHtml(md: string): string {
    let html = md
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold & italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Strikethrough
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      // Code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
      // Horizontal rules
      .replace(/^---$/gm, '<hr>')

    // Paragraphs: wrap remaining text blocks
    html = html
      .split('\n\n')
      .map(block => {
        const trimmed = block.trim()
        if (!trimmed) return ''
        if (/^<(h[1-6]|hr|img|ul|ol|blockquote|pre)/.test(trimmed)) return trimmed
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`
      })
      .filter(Boolean)
      .join('\n')

    return html
  }

  /** Escape HTML special characters. */
  static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}

// ── Token creation helper (no auth needed) ──

/**
 * Create a new Blank API token. This is the only function that doesn't require an existing token.
 */
export async function createToken(
  name: string,
  options?: { ownerName?: string; baseUrl?: string }
): Promise<{ token: string; name: string; owner_name: string | null; created_at: string }> {
  const baseUrl = (options?.baseUrl || 'https://blank.o3dn.info').replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, owner_name: options?.ownerName }),
  })
  const data = await response.json()
  if (!data.ok) throw new BlankError(data.error, data.code, response.status)
  return data
}

// ── Default export ──
export default Blank
