/**
 * Orbit Libraries - Version Fetcher
 *
 * Fetches latest versions and download URLs for all services supported by Orbit.
 * Run with: node scripts/fetch-versions.js
 */

const fs = require('fs');
const path = require('path');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const OUTPUT_FILE = path.join(__dirname, '..', 'dist', 'libraries.json');

// ─── Helpers ────────────────────────────────────────────────────────────────

function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
    }
    return 0;
}

// ─── PHP ─────────────────────────────────────────────────────────────────────

async function fetchPhpVersions() {
    console.log('Fetching PHP versions...');

    const versions = {};
    const targetVersions = ['8.5', '8.4', '8.3', '8.2', '8.1'];

    try {
        const url = 'https://windows.php.net/downloads/releases/';
        const res = await fetch(url);
        const html = await res.text();

        for (const majorVersion of targetVersions) {
            const regex = new RegExp(`php-(${majorVersion}\\.\\d+)-nts-Win32-vs1[67]-x64\\.zip`, 'g');
            const matches = [...html.matchAll(regex)];

            if (matches.length > 0) {
                const latestMatch = matches.sort((a, b) => {
                    const va = a[1].split('.').map(Number);
                    const vb = b[1].split('.').map(Number);
                    for (let i = 0; i < 3; i++) {
                        if ((va[i] || 0) !== (vb[i] || 0)) return (vb[i] || 0) - (va[i] || 0);
                    }
                    return 0;
                })[0];

                const fullVersion = latestMatch[1];
                const vsVersion = latestMatch[0].includes('vs17') ? 'vs17' : 'vs16';
                versions[majorVersion] = {
                    latest: fullVersion,
                    windows: {
                        url: `https://windows.php.net/downloads/releases/php-${fullVersion}-nts-Win32-${vsVersion}-x64.zip`,
                        filename: `php-${fullVersion}-nts-Win32-${vsVersion}-x64.zip`
                    }
                };
                console.log(`  PHP ${majorVersion}: ${fullVersion}`);
            }
        }
    } catch (err) {
        console.error('  Error fetching PHP:', err.message);
    }

    // Fallback
    const fallbacks = {
        '8.5': { latest: '8.5.1', windows: { url: 'https://windows.php.net/downloads/releases/php-8.5.1-nts-Win32-vs17-x64.zip', filename: 'php-8.5.1-nts-Win32-vs17-x64.zip' } },
        '8.4': { latest: '8.4.16', windows: { url: 'https://windows.php.net/downloads/releases/php-8.4.16-nts-Win32-vs17-x64.zip', filename: 'php-8.4.16-nts-Win32-vs17-x64.zip' } },
        '8.3': { latest: '8.3.29', windows: { url: 'https://windows.php.net/downloads/releases/php-8.3.29-nts-Win32-vs16-x64.zip', filename: 'php-8.3.29-nts-Win32-vs16-x64.zip' } },
        '8.2': { latest: '8.2.30', windows: { url: 'https://windows.php.net/downloads/releases/php-8.2.30-nts-Win32-vs16-x64.zip', filename: 'php-8.2.30-nts-Win32-vs16-x64.zip' } },
        '8.1': { latest: '8.1.34', windows: { url: 'https://windows.php.net/downloads/releases/php-8.1.34-nts-Win32-vs16-x64.zip', filename: 'php-8.1.34-nts-Win32-vs16-x64.zip' } }
    };
    for (const [v, data] of Object.entries(fallbacks)) {
        if (!versions[v]) versions[v] = data;
    }

    return {
        name: 'PHP',
        description: 'PHP Hypertext Preprocessor',
        availableVersions: Object.keys(versions).sort((a, b) => compareVersions(b, a)),
        versions
    };
}

// ─── Nginx ───────────────────────────────────────────────────────────────────

