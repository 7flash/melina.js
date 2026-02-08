# Port Fallback Fix — `serve()` and `findAvailablePort()`

## Problem

When a process managed by `bgr` is restarted, the old process is killed and the port is freed.
However, on Windows, the port may briefly remain in `TIME_WAIT` state, causing `EADDRINUSE` or
`EACCES` when starting the new server.

The current `serve()` method correctly catches this and calls `findAvailablePort()`, but
**`findAvailablePort()` itself crashes** because it uses `Bun.listen()` to probe ports, and
`Bun.listen()` on Windows throws `EACCES` on many ports (not just in-use ones):

```
error: Failed to listen at localhost
 syscall: "listen", errno: 10013, address: "localhost", port: 3001, code: "EACCES"
```

This means the fallback path never works on Windows — the server crashes instead of finding a new port.

## Root Cause

`Bun.listen()` creates a raw TCP listener which requires different permissions than `Bun.serve()`.
On Windows, many ports in the dynamic range trigger `EACCES` (errno 10013) when using raw `listen`
even though `Bun.serve()` would work fine on them.

## Suggested Fix

### Option A: Use `Bun.serve` for probing (recommended)

Replace `Bun.listen` with `Bun.serve` in `findAvailablePort`. Since `serve` is what we'll
actually use, it's the correct test:

```typescript
export function findAvailablePort(startPort: number = 3001): number {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      // Use Bun.serve to test — this is what we actually use, so it's the right probe
      const testServer = Bun.serve({
        port,
        fetch() { return new Response(''); },
      });
      testServer.stop(true);
      return port;
    } catch (e: any) {
      if (
        e.code !== 'EADDRINUSE' &&
        e.code !== 'EACCES' &&
        !e.message?.includes('EADDRINUSE') &&
        !e.message?.includes('Address already in use') &&
        !e.message?.includes('Failed to listen')
      ) {
        throw e;
      }
      // Port not available, try next
    }
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + 99}`);
}
```

### Option B: Use `0.0.0.0` instead of `localhost`

The `EACCES` on Windows is often specific to `localhost` (which resolves to `::1` on some
Windows configs). Changing the hostname to `0.0.0.0` avoids this:

```typescript
const listener = Bun.listen({
  port,
  hostname: '0.0.0.0', // Instead of 'localhost'
  socket: {
    close() {},
    data() {},
  },
});
```

### Option C: Catch EACCES in find loop (minimal fix)

The current `findAvailablePort` already catches `EACCES` — but the error thrown by Bun on
Windows may not have a `.code` property. Check the error message string too:

```typescript
} catch (e: any) {
  if (
    e.code !== 'EADDRINUSE' &&
    e.code !== 'EACCES' &&
    e.errno !== 10013 &&  // Windows EACCES errno
    !e.message?.includes('EADDRINUSE') &&
    !e.message?.includes('EACCES') &&
    !e.message?.includes('Failed to listen') &&
    !e.message?.includes('Address already in use')
  ) {
    throw e;
  }
  // Continue to next port
}
```

## Additional Suggestion: Log the fallback

When `serve()` falls back to a different port, it should log this clearly so the developer
knows what happened:

```typescript
} catch (err) {
  if (!unix && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) {
    const newPort = findAvailablePort((args.port || 3000) + 1);
    console.warn(`⚠️  Port ${args.port} unavailable, using port ${newPort} instead`);
    args.port = newPort;
    server = Bun.serve(args);
  } else {
    throw err;
  }
}
```

## Context

This was discovered when using `bgr` (process manager) to restart a melina.js app.
The restart flow: kill old process → free port → start new process.
On Windows, even after the port is freed, `findAvailablePort` crashes before finding one.
