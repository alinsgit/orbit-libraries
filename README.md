# Orbit Libraries

Centralized library registry for [Orbit](https://github.com/nicepkg/orbit) - Local Development Environment.

## Purpose

This repository maintains an up-to-date JSON file containing download URLs and version information for all services supported by Orbit:

- **PHP** (multiple versions)
- **Nginx**
- **MariaDB**
- **Redis**
- **Memcached**
- **Mailpit**
- **Composer**

## How It Works

1. **GitHub Actions** runs daily to fetch latest versions
2. **Node.js scripts** scrape official sources for download URLs
3. **libraries.json** is updated with new versions
4. **Orbit app** fetches this JSON to get current download URLs

## Usage

Orbit fetches the libraries file from:
```
https://raw.githubusercontent.com/nicepkg/orbit-libraries/main/dist/libraries.json
```

## Manual Update

```bash
npm install
npm run fetch
```

## JSON Format

```json
{
  "updated": "2026-02-07T00:00:00Z",
  "services": {
    "php": {
      "versions": { "8.3": { ... } }
    },
    "nginx": { ... },
    "mariadb": { ... }
  }
}
```

## License

MIT
