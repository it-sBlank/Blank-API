<div align="center">
  <img src="https://blank.o3dn.info/logo.svg" alt="Blank Logo" width="100" />
  <h1>Blank Universal API & SDKs</h1>
  <p><strong>A blazing-fast, edge-ready publishing API & SDK ecosystem for Discord, Telegram, WhatsApp, and the Web.</strong></p>

  <a href="https://www.npmjs.com/package/blank-api"><img src="https://img.shields.io/npm/v/blank-api?style=flat-square&color=blue" alt="npm version" /></a>
  <a href="https://blank.o3dn.info/docs"><img src="https://img.shields.io/badge/Docs-Live-success?style=flat-square" alt="Docs" /></a>
  <a href="https://github.com/k4ran909/Blank-API/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License" /></a>
</div>

---

## ⚡ What is Blank API?

**Blank** is a minimalist publishing platform that allows you to create richly formatted posts, articles, and pages and push them to the Web in milliseconds.

The **Blank API** allows bots, scripts, and applications to programmatically publish to Blank. This repository holds the official TypeScript/Node.js SDKs, designed to make integrating Blank into your favorite platform effortless.

### 🌟 Features
- **Zero Dependencies** (Core SDK uses native `fetch`).
- **Cross-Platform**: Works in Node.js, Bun, Deno, and the Browser.
- **Auto-Retry & Backoff**: Built-in exponential backoff for rate limits.
- **Image Hosting**: Direct uploads to Cloudflare R2 via presigned URLs or standard multipart.
- **Platform Wrappers**: First-class support for Discord, Telegram, and WhatsApp bots.

---

## 📦 The Ecosystem

This monorepo contains 4 official packages:

| Package | Version | Description |
|---------|---------|-------------|
| [`blank-api`](./packages/blank-api) | [![npm](https://img.shields.io/npm/v/blank-api?style=flat-square)](https://www.npmjs.com/package/blank-api) | The core REST API client. Platform agnostic. |
| [`blank-discord`](./packages/blank-discord) | [![npm](https://img.shields.io/npm/v/blank-discord?style=flat-square)](https://www.npmjs.com/package/blank-discord) | Discord.js helpers (Embeds, CDN image rehosting). |
| [`blank-telegram`](./packages/blank-telegram) | [![npm](https://img.shields.io/npm/v/blank-telegram?style=flat-square)](https://www.npmjs.com/package/blank-telegram) | Telegram Bot API helpers (Inline Keyboards, Entity parsing). |
| [`blank-whatsapp`](./packages/blank-whatsapp) | [![npm](https://img.shields.io/npm/v/blank-whatsapp?style=flat-square)](https://www.npmjs.com/package/blank-whatsapp) | whatsapp-web.js & Baileys helpers (Text parsing, Buffers). |

---

## 🚀 Quick Start

### 1. Install the Core SDK
```bash
npm install blank-api
```

### 2. Create an API Token
You can create a token directly from the code. You only need to do this once.
```typescript
import { createToken } from 'blank-api';

// Create a new token for your application
const { token } = await createToken('https://blank.o3dn.info/api/v1/token', 'My Cool Bot', 'OwnerName');
console.log('Save this token:', token);
```

### 3. Publish a Post
```typescript
import { Blank } from 'blank-api';

const blank = new Blank('blk_your_token_here');

const post = await blank.createPost({
  title: 'Hello World',
  content: '<p>This was published programmatically!</p>',
  author: 'My Cool Bot'
});

console.log('Post published at:', post.url);
```

---

## 🛠️ Platform Wrappers

Blank makes it incredibly easy to build "Publish" commands for your Discord, Telegram, or WhatsApp bots. Our platform-specific SDKs handle the heavy lifting of converting platform-specific markdown into HTML.

### 🔵 Discord Example
```bash
npm install blank-discord
```
```typescript
import { BlankDiscord } from 'blank-discord';

const blank = new BlankDiscord('blk_your_token');

// Convert Discord markdown to HTML automatically
const post = await blank.publish({
  title: 'Server Rules',
  content: '**1.** Be kind\\n**2.** No spamming'
});

// Easily send the result back as a beautiful Discord Embed
await interaction.reply({
  embeds: [blank.toEmbed(post)]
});
```

### ✈️ Telegram Example
```bash
npm install blank-telegram
```
```typescript
import { BlankTelegram } from 'blank-telegram';

const blank = new BlankTelegram('blk_your_token', { botToken: process.env.TELEGRAM_TOKEN });

const post = await blank.publish({
  title: 'Announcements',
  content: '<p>Bot update v2.0 is live!</p>'
});

// Reply with an inline button that links to the post
await ctx.reply('Post published!', {
  reply_markup: blank.toInlineKeyboard(post)
});
```

### 🟢 WhatsApp Example
```bash
npm install blank-whatsapp
```
```typescript
import { BlankWhatsApp } from 'blank-whatsapp';

const blank = new BlankWhatsApp('blk_your_token');

// Parse a message like "!publish My Title \n Content here..."
const parsed = BlankWhatsApp.parsePublishCommand(msg.body);
if (parsed) {
  const post = await blank.publish(parsed);
  // Send a beautifully formatted native WhatsApp reply
  await msg.reply(blank.formatReply(post));
}
```

---

## 📚 Documentation & Reference

For the full REST API documentation, HTTP status codes, error handling, and rate limits, please visit our official docs:

👉 **[https://blank.o3dn.info/docs](https://blank.o3dn.info/docs)**

### API Rate Limits
- **Post creation:** 30 per hour
- **Post editing:** 60 per hour
- **Image uploads:** 20 per hour
- **Reading posts:** 300 per minute (per IP)

---

## 🤝 Contributing

We welcome contributions! This monorepo uses `tsup` for lightning-fast bundling.

1. Clone the repository
2. Run `npm install` in the specific package directory
3. Run `npm run build` to compile the package
4. Submit a Pull Request

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
