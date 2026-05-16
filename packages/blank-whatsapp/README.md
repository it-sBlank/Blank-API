# blank-whatsapp

> WhatsApp bot integration for the [Blank](https://blank.o3dn.info) publishing API. Publish posts, upload media, and format replies — for both whatsapp-web.js and Baileys.

## Install

```bash
npm install blank-whatsapp
```

## Quick Start (whatsapp-web.js)

```js
const { BlankWhatsApp } = require('blank-whatsapp');
const { Client } = require('whatsapp-web.js');

const wa = new Client();
const blank = new BlankWhatsApp('blk_yourtoken');

wa.on('message', async (msg) => {
  const parsed = BlankWhatsApp.parsePublishCommand(msg.body);
  if (!parsed) return;

  let imageHtml = '';
  if (msg.hasMedia) {
    const media = await msg.downloadMedia();
    const imageUrl = await blank.fromMedia(media.data, media.mimetype);
    imageHtml = `<img src="${imageUrl}" />`;
  }

  const post = await blank.publish({
    title: parsed.title,
    author: msg.author || msg.from.split('@')[0],
    content: imageHtml + parsed.content,
  });

  await msg.reply(blank.formatReply(post));
});
```

## Quick Start (Baileys)

```js
const { BlankWhatsApp } = require('blank-whatsapp');
const blank = new BlankWhatsApp('blk_yourtoken');

// Inside message handler
const buffer = await downloadMediaMessage(msg, 'buffer', {});
const imageUrl = await blank.fromMediaBuffer(buffer, 'photo.jpg');

const post = await blank.publish({
  title: 'Photo Post',
  content: `<img src="${imageUrl}" />`,
});
```

## Features

| Method | Description |
|--------|-------------|
| `publish(data)` | Create a post (auto-sets source to "whatsapp") |
| `waTextToHtml(text)` | Convert WA formatting (*bold*, _italic_, ~strike~) to HTML |
| `fromMedia(base64, mime)` | Upload WA media (whatsapp-web.js) |
| `fromMediaBuffer(buffer)` | Upload WA media (Baileys) |
| `formatReply(post)` | Format a rich WA reply |
| `formatPostCard(post)` | Generate a card-style post summary |
| `parsePublishCommand(body)` | Parse `!publish` command from message |

## License

MIT
