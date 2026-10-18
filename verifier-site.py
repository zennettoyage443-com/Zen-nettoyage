#!/usr/bin/env python3
"""Contrôle qualité du site www.zennettoyage.fr — à lancer avant chaque dépôt.

Usage :
    python3 scripts/verifier-site.py            # toutes les pages
    python3 scripts/verifier-site.py index.html # une ou plusieurs pages

Python 3 standard uniquement, lecture seule : ne modifie aucun fichier.
Code de sortie 1 s'il y a au moins une ERREUR (les AVERTISSEMENTS ne bloquent pas).
"""
import glob
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://www.zennettoyage.fr'
SIRET = '853 634 616 00025'
EXCLUS = {'bloc-carrousel-images-homepage.html'}          # fragment, pas une page
SANS_MENAGE = {'mentions-legales.html', 'partenaires.html'}  # pages non commerciales
MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
        'septembre', 'octobre', 'novembre', 'décembre']


def attr(tag, name):
    m = re.search(r'\b' + name + r'\s*=\s*"([^"]*)"', tag, re.I)
    return html.unescape(m.group(1)) if m else None


def meta(src, name):
    for tag in re.findall(r'<meta\b[^>]*>', src, re.I):
        if (attr(tag, 'name') or '').lower() == name:
            return attr(tag, 'content')
    return None


def texte(fragment):
    t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', fragment))).strip()
    return re.sub(r'\s+([.,)])', r'\1', t)


def visible(src):
    body = src.split('</head>', 1)[-1]
    body = re.sub(r'<(script|style|noscript|svg)\b[\s\S]*?</\1>', ' ', body, flags=re.I)
    return texte(body)


def jsonld(src):
    out = []
    for sc in re.findall(r'<script type="application/ld\+json">([\s\S]*?)</script>', src):
        try:
            out.append(json.loads(sc))
        except ValueError as e:
            out.append(e)
    return out


def trouver(obj, cle):
    if isinstance(obj, dict):
        if cle in obj:
            yield obj
        for v in obj.values():
            yield from trouver(v, cle)
    elif isinstance(obj, list):
        for v in obj:
            yield from trouver(v, cle)


def faq_jsonld(blocs):
    for b in blocs:
        for o in trouver(b, '@type'):
            if o.get('@type') == 'FAQPage':
                return [(texte(q['name']), texte(q['acceptedAnswer']['text'])) for q in o.get('mainEntity', [])]
    return None


def faq_visible(src):
    items = []
    for d in re.findall(r'<details\b[\s\S]*?</details>', src):
        m = re.search(r'<summary[^>]*>([\s\S]*?)</summary>([\s\S]*)</details>', d)
        if m:
            items.append((texte(m.group(1)), texte(m.group(2))))
    if not items:  # page d'accueil : .faq-item / .faq-q / .faq-a
        for d in re.findall(r'<div class="faq-item"[\s\S]*?(?=<div class="faq-item"|</section>)', src):
            q = re.search(r'class="faq-q"[^>]*>([\s\S]*?)</(?:button|div)>', d)
            a = re.search(r'class="faq-a-i"[^>]*>([\s\S]*?)</div>', d)
            if q and a:
                items.append((texte(q.group(1)), texte(a.group(1))))
    return items


