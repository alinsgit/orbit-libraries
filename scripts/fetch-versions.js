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
        availableVersions: Object.keys(versions).sort((a, b) => parseFloat(b) - parseFloat(a)),
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

        // Mainline version (first match in "Mainline version" section)
        const mainlineMatch = html.match(/Mainline version[\s\S]*?nginx-(\d+\.\d+\.\d+)/);
        if (mainlineMatch) {
            const v = mainlineMatch[1];
            const major = v.split('.').slice(0, 2).join('.');
            versions[major] = {
                latest: v,
                windows: { url: `https://nginx.org/download/nginx-${v}.zip`, filename: `nginx-${v}.zip` }
            };
            console.log(`  Nginx mainline: ${v}`);
        }

        // Stable version
        const stableMatch = html.match(/Stable version[\s\S]*?nginx-(\d+\.\d+\.\d+)/);
        if (stableMatch) {
            const v = stableMatch[1];
            const major = v.split('.').slice(0, 2).join('.');
            if (!versions[major]) {
                versions[major] = {
                    latest: v,
                    windows: { url: `https://nginx.org/download/nginx-${v}.zip`, filename: `nginx-${v}.zip` }
                };
                console.log(`  Nginx stable: ${v}`);
            }
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
        availableVersions: Object.keys(versions).sort((a, b) => parseFloat(b) - parseFloat(a)),
        versions
    };
}

// ─── Apache ──────────────────────────────────────────────────────────────────

async function fetchApacheVersion() {
    console.log('Fetching Apache version...');

    let version = '2.4.66';
    let filename = 'httpd-2.4.66-260131-win64-VS17.zip';
    let url = `https://www.apachelounge.com/download/VS17/binaries/${filename}`;

    try {
        const res = await fetch('https://www.apachelounge.com/download/');
        const html = await res.text();

        // Find latest httpd download link
        const match = html.match(/href="[^"]*\/(httpd-(\d+\.\d+\.\d+)-\d+-win64-VS\d+\.zip)"/);
        if (match) {
            filename = match[1];
            version = match[2];
            // Reconstruct URL from the matched path
            const pathMatch = html.match(new RegExp(`href="([^"]*/${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})"`));
            if (pathMatch) {
                url = pathMatch[1].startsWith('http') ? pathMatch[1] : `https://www.apachelounge.com${pathMatch[1]}`;
            }
        }
    } catch (err) {
        console.error('  Error fetching Apache:', err.message);
    }

    console.log(`  Apache: ${version}`);
    return {
        name: 'Apache HTTP Server',
        description: 'The most widely used web server',
        latest: version,
        windows: { url, filename }
    };
}

// ─── MariaDB ─────────────────────────────────────────────────────────────────

async function fetchMariaDbVersions() {
    console.log('Fetching MariaDB versions...');

    const versions = {};

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
                            url: `https://downloads.mariadb.org/f/mariadb-${v}/winx64-packages/mariadb-${v}-winx64.zip`,
                            filename: `mariadb-${v}-winx64.zip`,
                            sha256: winZip.checksum?.sha256sum
                        } : undefined,
                        linux: linuxTar ? {
                            url: `https://downloads.mariadb.org/f/mariadb-${v}/bintar-linux-systemd-x86_64/mariadb-${v}-linux-systemd-x86_64.tar.gz`,
                            filename: `mariadb-${v}-linux-systemd-x86_64.tar.gz`,
                            sha256: linuxTar.checksum?.sha256sum
                        } : undefined,
                        macos_arm64: {
                            url: `https://downloads.mariadb.org/f/mariadb-${v}/macos-system-arm64/mariadb-${v}-macos13-arm64.tar.gz`,
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
        versions['12.1'] = { latest: '12.1.2', windows: { url: 'https://downloads.mariadb.org/f/mariadb-12.1.2/winx64-packages/mariadb-12.1.2-winx64.zip', filename: 'mariadb-12.1.2-winx64.zip' } };
        versions['11.8'] = { latest: '11.8.6', windows: { url: 'https://downloads.mariadb.org/f/mariadb-11.8.6/winx64-packages/mariadb-11.8.6-winx64.zip', filename: 'mariadb-11.8.6-winx64.zip' } };
        versions['11.4'] = { latest: '11.4.10', windows: { url: 'https://downloads.mariadb.org/f/mariadb-11.4.10/winx64-packages/mariadb-11.4.10-winx64.zip', filename: 'mariadb-11.4.10-winx64.zip' } };
    }

    return {
        name: 'MariaDB',
        description: 'Community-developed MySQL fork',
        availableVersions: Object.keys(versions).sort((a, b) => parseFloat(b) - parseFloat(a)),
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
        availableVersions: Object.keys(versions).sort((a, b) => Number(b) - Number(a)),
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
        availableVersions: Object.keys(versions).sort((a, b) => parseFloat(b) - parseFloat(a)),
        versions
    };
}

// ─── Bun ─────────────────────────────────────────────────────────────────────

async function fetchBunVersion() {
    console.log('Fetching Bun version...');

    let version = '1.3.8';
    let url = `https://github.com/oven-sh/bun/releases/download/bun-v${version}/bun-windows-x64.zip`;
    let filename = 'bun-windows-x64.zip';

    try {
        const res = await fetch('https://api.github.com/repos/oven-sh/bun/releases/latest');
        const data = await res.json();
        version = data.tag_name.replace('bun-v', '').replace('v', '');

        const asset = data.assets?.find(a => a.name === 'bun-windows-x64.zip');
        if (asset) {
            url = asset.browser_download_url;
            filename = asset.name;
        } else {
            url = `https://github.com/oven-sh/bun/releases/download/bun-v${version}/bun-windows-x64.zip`;
        }
    } catch (err) {
        console.error('  Error fetching Bun:', err.message);
    }

    console.log(`  Bun: ${version}`);
    return {
        name: 'Bun',
        description: 'Fast JavaScript runtime and toolkit',
        latest: version,
        windows: { url, filename }
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
        fetchApacheVersion(),
        fetchMariaDbVersions(),
        fetchNodejsVersions(),
        fetchPythonVersions(),
        fetchBunVersion(),
        fetchRedisVersion(),
        fetchMailpitVersion(),
        fetchComposerVersion()
    ]);

    const libraries = {
        $schema: 'https://raw.githubusercontent.com/nicepkg/orbit-libraries/main/schema.json',
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
