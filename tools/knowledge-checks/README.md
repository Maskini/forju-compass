# Local quality checks

Use Node 24 for the app and Python 3.12 for the optional tools. Run commands from the repository root. The local tools use synthetic questions and approved public pages. They do not send emails or update the catalog.

## Conversation tests

Run `npm ci && npm test`. The [fast-check](https://github.com/dubzzz/fast-check) properties in `tests/chat-route.test.mjs` exercise the actual route handler with isolated provider and quota stubs. There are 60 runs for coverage plus price and 40 for month corrections. The generated cases can repeat. Fixed seeds make failures reproducible. The ordinary browser suite also checks the German price follow-up in the mobile layout.

## Watch the sources

```sh
python3.12 -m venv work/quality-tools
work/quality-tools/bin/python -m pip install urlwatch==2.29
tools/knowledge-checks/watch.sh
```

Run the last command again to see a text diff when workshops, equipment, funding or contact information changes. The first run creates a baseline. For example, use `tools/knowledge-checks/watch.sh --dump-history 1` to inspect the workshop snapshot. The script reads the four official URLs in `pages.yaml`, filters to the main text and email links, and prints results to the terminal. Snapshots are stored in `work/source-watch/`. Review changes against the sources before editing the catalog. Runs are on demand. [urlwatch documentation](https://urlwatch.readthedocs.io/en/latest/)

## Compare bilingual search

```sh
work/quality-tools/bin/python -m pip install -r tools/knowledge-checks/requirements.txt
mkdir -p work/quality-models/e5
base=https://huggingface.co/Xenova/multilingual-e5-small/resolve/761b726dd34fb83930e26aab4e9ac3899aa1fa78
curl --fail --location "$base/onnx/model_quantized.onnx" -o work/quality-models/e5/model_quantized.onnx
curl --fail --location "$base/tokenizer.json" -o work/quality-models/e5/tokenizer.json
npm ci && npm run build
work/quality-tools/bin/python tools/knowledge-checks/compare_search.py work/quality-models/e5
```

The runner checks both file hashes before loading the pinned model on the CPU. It encodes approved German and English summaries and compares the closest page with the first link from the real local-only Compass endpoint. It starts an isolated production server on port 4327 with a temporary quota database. Model downloads are needed once. During comparison, the only HTTP requests are to loopback. Change the questions in `questions.json` to extend the evaluation, allowing for the production rate limit of 12 requests per minute.

In the baseline (5e5a8b6), the first page matched the expected destination for **7/10** in-scope questions using Compass and **8/10** using E5 nearest-neighbour retrieval. The two out-of-scope questions got unrelated links from both. E5 found a scientific introduction, project funding, and donation acknowledgement that Compass missed. It missed equipment and partner-pool requests that Compass got right. These are first-page results on ten synthetic tasks, not answer-accuracy estimates. After updating local matching, Compass returns the intended record and page for all ten and offers relevant next-step buttons with no source links on both unrelated questions. The runner now scores the specific topic as well as the URL, since several workshop and job records share a page. The separate ten examples in `visitor-phrasing.json` run with the Node chat route tests. These sets protect known behavior and do not measure real-user success. The E5 experiment runs only on the maintainer’s machine. [Original E5 model, MIT license](https://huggingface.co/intfloat/multilingual-e5-small) and [quantized ONNX conversion](https://huggingface.co/Xenova/multilingual-e5-small).

License notices for installed packages remain in their distributions. fast-check is MIT and urlwatch uses a three-clause BSD license. The E5 weights and Python packages are kept under ignored `work/` when you follow the commands above.