def verifier(fichier):
    src = open(os.path.join(ROOT, fichier), encoding='utf-8').read()
    err, av = [], []
    vis = visible(src)
    slug = '' if fichier == 'index.html' else fichier[:-5]
    if fichier == 'nettoyage-fin-chantier-nantes-1.html':
        slug = 'nettoyage-fin-chantier-nantes'

    if src.count('</body>') != 1 or src.count('</html>') != 1:
        err.append('</body> ou </html> absent ou en double')
    if len(re.findall(r'<h1\b', src)) != 1:
        err.append('il faut exactement un H1')
    nh = len(re.findall(r'<h[1-6]\b', src))
    if nh > 22:
        err.append(f'{nh} titres (max 22)')

    m = re.search(r'<title>([\s\S]*?)</title>', src)
    t = html.unescape(m.group(1)).strip() if m else ''
    if not t or len(t) > 60:
        err.append(f'title {len(t)} caractères (max 60)')
    d = meta(src, 'description') or ''
    if not 130 <= len(d) <= 156:
        err.append(f'meta description {len(d)} caractères (130 à 156)')
    if 'noindex' in (meta(src, 'robots') or '').lower():
        err.append('page en noindex')

    can = next((attr(l, 'href') for l in re.findall(r'<link\b[^>]*>', src) if attr(l, 'rel') == 'canonical'), None)
    attendu = SITE + ('/' + slug if slug else '/')
    if can not in (attendu, attendu.rstrip('/')):
        err.append(f'canonical {can} (attendu {attendu})')

    blocs = jsonld(src)
    if any(isinstance(b, Exception) for b in blocs):
        err.append('JSON-LD invalide')
    if 'aggregateRating' in src or re.search(r'"@type"\s*:\s*"Review"', src):
        err.append('aggregateRating ou Review interdit')

    fv, fj = faq_visible(src), faq_jsonld([b for b in blocs if not isinstance(b, Exception)])
    if fj is not None or fv:
        if fj is None:
            err.append('FAQ visible sans FAQPage JSON-LD')
        elif len(fv) != len(fj):
            err.append(f'FAQ : {len(fv)} visibles / {len(fj)} JSON-LD')
        else:
            diff = [i + 1 for i, (a, b) in enumerate(zip(fv, fj)) if a != b]
            if diff and sorted(fv) == sorted(fj):
                av.append(f'FAQ : mêmes questions mais ordre différent (positions {diff})')
            elif diff:
                err.append(f'FAQ désynchronisée (questions {diff})')

    for img in re.findall(r'<img\b[^>]*>', src):
        if not attr(img, 'alt'):
            err.append('image sans alt : ' + (attr(img, 'src') or '?')[:60])
        s = attr(img, 'src') or ''
        loc = re.sub(r'^' + re.escape(SITE), '', s)
        if loc.startswith('/') and not loc.startswith('//') and not os.path.exists(os.path.join(ROOT, loc[1:])):
            err.append('image absente du dépôt : ' + loc)

    if any(len(texte(x)) > 70 for x in re.findall(r'<strong>([\s\S]*?)</strong>', src)):
        err.append('<strong> de plus de 70 caractères')
    if SIRET not in src:
        err.append('SIRET absent')
    if '-3800' in src:
        err.append('chaîne « -3800 » interdite')

    ancres = {}
    for a in re.findall(r'<a\b[^>]*>[\s\S]*?</a>', src):
        h = attr(a, 'href')
        lab = texte(a).lower()
        if h and lab and h.startswith('/'):
            ancres.setdefault(lab, set()).add(h.split('#')[0])
    dup = [k for k, v in ancres.items() if len(v) > 1]
    if dup:
        err.append('même ancre vers des pages différentes : ' + ', '.join(dup[:3]))

    n = len(re.findall(r'(?<![a-zà-ÿ])ménages?(?![a-zà-ÿ])', vis.lower()))
    if n < 10:
        (av if fichier in SANS_MENAGE else err).append(f'« ménage » {n} fois (min 10)')
    mots = len(vis.split())
    if mots > 4040:
        av.append(f'{mots} mots (Seobility signale au-delà de ~4 000)')

    m = re.search(r'class="maj-date"><time datetime="(\d{4})-(\d{2})">Mis à jour en (\w+) (\d{4})', src)
    dm = sorted(set(re.findall(r'"dateModified":\s*"(\d{4})-(\d{2})', src)))
    if m:
        y, mo, mois, an = m.groups()
        if MOIS[int(mo) - 1] != mois or y != an:
            err.append(f'maj-date : datetime {y}-{mo} ≠ « {mois} {an} »')
        if dm and (y, mo) not in dm:
            err.append(f'dateModified {dm} ≠ maj-date {y}-{mo}')
    return {'page': fichier, 'mots': mots, 'menage': n, 'erreurs': err, 'avertissements': av}


def verifier_sitemap():
    err = []
    sm = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
    vj = open(os.path.join(ROOT, 'vercel.json'), encoding='utf-8').read() if os.path.exists(os.path.join(ROOT, 'vercel.json')) else '{}'
    rew = {r['source']: r['destination'] for r in json.loads(vj).get('rewrites', [])}
    for loc in re.findall(r'<loc>([^<]+)</loc>', sm):
        p = loc.replace(SITE, '') or '/'
        dest = rew.get(p, p)
        f = 'index.html' if dest == '/' else dest.lstrip('/')
        if not f.endswith('.html'):
            f += '.html'
        if not os.path.exists(os.path.join(ROOT, f)):
            err.append(f'sitemap : {p} → {f} introuvable')
    return err


def main(args):
    pages = args or sorted(f for f in map(os.path.basename, glob.glob(os.path.join(ROOT, '*.html'))) if f not in EXCLUS)
    total_err = 0
    for f in pages:
        r = verifier(f)
        total_err += len(r['erreurs'])
        etat = 'OK ' if not r['erreurs'] else 'ERR'
        print(f"{etat} {r['page']:<58} {r['mots']:>5} mots  ménage {r['menage']:>3}")
        for e in r['erreurs']:
            print('    ✗ ' + e)
        for a in r['avertissements']:
            print('    ! ' + a)
    if not args:
        se = verifier_sitemap()
        total_err += len(se)
        for e in se:
            print('ERR ' + e)
    print(f'\n{len(pages)} pages · {total_err} erreur(s)')
    return 1 if total_err else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
