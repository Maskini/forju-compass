"""Offline retrieval/resource experiment, never part of the deployed runtime."""
import json, time, resource, sys, socket, hashlib
from pathlib import Path
from compare_search import encode, FILES
import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer
root=Path(__file__).resolve().parents[2]
def blocked(*args, **kwargs): raise RuntimeError('Network disabled in E5 experiment')
socket.socket.connect=blocked
model=Path(sys.argv[1]); cases=json.loads((root/'tools/knowledge-checks/release-cases.json').read_text())
cases=[c for c in cases if not c.get('holdout') and len(c['turns'])==1]
for name,digest in FILES.items():
 assert hashlib.sha256((model/name).read_bytes()).hexdigest()==digest
ort.disable_telemetry_events();start=time.perf_counter();options=ort.SessionOptions();options.intra_op_num_threads=2
session=ort.InferenceSession(str(model/'model_quantized.onnx'),options,providers=['CPUExecutionProvider'])
tokenizer=Tokenizer.from_file(str(model/'tokenizer.json'));tokenizer.enable_truncation(max_length=512);tokenizer.enable_padding(pad_id=1,pad_token='<pad>')
load=time.perf_counter()-start
cards=[c for c in json.loads((root/'knowledge/catalog.json').read_text()) if c['active']]
start=time.perf_counter();vectors=encode(session,tokenizer,['passage: '+c[t]+'. '+c[v] for c in cards for t,v in [('title','content'),('titleEn','contentEn')]])
index_time=time.perf_counter()-start
rows=[];times=[]
for c in cases:
 start=time.perf_counter();q=encode(session,tokenizer,['query: '+c['turns'][0]])[0];times.append((time.perf_counter()-start)*1000)
 scores=vectors@q;best=int(np.argmax(scores));card=cards[best//2]
 rows.append({'id':c['id'],'expected':c['topic'],'e5Topic':card['id'],'cosine':float(scores[best]),'pass':card['id']==c['topic']})
rss=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*(1 if sys.platform=='darwin' else 1024)
print(json.dumps({'scope':'local CPU; no network; nearest neighbour only, not answer generation; no calibrated abstention', 'loadMs':load*1000,'indexMs':index_time*1000,'p95QueryMs':float(np.percentile(times,95)),'peakRssBytes':rss,'modelBytes':sum((model/n).stat().st_size for n in FILES),'passed':sum(c['pass'] for c in rows),'total':len(rows),'results':rows},indent=2))
