# View Morph Demo

A demonstration of Melina.js **View Transitions** and **Hangar Architecture**.

## Features

- **High-Fidelity Persistence**: The `MusicPlayer` component persists across page navigation, maintaining its state (e.g. playback position) because the Hangar runtime identifies it as a stable island.
- **View Transitions**: Smooth morphing animations when navigating between Home and Album pages.

## Running

```bash
bun install
bun run dev
```

Open http://localhost:3000
