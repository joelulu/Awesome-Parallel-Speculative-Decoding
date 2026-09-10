"""Fetch original abstracts and render actual first-page thumbnails.

Optional maintenance command: pip install requests beautifulsoup4 pymupdf
English research material stays in ignored .cache; reviewed Chinese translations
are maintained separately in src/data/abstracts.json.
"""
import concurrent.futures, json, re, sys
from pathlib import Path
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup
import fitz

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/papers'
ASSETS = ROOT / 'public/papers'
CACHE.mkdir(parents=True, exist_ok=True)
ASSETS.mkdir(parents=True, exist_ok=True)
methods = json.loads((ROOT / 'src/data/methods.json').read_text(encoding='utf-8'))
metadata_path = ROOT / 'src/data/paper-metadata.json'
existing_metadata = json.loads(metadata_path.read_text(encoding='utf-8')) if metadata_path.exists() else {}

def fetch(method):
    ident = method['id']
    if existing_metadata.get(ident, {}).get('kind') == 'article' and not method['paperUrl']:
        return {'id': ident, **existing_metadata[ident]}
    url = method['paperUrl'] or method['sourceUrl']
    result = {'id': ident, 'sourceUrl': url, 'status': 'unavailable'}
    try:
        response = requests.get(url, timeout=22)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        if 'arxiv.org/abs/' not in url:
            paper_link = next((a.get('href') for a in soup.select('a[href]') if re.match(r'https://arxiv.org/abs/\d', a.get('href', ''))), None)
            if paper_link:
                url = paper_link
                response = requests.get(url, timeout=22)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')
        def meta(name):
            tag = soup.find('meta', attrs={'name': name})
            return tag.get('content') if tag else None
        abstract = soup.select_one('blockquote.abstract')
        if not abstract:
            result['error'] = 'Original paper abstract not found'
            return result
        result.update(status='fetched', sourceUrl=url, title=meta('citation_title'),
            authors=[m.get('content') for m in soup.find_all('meta', attrs={'name':'citation_author'})],
            abstract=re.sub(r'^\s*Abstract:\s*', '', abstract.get_text(' ', strip=True)),
            pdfUrl=meta('citation_pdf_url'), fetchedAt=datetime.now(timezone.utc).isoformat())
        if result['pdfUrl']:
            try:
                pdf_path = CACHE / f'{ident}.pdf'
                if not pdf_path.exists():
                    pdf = requests.get(result['pdfUrl'], timeout=35)
                    pdf.raise_for_status()
                    if not pdf.content.startswith(b'%PDF'): raise ValueError('Not a PDF response')
                    pdf_path.write_bytes(pdf.content)
                with fitz.open(pdf_path) as doc:
                    page = doc[0]
                    image = page.get_pixmap(matrix=fitz.Matrix(360 / page.rect.width, 360 / page.rect.width), alpha=False)
                    image.save(str(ASSETS / f'{ident}.jpg'), jpg_quality=86)
                result['thumbnail'] = f'papers/{ident}.jpg'
            except Exception as error:
                result['thumbnailError'] = str(error)[:140]
    except Exception as error:
        result['error'] = str(error)[:140]
    (CACHE / f'{ident}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    return result

selected = set(sys.argv[1:])
previous_path = CACHE / 'sources.json'
previous = json.loads(previous_path.read_text(encoding='utf-8')) if previous_path.exists() else []
results = {r['id']: r for r in previous}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for result in pool.map(fetch, [m for m in methods if not selected or m['id'] in selected]):
        if result['status'] == 'fetched' or result['id'] not in results:
            results[result['id']] = result
        print(result['id'], result['status'], result.get('title', ''), 'thumbnail' if result.get('thumbnail') else '', flush=True)
results = list(results.values())
(CACHE / 'sources.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
public = {r['id']: {k:v for k,v in r.items() if k not in ['id','abstract','error','thumbnailError']} for r in results}
(ROOT / 'src/data/paper-metadata.json').write_text(json.dumps(public, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('Fetched', sum(r['status']=='fetched' for r in results), 'of', len(results), flush=True)
