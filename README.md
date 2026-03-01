# Orbit Libraries

Centralized library registry for [Orbit](https://github.com/alinsgit/orbit) - Local Development Environment.

## Purpose

This repository maintains an up-to-date JSON manifest with download URLs and version info for all services supported by Orbit. It also builds and distributes pre-compiled PHP binaries for Windows, Linux, and macOS.

## Services

| Service | Source | Platforms |
|---------|--------|-----------|
| **PHP** (multi-version) | Built from source | Windows, Linux, macOS (arm64) |
| **Nginx** | nginx.org | Windows |
| **MariaDB** | mariadb.org | Windows |
| **Redis** | Redis releases | Windows |
| **Mailpit** | GitHub releases | Windows |
| **Composer** | getcomposer.org | All |

## How It Works

1. **`update.yml`** runs weekly — fetches latest versions of all services and commits changes to `dist/libraries.json`
2. When new PHP versions are detected, **`build-php.yml`** is automatically triggered
3. **`build-php.yml`** compiles PHP from source for each platform, packages binaries as `.tar.gz` / `.zip`, and creates a GitHub Release
4. The **Orbit app** fetches `libraries.json` at runtime to resolve download URLs

## PHP Builds

PHP binaries are compiled from official php.net source tarballs and distributed as GitHub Release assets.

**Supported platforms:**
- `php-{version}-windows-x64.zip` — Windows (from windows.php.net)
- `php-{version}-linux-x86_64.tar.gz` — Linux x86_64
- `php-{version}-macos-arm64.tar.gz` — macOS Apple Silicon (M1/M2/M3/M4)

**Included extensions:** OpenSSL, cURL, GD (JPEG/WebP/FreeType), MBString, MySQLi/PDO-MySQL, PDO-SQLite, GMP, Sodium, FFI, XSL, Readline, Zip, BCMath, Sockets, Calendar, Exif, Opcache

## Libraries Manifest

Orbit fetches the manifest from:
```
https://raw.githubusercontent.com/alinsgit/orbit-libraries/main/dist/libraries.json
```

## Manual Update

```bash
npm install
npm run fetch
```

## Triggering a PHP Build

```bash
# Build all active PHP major versions
gh workflow run build-php.yml --ref main

# Build specific versions only
gh workflow run build-php.yml --ref main --field major_versions="8.3,8.4"
```

## JSON Format

```json
{
  "updated": "2026-03-01T00:00:00Z",
  "services": {
    "php": {
      "versions": {
        "8.4": {
          "version": "8.4.16",
          "windows": {
            "url": "https://windows.php.net/downloads/...",
            "sha256": "..."
          },
          "linux": {
            "url": "https://github.com/alinsgit/orbit-libraries/releases/download/php-8.4.16/php-8.4.16-linux-x86_64.tar.gz",
            "sha256": "..."
          },
          "macos": {
            "arm64": {
              "url": "https://github.com/alinsgit/orbit-libraries/releases/download/php-8.4.16/php-8.4.16-macos-arm64.tar.gz",
              "sha256": "..."
            }
          }
        }
      }
    }
  }
}
```

## License

MIT
