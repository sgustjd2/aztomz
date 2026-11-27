#!/usr/bin/env python3
"""한끗 — Pretendard 가변 폰트를 core/rest 두 파일로 나눈다(사이트 첫 로딩 2.0MB → 약 470KB).

core: 영문·기본 기호 + 자주 쓰는 한글 2,350자(KS X 1001) + 지금 사이트(frontend/)에 쓰인 글자
rest: 원본의 나머지 글자 — 화면에 core에 없는 글자가 나올 때만 브라우저가 받는다(styles.css @font-face 참고)

필요: pip install fonttools brotli
실행: python3 backend/scripts/font-subset.py   (레포 루트에서)
다시 만들면 파일 이름을 바꾸고 styles.css 도 맞출 것 — 폰트는 1년 immutable 캐시(vercel.json).
rest 의 unicode-range 는 원본 폰트에 실제로 있는 글자 범위로 출력하니 styles.css 에 그대로 붙인다.
"""
import glob
import os
import subprocess
import sys
import tempfile

from fontTools.ttLib import TTFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
SRC = os.path.join(ROOT, 'backend', 'fonts', 'PretendardVariable.woff2')
OUT = os.path.join(ROOT, 'frontend', 'assets', 'fonts')


def ranges(cps):
    cps = sorted(cps)
    out, s, p = [], cps[0], cps[0]
    for c in cps[1:]:
        if c == p + 1:
            p = c
            continue
        out.append((s, p))
        s = p = c
    out.append((s, p))
    return ','.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in out)


def main():
    full = set(TTFont(SRC).getBestCmap())
    ks = set()
    for hi in range(0xB0, 0xC9):
        for lo in range(0xA1, 0xFF):
            try:
                ks.add(ord(bytes([hi, lo]).decode('euc-kr')))
            except UnicodeDecodeError:
                pass
    used = set()
    for p in glob.glob(os.path.join(ROOT, 'frontend', '**', '*'), recursive=True):
        if os.path.isfile(p) and p.endswith(('.html', '.js', '.css', '.json', '.webmanifest')):
            used |= set(map(ord, open(p, encoding='utf-8', errors='ignore').read()))
    base = (set(range(0x20, 0x7F)) | set(range(0xA0, 0x100)) | set(range(0x2000, 0x2070))
            | set(range(0x2190, 0x2200)) | set(range(0x3000, 0x3040)) | set(range(0x3131, 0x318F))
            | set(range(0xFF01, 0xFF5F)) | {0x20A9, 0x2122, 0x25B2, 0x25BC, 0x25CB})
    core = (ks | used | base) & full
    rest = full - core
    with tempfile.TemporaryDirectory() as tmp:
        for name, cps in (('core', core), ('rest', rest)):
            uf = os.path.join(tmp, name + '.txt')
            open(uf, 'w').write(','.join(f'U+{c:04X}' for c in sorted(cps)))
            dst = os.path.join(OUT, f'PretendardVariable-{name}.woff2')
            subprocess.run([sys.executable, '-m', 'fontTools.subset', SRC, f'--unicodes-file={uf}',
                            '--flavor=woff2', '--layout-features=*', f'--output-file={dst}'], check=True)
            print(f'✓ {name}: {len(cps)}자, {os.path.getsize(dst) // 1024}KB → {os.path.relpath(dst, ROOT)}')
    # rest 범위 = 원본에 실제로 있는 글자 범위 중 rest 와 겹치는 것(원본에도 없는 기호로 rest 를 헛받지 않게)
    full_ranges = []
    for part in ranges(full).split(','):
        a, _, b = part[2:].partition('-')
        full_ranges.append((int(a, 16), int(b or a, 16)))
    keep = [r for r in full_ranges if any(r[0] <= c <= r[1] for c in rest)]
    print('rest unicode-range:\n' + ','.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in keep))


if __name__ == '__main__':
    main()
