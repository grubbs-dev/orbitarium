# Orbitarium

Orbitarium is a small, local-first developer constellation. Point it at a directory and it turns the repositories underneath into an explorable map: project size becomes mass, recent activity becomes glow, shared languages become bridges, and missing documentation becomes a visible signal.

It is intentionally dependency-free. The scanner uses Node's standard library; the viewer is plain HTML, CSS, and SVG. Nothing leaves your machine.

## Quick start

```powershell
cd V:\Development\Repos\orbitarium
npm run demo
npm run serve -- --report reports\demo.json --port 4317
```

Open http://localhost:4317. The demo command creates a tiny synthetic report so the constellation is immediately visible. For a real scan:

```powershell
node src/cli.js scan --root V:\Development\Repos --out reports\repos.json
node src/cli.js serve --report reports\repos.json --port 4317
```

Useful flags:

* `--root <path>` directory to scan (defaults to the current directory)
* `--out <path>` report destination (defaults to `reports/orbitarium.json`)
* `--depth <number>` maximum directory depth (defaults to `4`)
* `--port <number>` server port (defaults to `4317`)
* `--host <name>` server host (defaults to `127.0.0.1`)

## What it measures

Orbitarium discovers directories containing `.git`, then records repository name, relative path, branch, commit count, latest commit date, file count, byte size, detected languages, manifests, README presence, and a health score. It does not inspect file contents beyond small, well-known manifest names and extension counts.

The viewer supports search, language and health filters, click-to-inspect detail cards, keyboard navigation, a focus mode, and report export. The graph is deterministic: the same report produces the same constellation.

## Development

```powershell
npm test
node src/cli.js scan --root . --out reports\self.json
```

The test suite covers language classification, health scoring, deterministic layout, report generation, and the static server's API.

## Design notes

Orbitarium is an experiment in making the “shape” of a development environment legible without turning it into another telemetry service. The report format is deliberately plain JSON so other tools can remix it.