async function fetchNginxVersions() {
    console.log('Fetching Nginx versions...');

    const versions = {};

    try {
        const res = await fetch('https://nginx.org/en/download.html');
        const html = await res.text();

        // Parse all sections: Mainline, Stable, Legacy
        // Each section has nginx-X.Y.Z links with .zip downloads for Windows
        const sections = html.split(/<h4>/);

        for (const section of sections) {
            // Find all version links with .zip (Windows) downloads
            const zipMatches = [...section.matchAll(/nginx-(\d+\.\d+\.\d+)\.zip/g)];

            for (const match of zipMatches) {
                const v = match[1];
                const major = v.split('.').slice(0, 2).join('.');

                // Only keep the latest patch for each major.minor
                if (!versions[major] || compareVersions(v, versions[major].latest) > 0) {
                    versions[major] = {
                        latest: v,
                        windows: { url: `https://nginx.org/download/nginx-${v}.zip`, filename: `nginx-${v}.zip` }
                    };
                }
            }
        }

        // Keep only the top 5 most recent major.minor versions
        const sorted = Object.keys(versions).sort((a, b) => compareVersions(b, a));
        const remove = sorted.slice(5);
        for (const key of remove) delete versions[key];

        for (const key of sorted.slice(0, 5)) {
            console.log(`  Nginx ${key}: ${versions[key].latest}`);
        }
    } catch (err) {
        console.error('  Error fetching Nginx:', err.message);
    }

    // Fallback
    if (Object.keys(versions).length === 0) {
        versions['1.29'] = { latest: '1.29.5', windows: { url: 'https://nginx.org/download/nginx-1.29.5.zip', filename: 'nginx-1.29.5.zip' } };
        versions['1.28'] = { latest: '1.28.2', windows: { url: 'https://nginx.org/download/nginx-1.28.2.zip', filename: 'nginx-1.28.2.zip' } };
    }

    return {
        name: 'Nginx',
        description: 'High-performance HTTP server',
        availableVersions: Object.keys(versions).sort((a, b) => compareVersions(b, a)),
        versions
    };
}

// ─── Apache ──────────────────────────────────────────────────────────────────

async function fetchApacheVersions() {
    console.log('Fetching Apache versions...');

    const versions = {};

    // Apache Lounge provides builds for multiple VS toolchains (VS17, VS18)
    // These are different builds of the same Apache version, but VS version matters
    // for PHP compatibility (PHP NTS requires matching VC runtime)
    const pages = [
        { label: 'VS18', url: 'https://www.apachelounge.com/download/' },
        { label: 'VS17', url: 'https://www.apachelounge.com/download/VS17/' },
    ];

    for (const page of pages) {
        try {
            const res = await fetch(page.url);
            const html = await res.text();

            // Find Win64 httpd zip links
            const matches = [...html.matchAll(/href="([^"]*\/(httpd-(\d+\.\d+\.\d+)-(\d+)-[Ww]in64-VS(\d+)\.zip))"/gi)];

            if (matches.length > 0) {
                // Take the first (latest) match
                const m = matches[0];
                const filename = m[2];
                const version = m[3];
                const vsVersion = m[5];
                const href = m[1].startsWith('http') ? m[1] : `https://www.apachelounge.com${m[1]}`;
                const key = `${version}-VS${vsVersion}`;

                if (!versions[key]) {
                    versions[key] = {
                        latest: version,
                        windows: { url: href, filename }
                    };
                    console.log(`  Apache ${key}: ${version} (${filename})`);
                }
            }
        } catch (err) {
            console.error(`  Error fetching Apache ${page.label}:`, err.message);
        }
    }

    // Fallback
    if (Object.keys(versions).length === 0) {
        versions['2.4.66-VS17'] = {
            latest: '2.4.66',
            windows: {
                url: 'https://www.apachelounge.com/download/VS17/binaries/httpd-2.4.66-251206-Win64-VS17.zip',
                filename: 'httpd-2.4.66-251206-Win64-VS17.zip'
            }
        };
    }

    return {
        name: 'Apache HTTP Server',
        description: 'The most widely used web server',
        availableVersions: Object.keys(versions).sort((a, b) => {
            // Sort by VS version descending (VS18 first, VS17 second)
            const vsA = parseInt(a.match(/VS(\d+)/)?.[1] || '0');
            const vsB = parseInt(b.match(/VS(\d+)/)?.[1] || '0');
            return vsB - vsA;
        }),
        versions
    };
}

