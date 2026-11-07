# Local, synthetic model benchmark

This is a development tool, not an app backend. `npm run benchmark:local` uses
Node's built-in fetch and the literal loopback address `127.0.0.1:11439` only.
It has no access to chat logs or environment credentials. The only prompts are
fixed synthetic questions plus approved public catalog fields. Context selection
is fixed to isolate generation quality; this is **not** an end-to-end RAG score.

Install a portable [Ollama](https://github.com/ollama/ollama/releases) binary in an
ignored `work/` directory and retain its license notices. The tested version is
0.40.15. Start it in a separate terminal from the repository root:

```sh
OLLAMA_HOST=127.0.0.1:11439 OLLAMA_MODELS="$PWD/work/local-models" OLLAMA_NO_CLOUD=1 OLLAMA_NUM_PARALLEL=1 ./work/ollama/ollama serve
```

Then download the fixed public model (a one-time external registry download):

```sh
OLLAMA_HOST=127.0.0.1:11439 ./work/ollama/ollama pull qwen3:1.7b
npm run benchmark:local
```

No paid API or account is used. Inference is local; leave `OLLAMA_NO_CLOUD=1`
enabled. The tool rejects non-loopback endpoints and remote models. Stop the
private Ollama process when finished. Model files use local disk space and
inference uses the laptop's resources; no cloud deployment is made or implied.

The report records the digest, runtime version, memory allocation, timings and
actual responses. Automatic phrase checks are only preliminary: read **every**
answer against the supplied public facts. In the 7 November experiment several
answers passed phrase checks but invented details. Do not connect this model to
visitors on the strength of that score.

Ollama is MIT licensed; Qwen3 is Apache-2.0 licensed. The corresponding notices
are retained under `docs/licenses/`. No model weights or third-party source code
are included in the repository. The benchmark program itself is original work.
Production dependencies and provider configuration are unchanged.
