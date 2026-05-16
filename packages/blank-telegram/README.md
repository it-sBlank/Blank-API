# blank-telegram

> Telegram bot integration for the [Blank](https://blank.o3dn.info) publishing API. Publish posts, generate inline keyboards, parse entities, and upload photos.

## Install

```bash
npm install blank-telegram
```

## Quick Start (Telegraf)

```js
const { BlankTelegram } = require('blank-telegram');
const { Telegraf } = require('telegraf');

const bot = new Telegraf('your-telegram-bot-token');
const blank = new BlankTelegram('blk_yourtoken', {
  botToken: 'your-telegram-bot-token',
});

// /publish command
bot.command('publish', async (ctx) => {
  const text = ctx.message.text.replace('/publish ', '');
  const [title, ...rest] = text.split('\n');

  const post = await blank.publish({
    title: title || 'Untitled',
    author: ctx.from.first_name,
    content: BlankTelegram.entitiesToHtml(rest.join('\n'), ctx.message.entities),
  });

  await ctx.reply(blank.formatReply(post), {
    parse_mode: 'MarkdownV2',
    reply_markup: blank.toInlineKeyboard(post),
  });
});

// Publish photos
bot.on('photo', async (ctx) => {
  const url = await blank.fromPhoto(ctx.message.photo);
  const post = await blank.publish({
    title: ctx.message.caption || 'Photo',
    author: ctx.from.first_name,
    content: `<img src="${url}" /><p>${ctx.message.caption || ''}</p>`,
  });
  await ctx.reply(`📄 ${post.url}`);
});
```

## Features

| Method | Description |
|--------|-------------|
| `publish(data)` | Create a post (auto-sets source to "telegram") |
| `toInlineKeyboard(post)` | Generate a "View Post" inline button |
| `formatReply(post)` | Format a MarkdownV2 reply message |
| `fromPhoto(photos)` | Upload a Telegram photo to Blank |
| `entitiesToHtml(text, entities)` | Convert Telegram entities to HTML |
| `escapeMd(text)` | Escape text for MarkdownV2 |

## License

MIT
