# Contributing to Melina.js

Thank you for your interest in contributing to Melina.js! 🦊

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.2 or higher
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/melina.js.git
   cd melina.js
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Run the flagship example:
   ```bash
   cd examples/social-feed
   bun run dev
   ```

## Development Workflow

### Project Structure

```
melina.js/
├── src/                 # Source code
│   ├── web.ts          # Main server, router & build system
│   ├── island.ts       # Island helper
│   ├── Link.tsx        # Link component
│   ├── router.ts       # File-based route discovery
│   ├── mcp.ts          # MCP protocol support
│   ├── jsx-dom.ts      # Client-side JSX runtime
│   ├── runtime.ts      # Client runtime bootstrap
│   └── runtime/        # Client-side navigation
├── bin/                # CLI
├── docs/               # Documentation
├── examples/           # Example applications
└── tests/              # Test suite
```

### Running Tests

```bash
bun test
```

### Testing Changes

The best way to test changes is with the example apps in `examples/`:

```bash
cd examples/social-feed
bun run dev
```

## Making Changes

### Code Style

- TypeScript for all source files
- Use clear, descriptive variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add View Transitions support
fix: resolve props desynchronization in persistent islands
docs: update API reference
chore: update dependencies
```

### Pull Requests

1. Create a feature branch:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes
3. Write/update tests as needed
4. Update documentation if applicable
5. Push and create a PR

## Areas for Contribution

### Good First Issues

- Documentation improvements
- Example apps
- Bug fixes with clear reproduction steps

### Larger Contributions

- New features (please open an issue first to discuss)
- Performance optimizations
- TypeScript type improvements

## Architecture Notes

### Key Concepts

- **Islands Architecture**: Only interactive components hydrate
- **Hangar**: Single persistent React root managing all islands
- **Partial Swaps**: Only `#melina-page-content` is replaced
- **In-Memory Builds**: No `dist/` folder, assets in RAM

### Files to Know

| File | Purpose |
|------|---------|
| `src/web.ts` | Server, router, build system |
| `src/island.ts` | `island()` helper for client components |
| `src/router.ts` | File-based route discovery |
| `src/runtime/navigation.tsx` | Client-side navigation & partial swaps |
| `src/mcp.ts` | MCP protocol server support |
| `src/Link.tsx` | Navigation component |
| `src/jsx-dom.ts` | Client-side JSX runtime (DOM creation) |

## Questions?

- Open an [issue](https://github.com/mements/melina.js/issues)
- Check existing [discussions](https://github.com/mements/melina.js/discussions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
