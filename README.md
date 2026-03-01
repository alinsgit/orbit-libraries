# orbit-libraries

Backend manifest and build infrastructure for [Orbit](https://github.com/alinsgit/orbit).

## What's here

- **`dist/libraries.json`** — version manifest fetched by the Orbit app at runtime
- **`scripts/`** — Node.js scripts that scrape official sources for latest versions
- **`.github/workflows/update.yml`** — runs weekly, updates the manifest
- **`.github/workflows/build-php.yml`** — compiles PHP from source for Linux and macOS, publishes GitHub Releases

## Workflows

### update.yml (weekly)
Checks for new versions of all services and commits updated `dist/libraries.json`. Automatically triggers `build-php.yml` when new PHP versions are detected.

### build-php.yml (triggered by update.yml or manually)
Builds PHP from source for:
- Linux x86_64 (`.tar.gz`)
- macOS arm64 / Apple Silicon (`.tar.gz`)

Windows PHP binaries come directly from [windows.php.net](https://windows.php.net).

## Manual trigger

```bash
# Build specific PHP major versions
gh workflow run build-php.yml --ref main --field major_versions="8.3,8.4"
```

## License

MIT
