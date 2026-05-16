# blank-discord

> Discord.js integration for the [Blank](https://blank.o3dn.info) publishing API. Publish posts, generate rich embeds, and upload attachments — all from your Discord bot.

## Install

```bash
npm install blank-discord discord.js
```

## Quick Start

```js
const { BlankDiscord } = require('blank-discord');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const blank = new BlankDiscord('blk_yourtoken');

// Slash command: /publish
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'publish') return;

  const title = interaction.options.getString('title');
  const content = interaction.options.getString('content');

  const post = await blank.publish({
    title,
    author: interaction.user.username,
    content: BlankDiscord.discordMarkdownToHtml(content),
  });

  // Reply with a rich embed
  await interaction.reply({ embeds: [blank.toEmbed(post)] });
});
```

## Features

| Method | Description |
|--------|-------------|
| `publish(data)` | Create a post (auto-sets source to "discord") |
| `toEmbed(post)` | Convert a post to a Discord embed object |
| `fromMessage(text)` | Parse message text into title + content |
| `fromAttachment(url)` | Upload a Discord attachment to Blank |
| `discordMarkdownToHtml(text)` | Convert Discord markdown to HTML |
| `htmlToPlainText(html)` | Strip HTML to plain text (for embed descriptions) |

*Plus all methods from `blank-api` (createPost, getPost, editPost, etc.)*

## License

MIT