// ─── MariaDB ─────────────────────────────────────────────────────────────────

async function fetchMariaDbVersions() {
    console.log('Fetching MariaDB versions...');

    const versions = {};

    // MariaDB CDN mirror for direct file downloads
    // downloads.mariadb.org/f/ serves HTML pages (mirror picker) which triggers CloudFlare protection
    // dlm.mariadb.com is the official CDN that serves files directly
    const MARIADB_MIRROR = 'https://dlm.mariadb.com/browse/mariadb_server';

    // Helper: build direct download URL from MariaDB mirror
    function mariadbUrl(version, subpath, filename) {
        return `https://mirror.kumi.systems/mariadb/mariadb-${version}/${subpath}/${filename}`;
    }

    try {
        const res = await fetch('https://downloads.mariadb.org/rest-api/mariadb/');
        const data = await res.json();

        // Include Stable releases: both LTS and Rolling (12.x is Rolling)
        const stableReleases = data.major_releases
            .filter(r => r.release_status === 'Stable')
            .slice(0, 5);

        for (const release of stableReleases) {
            const majorVersion = release.release_id;

            try {
                const versionRes = await fetch(`https://downloads.mariadb.org/rest-api/mariadb/${majorVersion}/`);
                const versionData = await versionRes.json();

                const latestRelease = Object.keys(versionData.releases)[0];

                if (latestRelease) {
                    const files = versionData.releases[latestRelease].files;
                    const v = latestRelease;

                    const winZip = files.find(f => f.file_name.includes('winx64.zip') && !f.file_name.includes('debug'));
                    const linuxTar = files.find(f => f.file_name.includes('linux-systemd-x86_64.tar.gz'));

                    versions[majorVersion] = {
                        latest: v,
                        windows: winZip ? {
                            url: mariadbUrl(v, 'winx64-packages', `mariadb-${v}-winx64.zip`),
                            filename: `mariadb-${v}-winx64.zip`,
                            sha256: winZip.checksum?.sha256sum
                        } : undefined,
                        linux: linuxTar ? {
                            url: mariadbUrl(v, 'bintar-linux-systemd-x86_64', `mariadb-${v}-linux-systemd-x86_64.tar.gz`),
                            filename: `mariadb-${v}-linux-systemd-x86_64.tar.gz`,
                            sha256: linuxTar.checksum?.sha256sum
                        } : undefined,
                        macos_arm64: {
                            url: mariadbUrl(v, 'macos-system-arm64', `mariadb-${v}-macos13-arm64.tar.gz`),
                            filename: `mariadb-${v}-macos13-arm64.tar.gz`
                        }
                    };
                    console.log(`  MariaDB ${majorVersion}: ${v} (${release.release_support_type})`);
                }
            } catch (err) {
                console.error(`  Error fetching MariaDB ${majorVersion}:`, err.message);
            }
        }
    } catch (err) {
        console.error('  Error fetching MariaDB releases:', err.message);
    }

    if (Object.keys(versions).length === 0) {
        console.log('  Using fallback versions');
        versions['12.1'] = { latest: '12.1.2', windows: { url: mariadbUrl('12.1.2', 'winx64-packages', 'mariadb-12.1.2-winx64.zip'), filename: 'mariadb-12.1.2-winx64.zip' } };
        versions['11.8'] = { latest: '11.8.6', windows: { url: mariadbUrl('11.8.6', 'winx64-packages', 'mariadb-11.8.6-winx64.zip'), filename: 'mariadb-11.8.6-winx64.zip' } };
        versions['11.4'] = { latest: '11.4.10', windows: { url: mariadbUrl('11.4.10', 'winx64-packages', 'mariadb-11.4.10-winx64.zip'), filename: 'mariadb-11.4.10-winx64.zip' } };
    }

    return {
        name: 'MariaDB',
        description: 'Community-developed MySQL fork',
        availableVersions: Object.keys(versions).sort((a, b) => compareVersions(b, a)),
        versions
    };
}

// ─── Node.js ─────────────────────────────────────────────────────────────────

