# Contributing to Orbitarium

Thanks for bringing another point of view to the sky.

## Before you start

1. Open an issue for a significant behavior or design change.
2. Keep the project dependency-free unless a dependency creates a clear, durable benefit.
3. Do not commit personal scan reports, credentials, machine paths, or generated build output.

## Local workflow

```powershell
npm install
npm test
npm run check
npm run demo
npm start
```

Keep changes focused and explain the user-facing reason in the commit message. New scanner fields should have tests; new visual behavior should remain usable with keyboard focus and a small viewport.

## Pull requests

Please include what changed and why, how you verified it, screenshots for meaningful UI changes, and any privacy, performance, or compatibility implications.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
