#!/usr/bin/env python3
"""
Chunk a seed-tools migration file into per-tool SQL chunks for the
b64 applier. Handles:
  - splitting one big INSERT INTO tools (...) VALUES (...); into N per-tuple chunks
  - stripping any trailing ON CONFLICT from the last tuple before re-appending
  - escaping unescaped apostrophes inside '{"..."}' PG array literals
  - grouping the trailing category-link INSERTs into ~30-stmt chunks

Usage:
  python3 scripts/chunk-seed-migration.py <migration_file> <output_dir>
"""
import os, re, sys, glob, shutil

if len(sys.argv) != 3:
    print(__doc__)
    sys.exit(1)

src_path = sys.argv[1]
out_dir = sys.argv[2]
src = open(src_path).read()

if os.path.isdir(out_dir):
    shutil.rmtree(out_dir)
os.makedirs(out_dir, exist_ok=True)

m = re.search(r'INSERT INTO tools\s*\([^)]+\)\s*VALUES\s*\n', src, re.DOTALL)
if not m:
    raise SystemExit('no INSERT INTO tools VALUES found')
header = m.group(0).rstrip() + '\n'
body_start = m.end()
rest_start = src.find('INSERT INTO tool_categories', body_start)
if rest_start == -1:
    rest_start = len(src)
body = src[body_start:rest_start]
rest = src[rest_start:]

end_semi = body.rfind(';')
tuples_block = body[:end_semi]

lines = tuples_block.split('\n')
chunks = []
cur = []
for ln in lines:
    if ln.startswith("('") and cur:
        chunks.append('\n'.join(cur).rstrip().rstrip(','))
        cur = [ln]
    else:
        cur.append(ln)
if cur:
    chunks.append('\n'.join(cur).rstrip().rstrip(','))

def fix_apostrophes(s: str) -> str:
    def fix_block(m):
        body = m.group(1)
        return "'{" + re.sub(r"(?<!')'(?!')", "''", body) + "}'"
    return re.sub(r"'\{([^{}]*?)\}'", fix_block, s)

for n, c in enumerate(chunks, 1):
    c = c.replace('ON CONFLICT (slug) DO NOTHING', '').rstrip().rstrip(',')
    sql = header + c + ' ON CONFLICT (slug) DO NOTHING;\n'
    sql = fix_apostrophes(sql)
    with open(os.path.join(out_dir, f'tool_{n:03d}.sql'), 'w') as f:
        f.write(sql)

cat_stmts = [s.strip() for s in rest.split(';\n') if s.strip()]
chunk_size = 30
cat_n = 0
for i in range(0, len(cat_stmts), chunk_size):
    cat_n += 1
    body = ';\n'.join(cat_stmts[i:i+chunk_size]) + ';\n'
    with open(os.path.join(out_dir, f'zcat_{cat_n:02d}.sql'), 'w') as f:
        f.write(body)

print(f'wrote {len(chunks)} tool chunks + {cat_n} cat chunks to {out_dir}')
