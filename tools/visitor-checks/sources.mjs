// Only approved public destinations and their matching /en paths leave the laptop.
import { readFileSync } from 'node:fs';
const records = JSON.parse(readFileSync(new URL('../../knowledge/catalog.json', import.meta.url), 'utf8'));
const destinations = new Set();
const publicKinds = new Set(['public-website', 'public-social', 'planned']);
for (const record of records.filter(r => r.active && r.page === 0 && publicKinds.has(r.kind))) {
  for (const link of [record.sourceUrl, record.requestUrl].filter(Boolean)) {
    const url = new URL(link);
    if (url.protocol !== 'https:' || url.username || url.password) continue;
    if (url.hostname === 'forju.at') {
      destinations.add(url.href);
      destinations.add(url.href.replace(/^https:\/\/forju\.at\/de(?=[/?#]|$)/, 'https://forju.at/en'));
    } else if (['www.linkedin.com', 'at.linkedin.com', 'de.linkedin.com'].includes(url.hostname)) {
      destinations.add(url.href);
    }
  }
}
for (const url of [...destinations].sort()) console.log('<' + url + '>');
