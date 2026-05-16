# blank-api

> Official SDK for the [Blank](https://blank.o3dn.info) publishing API. Create, read, and edit web pages programmatically — from anywhere.

## Install

```bash
npm install blank-api
```

## Quick Start

```js
const { Blank, createToken } = require('blank-api');

// 1. Create a token (one-time)
const { token } = await createToken('My App', { ownerName: 'k4ran' });
console.log('Save this token:', token); // blk_abc123...

// 2. Initialize the client
const blank = new Blank(token);

// 3. Create a post
const post = await blank.createPost({
  title: 'Hello World',
  content: '<p>Published via the API!</p>',
  author: 'k4ran',
});
console.log(post.url);        // https://blank.o3dn.info/hello-world-05-17
console.log(post.edit_token); // edt_xyz789... (save this to edit later)

// 4. Read a post (no auth needed)
const fetched = await blank.getPost('hello-world-05-17');
console.log(fetched.title);   // Hello World

// 5. Edit a post
const updated = await blank.editPost('hello-world-05-17', {
  editToken: post.edit_token,
  content: '<p>Updated content!</p>',
});

// 6. List all your posts
const { posts, total } = await blank.listPosts({ page: 1, limit: 10 });

// 7. Upload an image
const imageUrl = await blank.uploadImageFromUrl('https://example.com/photo.png');

// 8. Delete a post
await blank.deletePost('hello-world-05-17', post.edit_token);
```

## Use Without the SDK

The API is standard HTTP + JSON. Use it from any language:

### cURL
```bash
# Create a token
curl -X POST https://blank.o3dn.info/api/v1/token \
  -H "Content-Type: application/json" \
  -d '{"name": "My App", "owner_name": "k4ran"}'

# Create a post
curl -X POST https://blank.o3dn.info/api/v1/post \
  -H "Authorization: Bearer blk_yourtoken" \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello", "content": "<p>World</p>"}'

# Read a post (public)
curl https://blank.o3dn.info/api/v1/post/hello-05-17
```

### Python
```python
import requests

# Create post
r = requests.post('https://blank.o3dn.info/api/v1/post',
    headers={'Authorization': 'Bearer blk_yourtoken'},
    json={'title': 'From Python', 'content': '<p>Hello!</p>'})
print(r.json()['post']['url'])
```

### Go
```go
body := strings.NewReader(`{"title":"From Go","content":"<p>Hello!</p>"}`)
req, _ := http.NewRequest("POST", "https://blank.o3dn.info/api/v1/post", body)
req.Header.Set("Authorization", "Bearer blk_yourtoken")
req.Header.Set("Content-Type", "application/json")
resp, _ := http.DefaultClient.Do(req)
```

## Utilities

```js
// Convert markdown to HTML
const html = Blank.markdownToHtml('# Hello\n\nThis is **bold** and *italic*.');

// Convert plain text to HTML paragraphs
const html2 = Blank.textToHtml('First paragraph.\n\nSecond paragraph.');
```

## API Reference

| Method | Description |
|--------|-------------|
| `createPost(data)` | Create a new post |
| `getPost(slug)` | Read a post (public, no auth) |
| `editPost(slug, data)` | Edit a post (requires edit token) |
| `deletePost(slug, editToken)` | Delete a post |
| `listPosts(options?)` | List your posts with pagination |
| `uploadImage(file, filename?)` | Upload an image file |
| `uploadImageFromUrl(url)` | Upload from a URL (bot-friendly) |
| `getPresignedUploadUrl(filename)` | Get pre-signed URL for direct upload |
| `getTokenInfo()` | Get info about your token |
| `revokeToken()` | Permanently revoke your token |

## Platform Wrappers

For bot-specific helpers, install the platform wrapper:

- **Discord:** `npm install blank-discord`
- **Telegram:** `npm install blank-telegram`
- **WhatsApp:** `npm install blank-whatsapp`

## License

MIT
