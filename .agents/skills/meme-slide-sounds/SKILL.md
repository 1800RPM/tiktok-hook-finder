---
name: meme-slide-sounds
description: Finds TikTok sounds that fit DBT-Mind meme slide carousels (deadpan bpd-cat memes with practical BPD/DBT tips). Use this whenever the user asks for TikTok sounds, audio, music or "Sounds" for a meme slide post, a slideshow, a carousel, or a specific post folder — in German or English, and also when they just say "was kann ich hier für Musik nehmen", "brauche noch X Sounds", or ask for more sounds after rejecting earlier ones. Also use it when they want to know whether a specific sound fits the format or is available in Germany.
---

# Finding sounds for DBT-Mind meme slides

The posts are white-background carousels: a big headline, a short practical explanation, and
deadpan reaction cats. The tone is light humour carrying real advice about living with BPD.
Sound choice either supports that double register or destroys it, and the failure is always
the same — the sound commits too hard in one direction. A goofy cartoon sound turns the advice
into a joke; a sad piano track turns the joke into a therapy post.

Everything below comes from real rounds of the user accepting and rejecting candidates. Treat
the rejections as the sharper signal: they define the edges the acceptances only hint at.

## What the user actually wants

**Leicht lustig, aber nicht übertrieben.** Playful, curious, warm. The sound should feel like
it is smiling, not laughing. Library/production music hits this more reliably than pop songs
because it was written to sit under something rather than to be the thing.

**A serious pole is allowed and wanted.** Some topics carry weight, and a warm, slightly
melancholic indie track works there — as long as it still has motion. The line is
sentimentality, not seriousness.

## Hard constraints

These are settled. Violating one wastes the user's time on a sound they cannot or will not use.

1. **55–60 seconds.** Seven slides need the length. A 34s sound loops audibly and cheapens the
   post. This is why the user preferred the 60s version of a track over its 34s original.
2. **Instrumental, or English lyrics only.** German lyrics are out — the account's slide copy
   is English and a German vocal fights it. Instrumental is safest: nothing competes with text
   the viewer has to read.
3. **Availability in Germany.** The account is a private German account. A sound that only
   appears on US posts is frequently unavailable and shows as "nicht verfügbar". This is the
   most common wasted recommendation, so prove availability rather than assume it.
4. **No sentimental piano.** Solo piano reads as grief and was rejected outright, even when
   the track was otherwise well-used.
5. **Never source from BPD/mental-health hashtags.** That surface is vent content — its top
   sounds are Novo Amor, "crying and puking", "it hurts, now that you're gone". In a sample of
   62 photo carousels there, only 3 were tip-style. Wrong register entirely.

## Calibration: accepted and rejected

The user's own verdicts. When judging a new candidate, ask which of these it most resembles.

| Verdict | Sound | Why |
|---|---|---|
| Best fit | Simple Pleasantries — Arthur Benson | Whimsical library music. Smiling, not joking |
| Accepted | Curious Little Creatures — BlueWhaleMusic | Curious, tapsy. Fits cats without being a cat gag |
| Accepted | Funny and Unusual Scene — HarmonicoHCO | The genre standard for deadpan memes |
| Accepted | This Is The Life (Sped Up) — Amy Macdonald | Upbeat folk, English vocal, never silly |
| Accepted | Cats - Sped Up — The Living Tombstone | Playful, on-theme |
| Accepted, serious pole | Need 2 — Pinegrove | Warm, slightly melancholic, still has motion |
| Rejected | For The Summer, Or Forever — Halftribe | Not available in DE. Only ever seen on US posts |
| Rejected | QKThr — Aphex Twin, Lights Are On — Edith Whiskers | Pure piano, far too sentimental |
| Rejected | Einmal um die Welt — CRO | German track. No German music |
| Rejected | Dreams - Acoustic — Jada Facer | Generic singer-songwriter, no character |

## Method

### 1. Read the post first

If the user points at a folder or slides, look at slide 1 and one middle slide. The topic
shifts the balance: chores and small habits take the playful end, while a topic about shame or
spiralling takes the Need-2 end. Say which way you are leaning and why.

### 2. Collect from the right surfaces

Use `scripts/find_sounds.py`. It handles collection, dedupe, filtering and the saturation check.

```bash
python scripts/find_sounds.py --tags katzen,katzenmemes,memesdeutsch,humordeutsch,alltag \
  --region DE --pages 2 --out candidates.json
```

Two things the script encodes that are easy to get wrong:

- **Hashtag search only.** `search/keyword` returns videos exclusively, never photo carousels,
  so it cannot see this format at all.
- **`--region DE` plus German hashtags is the availability test.** If a German account is
  using a track, it is licensed in Germany. There is no availability flag in the API that
  answers this. (`is_commerce_music` looks tempting and is a red herring — it marks the
  Commercial Music Library, which restricts *business* accounts. This account is private.)

Widen the hashtag set when results are thin — cat tags, everyday-life tags, humour tags, tidy
and routine tags. Avoid mental-health tags for the reason above.

### 3. Judge the shortlist

The script ranks by reuse count, then saves. Reuse beats raw plays: two independent creators
choosing the same sound for this format says more than one lucky viral post.

Then apply taste. Read the titles and artists and ask, for each: which row of the calibration
table is this closest to? Library-music artists (Arthur Benson, HarmonicoHCO, BlueWhaleMusic,
Gold-Tiger, Eitan Epstein Music, Bwd sound) are a reliable seam — when one lands, mine that
artist's neighbours. Titles in that seam describe a mood rather than a feeling: "Clumsy
Situations", "Simple Pleasantries", "Funny Comedy".

The script filters on title keywords, which cannot see two things you can:

- **Language.** A German track passes the filter silently — a run surfaced the German national
  anthem. Check the artist and title yourself.
- **Sentimentality without the word.** Ballad covers like "How to Save a Life" carry exactly
  the grief tone the user rejects, without matching any reject keyword.

Use `videos_using` only as a tiebreak. Low counts (under ~50k) offer a novelty edge; very high
counts (millions) are safe but crowded. Neither is disqualifying.

### 4. Deliver

A table, ranked, with a one-line character description per sound — that is what the user reads
to decide. Include the direct link, the saturation number and the length:

```markdown
| Sound | Videos | Länge | Charakter |
|---|---|---|---|
| [Title](https://www.tiktok.com/music/x-<id>) – Artist | 64k | 60s | one line on how it feels |
```

Answer in the language the user wrote in. They usually write German.

Two habits that have earned their place:

- **Split the list by register** when giving more than four: a playful group and a
  quieter group. The user picks per post, so grouping does real work.
- **Be explicit about evidence strength.** Most sounds appear once or twice in a sample; say
  so. The video counts are exact, the format fit is your judgement. Do not present the second
  as if it were the first.

### 5. Learn from the rejections

When the user rejects candidates, the reason is data. Add it to the calibration table in this
file so the next run starts where this one ended. A rejection reason that is never written
down gets re-suggested a week later.
