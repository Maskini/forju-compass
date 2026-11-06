import fs from 'node:fs';
const report=JSON.parse(fs.readFileSync('/out/zap.json','utf8'));
const alerts=report.site.flatMap(s=>s.alerts);
const reviewed = alert => {
  if (String(alert.pluginid)==='10055') return alert.name==='CSP: style-src unsafe-inline';
  // A browser's HTML form POST to this JSON-only endpoint is rejected with
  // 415. Cross-origin JSON is rejected with 403. Both checks run in security.mjs.
  return String(alert.pluginid)==='10202' && alert.instances.length>0
    && alert.instances.every(instance=>instance.evidence.includes('action="/api/feedback"'));
};
const unreviewed=alerts.filter(a=>Number(a.riskcode)>=2 && !reviewed(a));
console.log(JSON.stringify(alerts.map(({name,riskdesc,count})=>({name,riskdesc,count})),null,2));
if(unreviewed.length)throw Error('Unreviewed medium/high alerts: '+unreviewed.map(a=>a.name).join(', '));
