import { Blank, BlankPost, CreatePostInput, BlankOptions } from 'blank-api'

// Re-export core types
export { BlankPost, CreatePostInput, BlankOptions, BlankError } from 'blank-api'

/**
 * WhatsApp bot integration for the Blank publishing API.
 * Works with both whatsapp-web.js and Baileys.
 */
export class BlankWhatsApp extends Blank {
  constructor(token: string, options?: BlankOptions) {
    super(token, options)
  }

  /**
   * Publish a post — alias for createPost with WhatsApp source.
   */
  async publish(data: CreatePostInput): Promise<BlankPost> {
    return this.createPost({ ...data, source: data.source || 'whatsapp' })
  }

  /**
   * Convert WhatsApp formatted text to HTML.
   * Supports: *bold*, _italic_, ~strikethrough~, ```code```
   */
  static waTextToHtml(text: string): string {
    let html = text
      // Code blocks (triple backticks)
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Bold
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      // Strikethrough
      .replace(/~([^~]+)~/g, '<del>$1</del>')
      // Inline code (single backtick)
      .replace(/`([^`]+)`/g, '<code>$1</code>')

    // Wrap in paragraphs
    html = html
      .split('\n\n')
      .filter(p => p.trim())
      .map(block => {
        const trimmed = block.trim()
        if (/^<(pre|h[1-6])/.test(trimmed)) return trimmed
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`
      })
      .filter(Boolean)
      .join('\n')

    return html
  }

  /**
   * Upload WhatsApp media (from base64 data).
   * Works with whatsapp-web.js MessageMedia objects.
   *
   * Usage with whatsapp-web.js:
   * ```js
   * const media = await msg.downloadMedia();
   * const url = await blank.fromMedia(media.data, media.mimetype, media.filename);
   * ```
   *
   * Usage with Baileys:
   * ```js
   * const buffer = await downloadMediaMessage(msg, 'buffer', {});
   * const url = await blank.fromMediaBuffer(buffer, 'image.jpg');
   * ```
   */
  async fromMedia(base64Data: string, mimetype: string, filename?: string): Promise<string> {
    const binaryStr = atob(base64Data)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: mimetype })
    const ext = mimetype.split('/')[1] || 'png'
    return this.uploadImage(blob, filename || `media.${ext}`)
  }

  /**
   * Upload media from a Buffer (Baileys / Node.js).
   */
  async fromMediaBuffer(buffer: Buffer | Uint8Array, filename?: string): Promise<string> {
    const blob = new Blob([new Uint8Array(buffer)])
    return this.uploadImage(blob, filename || 'media.png')
  }

  /**
   * Format a rich WhatsApp reply for a published post.
   * Uses WhatsApp's native formatting (*bold*, _italic_).
   *
   * Returns:
   * ```
   * 📄 *My Post Title*
   * ✍️ _by Author_
   *
   * 🔗 https://blank.o3dn.info/my-post-05-17
   *
   * ✏️ Edit token: edt_abc123
   * ```
   */
  formatReply(post: BlankPost, options?: {
    showEditToken?: boolean
    showAuthor?: boolean
  }): string {
    const lines: string[] = []

    lines.push(`📄 *${post.title}*`)

    if ((options?.showAuthor ?? true) && post.author) {
      lines.push(`✍️ _by ${post.author}_`)
    }

    lines.push('')
    lines.push(`🔗 ${post.url}`)

    if ((options?.showEditToken ?? true) && post.edit_token) {
      lines.push('')
      lines.push(`✏️ Edit token: \`${post.edit_token}\``)
    }

    return lines.join('\n')
  }

  /**
   * Parse a WhatsApp message into post data.
   * Expects format:
   * ```
   * !publish Title Here
   * Content goes here...
   * More content...
   * ```
   */
  static parsePublishCommand(messageBody: string, prefix = '!publish'): {
    title: string
    content: string
  } | null {
    if (!messageBody.startsWith(prefix)) return null

    const text = messageBody.slice(prefix.length).trim()
    if (!text) return null

    const lines = text.split('\n')
    const title = lines[0]?.trim() || 'Untitled'
    const rest = lines.slice(1).join('\n').trim()
    const content = rest ? BlankWhatsApp.waTextToHtml(rest) : '<p></p>'

    return { title, content }
  }

  /**
   * Generate a vCard-like formatted post info for sharing.
   */
  formatPostCard(post: BlankPost): string {
    const divider = '━'.repeat(25)
    const lines = [
      divider,
      `📄 *${post.title}*`,
    ]
    if (post.author) lines.push(`✍️ ${post.author}`)
    lines.push('')
    lines.push(`🔗 ${post.url}`)
    lines.push(`📅 ${new Date(post.created_at).toLocaleDateString()}`)
    lines.push(divider)
    lines.push('_Published with Blank_')
    return lines.join('\n')
  }
}

export default BlankWhatsApp
