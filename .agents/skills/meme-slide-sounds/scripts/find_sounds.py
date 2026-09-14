#!/usr/bin/env python3
"""Collect TikTok sounds from hashtag surfaces and rank the ones usable under meme slides.

Why a script: every run otherwise re-invents the same collection, dedupe, filter and
saturation-check. The taste judgement stays with the model; the plumbing lives here.

Usage:
  python find_sounds.py --tags katzen,memesdeutsch --region DE --out candidates.json
  python find_sounds.py --tags catmemes --region US --pages 3 --no-verify
"""
import argparse, io, json, os, re, sys, time, urllib.request, collections

API = 'https://api.scrapecreators.com/v1/tiktok'

# Sentimental / vent markers. These sounds dominate mental-health hashtags and are the
# single most common mismatch: a sad track under a deadpan cat joke reads as a mistake.
REJECT = re.compile(
    r'\b(piano|sad|slowed|reverb|cry|crying|hurt|hurts|lonely|miss(ing)? you|funeral|'
    r'traurig|weinen|heartbreak|goodbye|grief|tears)\b', re.I)


def load_key():
    for path in ('.env', 'server/.env', os.path.expanduser('~/.env')):
        try:
            for line in io.open(path, encoding='utf8'):
                if line.startswith('SCRAPE_CREATORS_API_KEY='):
                    return line.split('=', 1)[1].strip().strip('"')
        except OSError:
            continue
    key = os.environ.get('SCRAPE_CREATORS_API_KEY')
    if key:
        return key
    sys.exit('No SCRAPE_CREATORS_API_KEY found in .env, server/.env or the environment.')


def get(url, key):
    req = urllib.request.Request(url, headers={'x-api-key': key})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def collect(tags, region, pages, key):
    """Hashtag search only. Keyword search returns videos, never photo carousels."""
    rows = []
    for tag in tags:
        cursor = None
        for _ in range(pages):
            url = f'{API}/search/hashtag?hashtag={tag}'
            if region:
                url += f'&region={region}'
            if cursor:
                url += f'&cursor={cursor}'
            try:
                data = get(url, key)
            except Exception as exc:
                print(f'  ! {tag}: {exc}', file=sys.stderr)
                break
            for item in data.get('aweme_list') or []:
                music = item.get('music') or {}
                stats = item.get('statistics') or {}
                author = (item.get('author') or {}).get('unique_id')
                rows.append({
                    'tag': tag,
                    'photo': bool(item.get('image_post_info')),
                    'plays': stats.get('play_count', 0),
                    'saves': stats.get('collect_count', 0),
                    'music_id': music.get('id_str') or str(music.get('id') or ''),
                    'title': music.get('title'),
                    'artist': music.get('author'),
                    'original': music.get('is_original_sound'),
                    'duration': music.get('duration'),
                    'url': f"https://www.tiktok.com/@{author}/photo/{item.get('aweme_id')}",
                })
            cursor = data.get('cursor')
            if not data.get('has_more') or not cursor:
                break
            time.sleep(0.25)
        print(f'  {tag}: {len(rows)} rows', file=sys.stderr)
    return rows


def rank(rows, min_dur, max_dur, photo_only):
    """Group by sound. Reuse count beats raw plays: a sound two independent creators
    picked for this format is a stronger signal than one lucky viral post."""
    groups = collections.defaultdict(
        lambda: {'uses': 0, 'plays': 0, 'saves': 0, 'best': 0, 'example': '', 'tags': set()})
    for row in rows:
        # Original sounds carry someone's voice, which fights slide text that must be read.
        if row['original'] or not row['music_id']:
            continue
        if photo_only and not row['photo']:
            continue
        if not (min_dur <= (row['duration'] or 0) <= max_dur):
            continue
        if REJECT.search(str(row['title'] or '')):
            continue
        entry = groups[row['music_id']]
        entry['uses'] += 1
        entry['plays'] += row['plays']
        entry['saves'] += row['saves']
        entry['tags'].add(row['tag'])
        if row['plays'] > entry['best']:
            entry['best'], entry['example'] = row['plays'], row['url']
        entry.update(title=row['title'], artist=row['artist'], duration=row['duration'])
    out = []
    for music_id, e in groups.items():
        e['id'] = music_id
        e['tags'] = sorted(e['tags'])
        e['link'] = f'https://www.tiktok.com/music/x-{music_id}'
        out.append(e)
    return sorted(out, key=lambda e: (-e['uses'], -e['saves']))


def verify(cands, key, limit):
    """user_count is the saturation number. Low means a novelty edge, high means safe
    but crowded. It is the tiebreak, never the ranking."""
    for cand in cands[:limit]:
        try:
            info = (get(f"{API}/song?clipId={cand['id']}", key).get('music_info') or {})
            cand['videos_using'] = info.get('user_count')
            cand['commerce'] = info.get('is_commerce_music')
        except Exception as exc:
            print(f"  ! verify {cand['id']}: {exc}", file=sys.stderr)
        time.sleep(0.2)
    return cands


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--tags', required=True, help='comma-separated hashtags, no #')
    p.add_argument('--region', default='DE', help='DE proves German availability; "" for none')
    p.add_argument('--pages', type=int, default=2)
    p.add_argument('--min-dur', type=int, default=40)
    p.add_argument('--max-dur', type=int, default=70)
    p.add_argument('--photo-only', action='store_true', help='only photo carousels')
    p.add_argument('--verify', type=int, default=25, help='how many to saturation-check')
    p.add_argument('--no-verify', action='store_true')
    p.add_argument('--out', default='candidates.json')
    a = p.parse_args()

    key = load_key()
    tags = [t.strip().lstrip('#') for t in a.tags.split(',') if t.strip()]
    print(f'Collecting {len(tags)} hashtags (region={a.region or "none"})...', file=sys.stderr)
    rows = collect(tags, a.region, a.pages, key)
    rows = list({r['url']: r for r in rows}.values())
    cands = rank(rows, a.min_dur, a.max_dur, a.photo_only)
    if not a.no_verify:
        print(f'Verifying saturation for top {a.verify}...', file=sys.stderr)
        cands = verify(cands, key, a.verify)

    json.dump(cands, io.open(a.out, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    photo = sum(r['photo'] for r in rows)
    print(f'\n{len(rows)} posts ({photo} photo carousels) -> {len(cands)} candidate sounds')
    print(f'Written to {a.out}\n')
    strip = lambda s: re.sub(r'[^\x20-\x7e]', '', str(s or '')).strip()
    print(f"{'uses':>4} {'saves':>8} {'videos':>11} {'len':>4}  title / artist")
    for c in cands[:30]:
        v = c.get('videos_using')
        print(f"{c['uses']:>4} {c['saves']:>8,} {(f'{v:,}' if v else '?'):>11} "
              f"{c['duration']:>3}s  {strip(c['title'])[:34]:34} {strip(c['artist'])[:20]}")
        print(f"      {c['link']}")


if __name__ == '__main__':
    main()
