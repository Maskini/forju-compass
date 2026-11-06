"""Extract local place-name vocabulary from an already downloaded GeoNames AT.zip."""
import json
import sys
import zipfile
from pathlib import Path

with zipfile.ZipFile(sys.argv[1]) as archive:
    records = (r.split("\t") for r in archive.read("AT.txt").decode().splitlines())
    names = {r[1] for r in records if r[8] == "AT" and
             (r[7] in {"ADM1", "ADM3", "PPLC", "PPLA", "PPLA2"}
              or r[7] == "PPL" and int(r[14] or "0") >= 10000)}
out = Path(__file__).resolve().parents[1] / "knowledge/language/austrian-places.json"
out.write_text(json.dumps(sorted(names), ensure_ascii=False, indent=2) + "\n")