async function fetchNodejsVersions() {
    console.log('Fetching Node.js versions...');

    const versions = {};

    try {
        const res = await fetch('https://nodejs.org/dist/index.json');
        const data = await res.json();

        // Group by major version, get latest of each
        const majorMap = {};
        for (const entry of data) {
            const v = entry.version.replace('v', '');
            const major = v.split('.')[0];
            if (!majorMap[major]) {
                majorMap[major] = v;
            }
        }

        // Take current + last 3 LTS (even numbers)
        const allMajors = Object.keys(majorMap).map(Number).sort((a, b) => b - a);
        const latest = allMajors[0];
        const ltsVersions = allMajors.filter(m => m % 2 === 0).slice(0, 3);
        const selected = [latest, ...ltsVersions.filter(m => m !== latest)].slice(0, 4);

        for (const major of selected) {
            const v = majorMap[major];
            versions[String(major)] = {
                latest: v,
                windows: {
                    url: `https://nodejs.org/dist/v${v}/node-v${v}-win-x64.zip`,
                    filename: `node-v${v}-win-x64.zip`
                }
            };
            console.log(`  Node.js ${major}: ${v}`);
        }
    } catch (err) {
        console.error('  Error fetching Node.js:', err.message);
    }

    if (Object.keys(versions).length === 0) {
        versions['24'] = { latest: '24.13.0', windows: { url: 'https://nodejs.org/dist/v24.13.0/node-v24.13.0-win-x64.zip', filename: 'node-v24.13.0-win-x64.zip' } };
        versions['22'] = { latest: '22.22.0', windows: { url: 'https://nodejs.org/dist/v22.22.0/node-v22.22.0-win-x64.zip', filename: 'node-v22.22.0-win-x64.zip' } };
        versions['20'] = { latest: '20.20.0', windows: { url: 'https://nodejs.org/dist/v20.20.0/node-v20.20.0-win-x64.zip', filename: 'node-v20.20.0-win-x64.zip' } };
    }

    return {
        name: 'Node.js',
        description: 'JavaScript runtime built on V8',
        availableVersions: Object.keys(versions).sort((a, b) => compareVersions(b, a)),
        versions
    };
}

// ─── Python ──────────────────────────────────────────────────────────────────

async function fetchPythonVersions() {
    console.log('Fetching Python versions...');

    const versions = {};
    const targetSeries = ['3.14', '3.13', '3.12', '3.11'];

    try {
        const res = await fetch('https://endoflife.date/api/python.json');
        const data = await res.json();

        for (const series of targetSeries) {
            const entry = data.find(e => e.cycle === series);
            if (entry && entry.latest) {
                const v = entry.latest;
                versions[series] = {
                    latest: v,
                    windows: {
                        url: `https://www.python.org/ftp/python/${v}/python-${v}-embed-amd64.zip`,
                        filename: `python-${v}-embed-amd64.zip`
                    }
                };
                console.log(`  Python ${series}: ${v}`);
            }
        }
    } catch (err) {
        console.error('  Error fetching Python:', err.message);
    }

    // Verify Windows embed availability (security-only releases may not have it)
    for (const [series, info] of Object.entries(versions)) {
        try {
            const checkRes = await fetch(info.windows.url, { method: 'HEAD' });
            if (!checkRes.ok) {
                console.log(`  Python ${series} embed not available, checking previous...`);
                // Try decrementing patch until we find one that exists
                const parts = info.latest.split('.').map(Number);
                for (let patch = parts[2] - 1; patch >= 0; patch--) {
                    const tryVersion = `${parts[0]}.${parts[1]}.${patch}`;
                    const tryUrl = `https://www.python.org/ftp/python/${tryVersion}/python-${tryVersion}-embed-amd64.zip`;
                    const tryRes = await fetch(tryUrl, { method: 'HEAD' });
                    if (tryRes.ok) {
                        versions[series] = {
                            latest: tryVersion,
                            windows: { url: tryUrl, filename: `python-${tryVersion}-embed-amd64.zip` }
                        };
                        console.log(`  Python ${series}: using ${tryVersion} (latest with embed)`);
                        break;
                    }
                }
            }
        } catch {
            // HEAD check failed, keep current version
        }
    }

    if (Object.keys(versions).length === 0) {
        versions['3.13'] = { latest: '3.13.12', windows: { url: 'https://www.python.org/ftp/python/3.13.12/python-3.13.12-embed-amd64.zip', filename: 'python-3.13.12-embed-amd64.zip' } };
        versions['3.12'] = { latest: '3.12.8', windows: { url: 'https://www.python.org/ftp/python/3.12.8/python-3.12.8-embed-amd64.zip', filename: 'python-3.12.8-embed-amd64.zip' } };
    }

    return {
        name: 'Python',
        description: 'General-purpose programming language',
        availableVersions: Object.keys(versions).sort((a, b) => compareVersions(b, a)),
        versions
    };
}

