import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const dir=process.argv[2];
if(!dir)throw Error('Pass the evidence directory');
const json=name=>existsSync(join(dir,name))?JSON.parse(readFileSync(join(dir,name),'utf8')):null;
const rows=readFileSync(join(dir,'status.tsv'),'utf8').trim().split('\n').map(l=>l.split('\t'));
const lines=['# Local Compass release evidence','','| Check | Result |','|---|---|',...rows.map(([stage,status])=>'| '+stage+' | '+status+' |'),''];
const qa=json('promptfoo.json')?.results?.results;
if(qa){
 lines.push('## Answers tested over HTTP','',...qa.map(r=>'- '+(r.success?'PASS':'FAIL')+' — '+r.vars.caseId+' — '+r.gradingResult.reason),'');
}
const browser=json('playwright.json');
if(browser){
  lines.push('## Visitor journeys','','| Engine | Journey | Result |','|---|---|---|');
  function collect(suite){
    for(const item of suite.specs||[])for(const t of item.tests){
      const r=t.results.at(-1);
      lines.push('| '+t.projectName+' | '+item.title+' | '+(r?.status||'untested')+' |');
    }
    for(const s of suite.suites||[])collect(s);
  }
  collect(browser);lines.push('');
}
const perf=json('load.json')?.metrics;
if(perf)lines.push('## Isolated k6 workload','',
  'Normal p95 '+perf.normal_ms['p(95)'].toFixed(1)+' ms. Burst p95 '+perf.burst_ms['p(95)'].toFixed(1)+' ms (includes HTTP 429).',
  'HTTP 200: '+perf.accepted.count+'. Expected HTTP 429: '+perf.expected_429.count+'. Unexpected responses: '+perf.unexpected_errors.count+'.',
  'See load.log for the real reset/recovery check.','');
const zap=json('zap.json');
if(zap)lines.push('## Passive scan','',...zap.site.flatMap(site=>site.alerts.map(a=>'- '+a.riskdesc+' — '+a.name+' ('+a.count+' instances)')),'');
lines.push('## Scope','','All online tools in this run talked only to loopback. The mail receipts are from a simulated provider and local inbox. Citation pages were reviewed separately. AI mode, live inbox delivery, physical phones and the actual ForJu website installation require separate evidence.');
writeFileSync(join(dir,'summary.md'),lines.join('\n')+'\n');
