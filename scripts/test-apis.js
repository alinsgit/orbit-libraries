const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function fetchPostgresVersions() {
    const versions = {};
    const targetSeries = ['16', '15', '14'];
    try {
        const res = await fetch('https://endoflife.date/api/postgresql.json');
        const data = await res.json();
        for (const series of targetSeries) {
            const entry = data.find(e => e.cycle === series);
            if (entry && entry.latest) {
                const v = entry.latest;
                let foundUrl = null;
                for (let build = 1; build <= 3; build++) {
                    const url = `https://get.enterprisedb.com/postgresql/postgresql-${v}-${build}-windows-x64-binaries.zip`;
                    try {
                        const check = await fetch(url, { method: 'HEAD' });
                        if (check.ok) {
                            foundUrl = url;
                            break;
                        }
                    } catch(e) {}
                }
                if (foundUrl) {
                    versions[series] = { latest: v, url: foundUrl };
                }
            }
        }
    } catch (e) { console.error('PG Err:', e.message); }
    console.log('Postgres:', versions);
}

async function fetchMongoVersions() {
    const versions = {};
    try {
        const res = await fetch('https://downloads.mongodb.org/current.json');
        const data = await res.json();
        const targetMajors = ['8.0', '7.0'];
        for (const major of targetMajors) {
            const release = data.versions.find(v => v.version.startsWith(major) && v.production_release);
            if (release) {
                const winDownload = release.downloads.find(d => d.target === 'windows' && d.archive.url.endsWith('.zip'));
                if (winDownload) {
                    versions[major] = { latest: release.version, url: winDownload.archive.url };
                }
            }
        }
    } catch (e) { console.error('Mongo Err:', e.message); }
    console.log('Mongo:', versions);
}

async function fetchGoVersions() {
    const versions = {};
    try {
        const res = await fetch('https://go.dev/dl/?mode=json');
        const data = await res.json();
        for (const release of data) {
            const v = release.version.replace('go', '');
            const parts = v.split('.');
            const majorMinor = parts[0] + '.' + parts[1];
            if (!versions[majorMinor]) {
                const winFile = release.files.find(f => f.os === 'windows' && f.arch === 'amd64' && f.kind === 'archive');
                if (winFile) {
                    versions[majorMinor] = { latest: v, url: `https://dl.google.com/go/${winFile.filename}` };
                }
            }
        }
    } catch(e) {}
    console.log('Go:', versions);
}

async function fetchDeno() {
    try {
        const res = await fetch('https://api.github.com/repos/denoland/deno/releases/latest');
        const data = await res.json();
        console.log('Deno:', data.tag_name);
    } catch(e) {}
}

async function main() {
    await fetchPostgresVersions();
    await fetchMongoVersions();
    await fetchGoVersions();
    await fetchDeno();
}

main().catch(console.error);
