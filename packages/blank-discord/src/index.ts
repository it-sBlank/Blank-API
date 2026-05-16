import { Blank, BlankPost, CreatePostInput, BlankOptions } from 'blank-api'

// Re-export core types
export { BlankPost, CreatePostInput, BlankOptions, BlankError } from 'blank-api'

/**
 * Discord.js integration for the Blank publishing API.
 * Extends the core Blank client with Discord-specific helpers.
 */
export class BlankDiscord extends Blank {
  constructor(token: string, options?: BlankOptions) {
    super(token, options)
  }

  /**
   * Publish a post — alias for createPost with nicer API.
   */
  async publish(data: CreatePostInput): Promise<BlankPost> {
    return this.createPost({ ...data, source: data.source || 'discord' })
  }

  /**
   * Convert a Blank post into a Discord.js EmbedBuilder-compatible plain object.
   * Works with both discord.js v14 EmbedBuilder and raw API embed objects.
   *
   * Usage:
   * ```js
   * const embed = blank.toEmbed(post);
   * await interaction.reply({ embeds: [embed] });
   * ```
   */
  toEmbed(post: BlankPost, options?: {
    color?: number
    footerText?: string
    thumbnailUrl?: string
  }): Record<string, unknown> {
    return {
      title: post.title,
      url: post.url,
      description: post.content
        ? BlankDiscord.htmlToPlainText(post.content).substring(0, 300) + '...'
        : undefined,
      color: options?.color ?? 0x1a1a2e,
      fields: [
        ...(post.author ? [{ name: '✍️ Author', value: post.author, inline: true }] : []),
        { name: '🔗 Link', value: `[View Post](${post.url})`, inline: true },
      ],
      footer: {
        text: options?.footerText ?? '📄 Published with Blank',
      },
      timestamp: post.created_at,
      ...(options?.thumbnailUrl ? { thumbnail: { url: options.thumbnailUrl } } : {}),
    }
  }

  /**
   * Extract post data from a Discord message.
   * First line becomes the title, rest becomes content.
   */
  fromMessage(messageContent: string): { title: string; content: string } {
    const lines = messageContent.split('\n')
    const title = lines[0]?.trim() || 'Untitled'
    const rest = lines.slice(1).join('\n').trim()
    const content = rest ? BlankDiscord.discordMarkdownToHtml(rest) : '<p></p>'
    return { title, content }
  }

  /**
   * Upload a Discord attachment to Blank and return the public URL.
   * Pass the attachment URL directly — Blank will download and re-host it.
   */
  async fromAttachment(attachmentUrl: string): Promise<string> {
    return this.uploadImageFromUrl(attachmentUrl)
  }

  /**
   * Convert Discord markdown to HTML.
   */
  static discordMarkdownToHtml(text: string): string {
    let html = text
      // Bold + italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic (single asterisk)
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Italic (underscore)
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Strikethrough
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Code blocks
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Block quotes
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

    // Paragraphs
    html = html
      .split('\n\n')
      .map(block => {
        const trimmed = block.trim()
        if (!trimmed) return ''
        if (/^<(h[1-6]|pre|blockquote|ul|ol)/.test(trimmed)) return trimmed
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`
      })
      .filter(Boolean)
      .join('\n')

    return html
  }

  /**
   * Strip HTML tags and return plain text. Useful for embed descriptions.
   */
  static htmlToPlainText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
}

export default BlankDiscord