// ─── Bun ─────────────────────────────────────────────────────────────────────

async function fetchBunVersions() {
    console.log('Fetching Bun versions...');

    const versions = {};

    try {
        // Fetch recent releases (non-prerelease, non-canary)
        const res = await fetch('https://api.github.com/repos/oven-sh/bun/releases?per_page=50');
        const releases = await res.json();

        // Filter stable releases only (no canary, no pre-release)
        const stableReleases = releases.filter(r =>
            !r.prerelease &&
            !r.draft &&
            r.tag_name.startsWith('bun-v') &&
            !r.tag_name.includes('canary')
        );

        // Group by major.minor, keep latest patch of each
        for (const release of stableReleases) {
            const version = release.tag_name.replace('bun-v', '');
            const parts = version.split('.');
            if (parts.length < 2) continue;
            const majorMinor = `${parts[0]}.${parts[1]}`;

            if (!versions[majorMinor]) {
                const winAsset = release.assets?.find(a => a.name === 'bun-windows-x64.zip');
                const url = winAsset?.browser_download_url
                    || `https://github.com/oven-sh/bun/releases/download/bun-v${version}/bun-windows-x64.zip`;

                versions[majorMinor] = {
                    latest: version,
                    windows: { url, filename: 'bun-windows-x64.zip' }
                };
                console.log(`  Bun ${majorMinor}: ${version}`);
            }
        }
    } catch (err) {
        console.error('  Error fetching Bun:', err.message);
    }

    if (Object.keys(versions).length === 0) {
        versions['1.3'] = {
            latest: '1.3.8',
            windows: {
                url: 'https://github.com/oven-sh/bun/releases/download/bun-v1.3.8/bun-windows-x64.zip',
                filename: 'bun-windows-x64.zip'
            }
        };
    }

    return {
        name: 'Bun',
        description: 'Fast JavaScript runtime and toolkit',
        availableVersions: Object.keys(versions).sort((a, b) => compareVersions(b, a)),
        versions
    };
}

// ─── Redis ───────────────────────────────────────────────────────────────────

async function fetchRedisVersion() {
    console.log('Fetching Redis version...');

    let version = '8.4.0';
    let windowsUrl = null;
    let windowsFilename = null;

    try {
        const res = await fetch('https://api.github.com/repos/redis-windows/redis-windows/releases/latest');
        const data = await res.json();
        version = data.tag_name;

        const asset = data.assets?.find(a =>
            a.name.toLowerCase().includes('x64') &&
            a.name.includes('with-Service') &&
            a.name.endsWith('.zip')
        );
        if (asset) {
            windowsUrl = asset.browser_download_url;
            windowsFilename = asset.name;
        }
    } catch (err) {
        console.error('  Error fetching Redis:', err.message);
    }

    console.log(`  Redis: ${version}`);
    return {
        name: 'Redis',
        description: 'In-memory data structure store',
        latest: version,
        windows: {
            url: windowsUrl || `https://github.com/redis-windows/redis-windows/releases/download/${version}/Redis-${version}-Windows-x64-cygwin-with-Service.zip`,
            filename: windowsFilename || `Redis-${version}-Windows-x64-cygwin-with-Service.zip`
        }
    };
}

// ─── Mailpit ─────────────────────────────────────────────────────────────────

