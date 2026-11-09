# Optional semantic retrieval experiment

**Decision, 9 November 2026: do not enable this model in the visitor runtime.**
The quantized multilingual MiniLM model improved some matches but selected wrong
records for others. Its model-only Linux process was OOM-killed under 512 MiB /
0.1 CPU, before adding Next.js. Root dependencies, startup, hosting settings and
chat network destinations are unchanged. This folder is maintainer tooling only.

## Repeat the quality checks without a model download

From the repository root:

```sh
npm ci
npm test
npm run build
COMPASS_EVAL_CASES=tools/semantic-checks/cases.json node tools/knowledge-checks/evaluate.mjs after
COMPASS_EVAL_CASES=tools/semantic-checks/cases.json node tools/knowledge-checks/evaluate.mjs holdout
COMPASS_EVAL_CASES=tools/semantic-checks/fresh-cases.json node tools/knowledge-checks/evaluate.mjs after work/semantic-benchmark/fresh.json
```

These start the built production app on unused localhost port 4327 with
`COMPASS_LOCAL_ONLY=true`, empty provider keys, blocked non-loopback HTTP and a
**disposable** quota database reset between independent synthetic scenarios.
They are answer tests, not a rate-limit or delivery test. Run the complete isolated
Promptfoo/browser/security/load suite with `npm run test:release`.

## Repeat the optional model comparison

```sh
npm ci --prefix tools/semantic-checks --ignore-scripts
npm run models --prefix tools/semantic-checks
npm run benchmark --prefix tools/semantic-checks
npm run benchmark --prefix tools/semantic-checks -- --holdout
npm run resources --prefix tools/semantic-checks
```

The explicit `models` command downloads ~135 MB of public model/tokenizer data
from Hugging Face. A repository revision and SHA-256 for every file are pinned in
`model-manifest.json`; a mismatch stops setup. There is no inference API, account
or charge. Models and raw output stay in ignored `work/semantic-benchmark`.

The benchmark compares current lexical retrieval with model top-three results
from the same approved public catalog, split into separate German/English
passages (128-token model limit). Multi-turn and answer claims are checked
separately through `/api/chat`. Similarity is **not** proof of a fact. The script
uses only synthetic fixtures; do not point it at visitor transcripts. Model
inference has `allowRemoteModels=false` and blocked JS HTTP. The Linux capacity
probe additionally has **no network interface**, no swap and a 120-second limit.
The model-only gate returning non-zero is the expected rejected result on the
current budget, not a release-suite failure. No claim of cross-architecture
Render benchmarking or native-runtime telemetry auditing is made.

Install/metadata download steps access npm/Hugging Face and Docker's public
registry. Inference sends no questions to an inference service. The model is not
bundled in production; do not add it there based on a laptop latency result.

## Provenance and licenses

- Transformers.js 3.8.1 — Apache-2.0. The local-only pipeline follows its official
  [Node guide](https://huggingface.co/docs/transformers.js/v3.8.1/en/tutorials/node).
- [Sentence Transformers multilingual MiniLM](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
  and [Xenova ONNX conversion](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2)
  — Apache-2.0 according to their model cards.
- ONNX Runtime 1.21.0 — MIT, a Transformers.js tool dependency.
- Production continues to reuse MiniSearch 7.2.0 — MIT. No new runtime package.

Notices are in `docs/licenses/`. `cases.json` was annotated before examining
baseline/model results. Initial held-out failures remain in evidence; after
fixing them they became regression cases. `fresh-cases.json` was reserved for
an additional final run. One oracle correction permits a verified project enquiry
link alongside an explicit refusal to guarantee acceptance; the original failing
result is preserved. Automated regex checks still need human interpretation.
