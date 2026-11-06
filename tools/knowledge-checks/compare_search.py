"""Compare Compass's first cited page to local E5 retrieval using synthetic questions."""
import argparse
import hashlib
import json
import subprocess
import tempfile
import time
import os
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
BASE = "http://127.0.0.1:4327"
FILES = {
    "model_quantized.onnx": "f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193",
    "tokenizer.json": "0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39",
}


def encode(session, tokenizer, texts):
    vectors = []
    for start in range(0, len(texts), 8):
        batch = tokenizer.encode_batch(texts[start:start + 8])
        ids = np.array([row.ids for row in batch], dtype=np.int64)
        mask = np.array([row.attention_mask for row in batch], dtype=np.int64)
        inputs = {"input_ids": ids, "attention_mask": mask, "token_type_ids": np.zeros_like(ids)}
        hidden = session.run(None, {spec.name: inputs[spec.name] for spec in session.get_inputs()})[0]
        pooled = (hidden * mask[:, :, None]).sum(axis=1) / mask.sum(axis=1, keepdims=True)
        vectors.extend(pooled / np.linalg.norm(pooled, axis=1, keepdims=True))
    return np.array(vectors)


def reader_url(url, lang):
    return url.replace("https://forju.at/de", "https://forju.at/en", 1) if lang == "en" else url


def local_answers(questions):
    # A new loopback process and quota database make this reproducible and keep
    # all 12 questions away from production, providers, and other visitors.
    with tempfile.TemporaryDirectory() as work:
        env = {**os.environ, "COMPASS_LOCAL_ONLY": "true", "OPENAI_API_KEY": "", "RESEND_API_KEY": "",
               "COMPASS_CLIENT_IP_HEADER": "", "NEXT_TELEMETRY_DISABLED": "1",
               "COMPASS_QUOTA_DB": str(Path(work) / "quota.sqlite")}
        server = subprocess.Popen(["node", "node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1",
                                   "-p", "4327"], cwd=ROOT, env=env, stdout=subprocess.DEVNULL)
        try:
            for _ in range(60):
                if server.poll() is not None:
                    raise RuntimeError("Compass could not start. Build the app and leave port 4327 free.")
                try:
                    with urlopen(BASE + "/embed", timeout=1):
                        break
                except OSError:
                    time.sleep(0.25)
            for lang, query, _ in questions:
                req = Request(BASE + "/api/chat", json.dumps({"message": query}).encode(),
                              {"Content-Type": "application/json", "Accept-Language": lang})
                with urlopen(req, timeout=15) as response:
                    sources = json.load(response).get("sources", [])
                yield sources[0]["url"] if sources else None
        finally:
            server.terminate()
            server.wait(10)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model_dir", type=Path)
    args = parser.parse_args()
    for name, expected in FILES.items():
        with (args.model_dir / name).open("rb") as file:
            if hashlib.file_digest(file, "sha256").hexdigest() != expected:
                raise ValueError("Unexpected file revision: " + name)
    ort.disable_telemetry_events()
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 2
    session = ort.InferenceSession(str(args.model_dir / "model_quantized.onnx"), opts, providers=["CPUExecutionProvider"])
    tokenizer = Tokenizer.from_file(str(args.model_dir / "tokenizer.json"))
    tokenizer.enable_truncation(max_length=512)
    tokenizer.enable_padding(pad_id=1, pad_token="<pad>")

    questions = json.loads((HERE / "questions.json").read_text())
    catalog = json.loads((ROOT / "knowledge/catalog.json").read_text())
    allowed = {"forju.at", "www.linkedin.com", "de.linkedin.com", "at.linkedin.com"}
    records = [r for r in catalog if r["active"] and r["page"] == 0
               and r["kind"] in {"public-website", "public-social", "planned"}
               and urlsplit(r["sourceUrl"]).hostname in allowed and r["sourceUrl"].startswith("https://")]
    expected = {r["id"]: r for r in records}
    passages = ["passage: " + r[title] + ". " + r[content] for r in records
                for title, content in [("title", "content"), ("titleEn", "contentEn")]]
    corpus = encode(session, tokenizer, passages)
    queries = encode(session, tokenizer, ["query: " + q for _, q, _ in questions])
    answers = list(local_answers(questions))
    report = []
    for (lang, q, goal), vector, baseline in zip(questions, queries, answers, strict=True):
        nearest = records[np.argmax(corpus @ vector) // 2]
        e5_url = reader_url(nearest["sourceUrl"], lang)
        wanted = {reader_url(expected[goal][k], lang) for k in ("sourceUrl", "requestUrl") if expected[goal].get(k)} if goal else {None}
        report.append({"question": q, "expected": goal, "compass_first": baseline, "e5_first": e5_url,
                       "compass_pass": baseline in wanted, "e5_pass": e5_url in wanted})
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