async function fetchMailpitVersion() {
    console.log('Fetching Mailpit version...');

    try {
        const res = await fetch('https://api.github.com/repos/axllent/mailpit/releases/latest');
        const data = await res.json();
        const version = data.tag_name.replace('v', '');

        // Find Windows asset (prefer .zip over .exe)
        const winAsset = data.assets?.find(a => a.name.includes('windows-amd64') && a.name.endsWith('.zip'))
            || data.assets?.find(a => a.name.includes('windows-amd64'));

        const windowsUrl = winAsset?.browser_download_url
            || `https://github.com/axllent/mailpit/releases/download/v${version}/mailpit-windows-amd64.zip`;
        const windowsFilename = winAsset?.name || `mailpit-windows-amd64.zip`;

        console.log(`  Mailpit: ${version}`);
        return {
            name: 'Mailpit',
            description: 'Email testing tool for developers',
            latest: version,
            windows: { url: windowsUrl, filename: windowsFilename },
            macos_arm64: {
                url: `https://github.com/axllent/mailpit/releases/download/v${version}/mailpit-darwin-arm64.tar.gz`,
                filename: 'mailpit-darwin-arm64.tar.gz'
            },
            linux: {
                url: `https://github.com/axllent/mailpit/releases/download/v${version}/mailpit-linux-amd64.tar.gz`,
                filename: 'mailpit-linux-amd64.tar.gz'
            }
        };
    } catch (err) {
        console.error('  Error fetching Mailpit:', err.message);
    }

    return {
        name: 'Mailpit',
        description: 'Email testing tool for developers',
        latest: '1.29.0',
        windows: {
            url: 'https://github.com/axllent/mailpit/releases/download/v1.29.0/mailpit-windows-amd64.zip',
            filename: 'mailpit-windows-amd64.zip'
        }
    };
}

// ─── Composer ────────────────────────────────────────────────────────────────

async function fetchComposerVersion() {
    console.log('Fetching Composer version...');

    try {
        const res = await fetch('https://getcomposer.org/versions');
        const data = await res.json();
        const stable = data.stable[0];
        const version = stable.version;

        console.log(`  Composer: ${version}`);
        return {
            name: 'Composer',
            description: 'PHP dependency manager',
            latest: version,
            all_platforms: {
                url: `https://getcomposer.org/download/${version}/composer.phar`,
                filename: 'composer.phar'
            }
        };
    } catch (err) {
        console.error('  Error fetching Composer:', err.message);
    }

    return {
        name: 'Composer',
        description: 'PHP dependency manager',
        latest: '2.9.5',
        all_platforms: { url: 'https://getcomposer.org/download/2.9.5/composer.phar', filename: 'composer.phar' }
    };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('=== Orbit Libraries Version Fetcher ===\n');
    console.log(`Date: ${new Date().toISOString()}\n`);

    const [php, nginx, apache, mariadb, nodejs, python, bun, redis, mailpit, composer] = await Promise.all([
        fetchPhpVersions(),
        fetchNginxVersions(),
        fetchApacheVersions(),
        fetchMariaDbVersions(),
        fetchNodejsVersions(),
        fetchPythonVersions(),
        fetchBunVersions(),
        fetchRedisVersion(),
        fetchMailpitVersion(),
        fetchComposerVersion()
    ]);

    const libraries = {
        $schema: 'https://raw.githubusercontent.com/alinsgit/orbit-libraries/main/schema.json',
        updated: new Date().toISOString(),
        version: '1.1.0',
        services: {
            php,
            nginx,
            apache,
            mariadb,
            nodejs,
            python,
            bun,
            redis,
            mailpit,
            composer
        }
    };

    const distDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(libraries, null, 2));

    // Summary
    console.log('\n=== Summary ===');
    for (const [key, svc] of Object.entries(libraries.services)) {
        if (svc.versions) {
            const vers = svc.availableVersions || Object.keys(svc.versions);
            console.log(`  ${key}: ${vers.join(', ')}`);
        } else {
            console.log(`  ${key}: ${svc.latest}`);
        }
    }
    console.log(`\n✅ Written to ${OUTPUT_FILE}`);
}

main().catch(console.error);
