import { Blank, BlankPost, CreatePostInput, BlankOptions } from 'blank-api'

// Re-export core types
export { BlankPost, CreatePostInput, BlankOptions, BlankError } from 'blank-api'

/**
 * Telegram entity types (subset used for HTML conversion).
 */
interface TelegramEntity {
  type: string
  offset: number
  length: number
  url?: string
  language?: string
}

/**
 * Telegram bot integration for the Blank publishing API.
 * Works with both Telegraf and node-telegram-bot-api.
 */
export class BlankTelegram extends Blank {
  private botToken?: string

  constructor(blankToken: string, options?: BlankOptions & { botToken?: string }) {
    super(blankToken, options)
    this.botToken = options?.botToken
  }

  /**
   * Publish a post — alias for createPost with Telegram source.
   */
  async publish(data: CreatePostInput): Promise<BlankPost> {
    return this.createPost({ ...data, source: data.source || 'telegram' })
  }

  /**
   * Generate a Telegram inline keyboard with a "View Post" button.
   *
   * Usage with Telegraf:
   * ```js
   * await ctx.reply('Published!', { reply_markup: blank.toInlineKeyboard(post) });
   * ```
   *
   * Usage with node-telegram-bot-api:
   * ```js
   * bot.sendMessage(chatId, 'Published!', { reply_markup: blank.toInlineKeyboard(post) });
   * ```
   */
  toInlineKeyboard(post: BlankPost, options?: {
    buttonText?: string
    showEditToken?: boolean
  }): { inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>> } {
    const buttons: Array<Array<{ text: string; url?: string; callback_data?: string }>> = [
      [{ text: options?.buttonText ?? `📄 Read: ${post.title}`, url: post.url }],
    ]

    if (options?.showEditToken && post.edit_token) {
      buttons.push([
        { text: '✏️ Copy Edit Token', callback_data: `edit_token:${post.edit_token}` },
      ])
    }

    return { inline_keyboard: buttons }
  }

  /**
   * Format a reply message for Telegram (MarkdownV2).
   */
  formatReply(post: BlankPost): string {
    const title = BlankTelegram.escapeMd(post.title)
    const url = post.url
    const author = post.author ? `\n✍️ *Author:* ${BlankTelegram.escapeMd(post.author)}` : ''
    return `📄 *${title}*${author}\n🔗 [View Post](${url})`
  }

  /**
   * Upload a Telegram photo by file_id. Requires botToken in constructor options.
   *
   * Usage:
   * ```js
   * const blank = new BlankTelegram('blk_...', { botToken: 'your-bot-token' });
   * const url = await blank.fromPhoto(ctx.message.photo);
   * ```
   */
  async fromPhoto(photos: Array<{ file_id: string; width: number; height: number }>): Promise<string> {
    if (!this.botToken) {
      throw new Error('botToken is required in constructor options to download Telegram photos')
    }

    // Use the largest photo (last in array)
    const largest = photos[photos.length - 1]
    if (!largest) throw new Error('No photo provided')

    // Get file path from Telegram API
    const fileRes = await fetch(`https://api.telegram.org/bot${this.botToken}/getFile?file_id=${largest.file_id}`)
    const fileData = await fileRes.json() as { ok: boolean; result: { file_path: string } }

    if (!fileData.ok) throw new Error('Failed to get file from Telegram')

    const telegramFileUrl = `https://api.telegram.org/file/bot${this.botToken}/${fileData.result.file_path}`

    // Upload to Blank via URL
    return this.uploadImageFromUrl(telegramFileUrl)
  }

  /**
   * Convert Telegram message text + entities to HTML.
   *
   * Usage:
   * ```js
   * const html = BlankTelegram.entitiesToHtml(ctx.message.text, ctx.message.entities);
   * ```
   */
  static entitiesToHtml(text: string, entities?: TelegramEntity[]): string {
    if (!entities || entities.length === 0) {
      return Blank.textToHtml(text)
    }

    // Sort entities by offset (reverse to avoid offset shifting)
    const sorted = [...entities].sort((a, b) => b.offset - a.offset)
    let result = text

    for (const entity of sorted) {
      const before = result.substring(0, entity.offset)
      const content = result.substring(entity.offset, entity.offset + entity.length)
      const after = result.substring(entity.offset + entity.length)

      let replacement: string
      switch (entity.type) {
        case 'bold':
          replacement = `<strong>${content}</strong>`
          break
        case 'italic':
          replacement = `<em>${content}</em>`
          break
        case 'underline':
          replacement = `<u>${content}</u>`
          break
        case 'strikethrough':
          replacement = `<del>${content}</del>`
          break
        case 'code':
          replacement = `<code>${content}</code>`
          break
        case 'pre':
          replacement = entity.language
            ? `<pre><code class="language-${entity.language}">${content}</code></pre>`
            : `<pre>${content}</pre>`
          break
        case 'text_link':
          replacement = `<a href="${/^https?:\/\//i.test(entity.url || '') ? entity.url : '#'}">${content}</a>`
          break
        case 'url':
          replacement = `<a href="${content}">${content}</a>`
          break
        default:
          replacement = content
      }

      result = before + replacement + after
    }

    // Wrap in paragraphs
    return result
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
      .join('\n')
  }

  /**
   * Escape special characters for Telegram MarkdownV2.
   */
  static escapeMd(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1')
  }
}

export default BlankTelegram
