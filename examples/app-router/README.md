# Melina.js App Router Example

This example demonstrates the Next.js-style app router functionality in Melina.js.

## Features

- 📁 File-based routing from `app/` directory
- 🚀 Server-side rendering by default
- 🔄 Client-side navigation with Link component
- 📊 Dynamic routes with `[param]` syntax
- ⚡ Zero configuration

## File Structure

```
app/
├── page.tsx                 # Home page → /
├── about/
│   └── page.tsx            # About page → /about
├── posts/
│   └── [id]/
│       └── page.tsx        # Dynamic post → /posts/:id
└── globals.css             # Global styles
```

## Running the Example

```bash
# Install dependencies
bun install

# Start the development server
bun run dev

# Or use melina CLI directly
melina start
```

Visit http://localhost:3000

## How It Works

1. **Route Discovery**: Melina scans the `app/` directory for `page.tsx` files
2. **URL Mapping**: File paths become URLs (e.g., `app/about/page.tsx` → `/about`)
3. **Dynamic Routes**: Brackets indicate parameters (e.g., `[id]` → `:id`)
4. **SSR**: Components are rendered on the server for fast initial load
5. **Client Navigation**: Link component enables SPA-style navigation

## Creating New Pages

Just add a `page.tsx` file in the `app/` directory:

```tsx
// app/contact/page.tsx
import React from 'react';
import { Link } from '@ments/web/Link';

export default function ContactPage({ params }) {
  return (
    <div>
      <h1>Contact Us</h1>
      <Link href="/">Home</Link>
    </div>
  );
}
```

That's it! Navigate to `/contact` to see your new page.
