# @fastify/sse

[![NPM Version](https://img.shields.io/npm/v/@fastify/sse.svg)](https://npmjs.org/package/@fastify/sse)
[![CI](https://github.com/fastify/sse/workflows/CI/badge.svg)](https://github.com/fastify/sse/actions)

Server-Sent Events plugin for Fastify. Provides first-class SSE support with clean API integration, session management, and streaming capabilities.

## Features

- 🚀 **Clean API**: Route-level SSE support with `{ sse: true }`
- 📡 **Streaming**: Native support for Node.js streams and async iterators
- 🔄 **Reconnection**: Built-in message replay with `Last-Event-ID`
- 💓 **Heartbeat**: Configurable keep-alive mechanism
- 🎯 **Lifecycle**: Full integration with Fastify hooks and error handling
- 📝 **TypeScript**: Complete type definitions included
- ⚡ **Performance**: Efficient backpressure handling

## Install

```bash
npm i @fastify/sse
```

## Quick Start

```js
const fastify = require("fastify")({ logger: true });

// Register the plugin
await fastify.register(require("@fastify/sse"));

// Create an SSE endpoint
fastify.get("/events", { sse: true }, async (request, reply) => {
    // Send a message
    await reply.sse.send({ data: "Hello SSE!" });

    // Send with full options
    await reply.sse.send({
        id: "123",
        event: "update",
        data: { message: "Hello World" },
        retry: 1000,
    });
});

await fastify.listen({ port: 3000 });
```

## API

### Plugin Registration

```js
await fastify.register(require("@fastify/sse"), {
    // Optional: heartbeat interval in milliseconds (default: 30000)
    heartbeatInterval: 30000,

    // Optional: default serializer (default: JSON.stringify)
    serializer: (data) => JSON.stringify(data),
});
```

### Route Configuration

```js
// Enable SSE for a route
fastify.get("/events", { sse: true }, handler);

// With options
fastify.get(
    "/events",
    {
        sse: {
            heartbeat: false, // Disable heartbeat for this route
            serializer: customSerializer, // Custom serializer for this route
        },
    },
    handler,
);
```

### reply.sse.send(source)

Send SSE messages. Accepts various source types:

#### Single Message

```js
// Simple data
await reply.sse.send({ data: "hello" });

// Full SSE message
await reply.sse.send({
    id: "123",
    event: "update",
    data: { message: "Hello" },
    retry: 1000,
});

// Plain string
await reply.sse.send("plain text message");
```

#### Streaming Sources

```js
// Async generator
async function* generateEvents() {
    for (let i = 0; i < 10; i++) {
        yield { id: i, data: `Event ${i}` };
        await sleep(1000);
    }
}
await reply.sse.send(generateEvents());

// Node.js Readable stream
const stream = fs.createReadStream("data.jsonl");
await reply.sse.send(stream);

// Transform existing stream
const transformStream = new Transform({
    transform(chunk, encoding, callback) {
        callback(null, { data: chunk.toString() });
    },
});
someSource.pipe(transformStream);
await reply.sse.send(transformStream);
```

### reply.sse.stream()

Create a transform stream for use in pipeline operations:

```js
// Use with pipeline for efficient streaming
const { pipeline } = require("stream/promises");
const fs = require("fs");

fastify.get("/file-stream", { sse: true }, async (request, reply) => {
    const fileStream = fs.createReadStream("data.jsonl");

    // Parse each line as JSON and convert to SSE format
    const parseTransform = new Transform({
        transform(chunk, encoding, callback) {
            const lines = chunk.toString().split("\n").filter(Boolean);
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    this.push({ id: data.id, data });
                } catch (err) {
                    // Skip invalid JSON lines
                }
            }
            callback();
        },
    });

    // Stream file data through SSE
    await pipeline(fileStream, parseTransform, reply.sse.stream(), reply.raw, {
        end: false,
    });
});
```

### Connection Management

```js
fastify.get("/live", { sse: true }, async (request, reply) => {
    // Keep connection alive (prevents automatic close)
    reply.sse.keepAlive();

    // Send initial message
    await reply.sse.send({ data: "Connected" });

    // Check if keepAlive was called
    console.log("Keep alive status:", reply.sse.shouldKeepAlive); // true

    // Set up periodic updates
    const interval = setInterval(async () => {
        if (reply.sse.isConnected) {
            await reply.sse.send({ data: "ping" });
        } else {
            clearInterval(interval);
        }
    }, 1000);

    // Clean up when connection closes
    reply.sse.onClose(() => {
        clearInterval(interval);
        console.log("Connection closed");
    });
});
```

### Message Replay

Handle client reconnections with `Last-Event-ID`:

```js
const messageHistory = [];

fastify.get("/events", { sse: true }, async (request, reply) => {
    // Handle replay on reconnection
    await reply.sse.replay(async (lastEventId) => {
        // Find messages after the last received ID
        const startIndex = messageHistory.findIndex(
            (msg) => msg.id === lastEventId,
        );
        const messagesToReplay =
            startIndex !== -1
                ? messageHistory.slice(startIndex + 1)
                : messageHistory;

        // Send missed messages
        for (const message of messagesToReplay) {
            await reply.sse.send(message);
        }
    });

    // Send new message
    const newMessage = { id: Date.now(), data: "New event" };
    messageHistory.push(newMessage);
    await reply.sse.send(newMessage);
});
```

### Properties and Methods

#### Properties

- `reply.sse.lastEventId`: Client's last received event ID (string | null)
- `reply.sse.isConnected`: Connection status (boolean)
- `reply.sse.shouldKeepAlive`: Whether connection should be kept alive after handler completion (boolean)

#### Methods

- `reply.sse.send(source)`: Send SSE messages from various source types
- `reply.sse.stream()`: Create a transform stream for pipeline operations
- `reply.sse.keepAlive()`: Prevent connection from auto-closing after handler returns
- `reply.sse.close()`: Manually close the connection
- `reply.sse.replay(callback)`: Handle message replay using Last-Event-ID
- `reply.sse.onClose(callback)`: Register callback for when connection closes
- `reply.sse.sendHeaders()`: Manually send headers (called automatically on first write)

## Advanced Usage

### Fallback to Regular Responses

Routes with `{ sse: true }` automatically fall back to regular handlers when the client doesn't request SSE:

```js
fastify.get("/data", { sse: true }, async (request, reply) => {
    const data = await getData();

    // Check if this is an SSE request
    if (request.headers.accept?.includes("text/event-stream")) {
        // SSE client - stream the data
        await reply.sse.send({ data });
    } else {
        // Regular client - return JSON
        return { data };
    }
});
```

### Error Handling

```js
fastify.get("/stream", { sse: true }, async (request, reply) => {
    try {
        async function* riskyGenerator() {
            yield { data: "before error" };
            throw new Error("Something went wrong");
        }

        await reply.sse.send(riskyGenerator());
    } catch (error) {
        // Handle errors gracefully
        await reply.sse.send({
            event: "error",
            data: { message: "Stream error occurred" },
        });
    }
});
```

### Custom Serialization

```js
// Plugin-level serializer
await fastify.register(require("@fastify/sse"), {
    serializer: (data) => {
        // Custom serialization logic
        return typeof data === "string" ? data : JSON.stringify(data);
    },
});

// Route-level serializer
fastify.get(
    "/custom",
    {
        sse: {
            serializer: (data) => `CUSTOM:${JSON.stringify(data)}`,
        },
    },
    async (request, reply) => {
        await reply.sse.send({ data: "test" }); // Outputs: "CUSTOM:\"test\""
    },
);
```

## Testing

Testing SSE endpoints is simplified with standard Fastify injection:

```js
const response = await fastify.inject({
    method: "GET",
    url: "/events",
    headers: {
        accept: "text/event-stream",
    },
});

assert.strictEqual(response.statusCode, 200);
assert.strictEqual(response.headers["content-type"], "text/event-stream");
assert.ok(response.body.includes('data: "Hello SSE!"'));
```

## Client-Side Usage

```html
<!DOCTYPE html>
<html>
    <head>
        <title>SSE Client</title>
    </head>
    <body>
        <div id="messages"></div>

        <script>
            const eventSource = new EventSource("/events");
            const messagesDiv = document.getElementById("messages");

            eventSource.onmessage = function (event) {
                const data = JSON.parse(event.data);
                messagesDiv.innerHTML +=
                    "<div>" + JSON.stringify(data) + "</div>";
            };

            eventSource.addEventListener("update", function (event) {
                console.log("Update event:", JSON.parse(event.data));
            });

            eventSource.onerror = function (event) {
                console.error("SSE error:", event);
            };
        </script>
    </body>
</html>
```

## TypeScript

Full TypeScript support included:

```typescript
import fastify from "fastify";
import fastifySSE, { SSEMessage } from "@fastify/sse";

const app = fastify();
await app.register(fastifySSE);

app.get("/events", { sse: true }, async (request, reply) => {
    const message: SSEMessage = {
        id: "123",
        event: "test",
        data: { hello: "world" },
    };

    await reply.sse.send(message);

    // TypeScript knows about SSE properties
    console.log(reply.sse.isConnected); // boolean
    console.log(reply.sse.lastEventId); // string | null
    console.log(reply.sse.shouldKeepAlive); // boolean
});
```

## Examples

See the [examples](examples/) directory for complete working examples:

- [Basic Usage](examples/basic.js) - Simple SSE endpoints
- More examples coming soon...

## Comparison with fastify-sse-v2

| Feature             | fastify-sse-v2 | @fastify/sse |
| ------------------- | -------------- | ------------ |
| Basic SSE           | ✅             | ✅           |
| Async Iterators     | ✅             | ✅           |
| Stream Support      | ✅             | ✅ Enhanced  |
| Session Management  | ❌             | ✅           |
| Last-Event-ID       | ❌             | ✅           |
| Connection Health   | ❌             | ✅           |
| Fastify Integration | ⚠️ Limited     | ✅ Full      |
| Testing Support     | ❌             | ✅           |

## License

[MIT](LICENSE)
