#!/usr/bin/env python3
"""Build an offline, sanitized research copy of a captured public hotel SERP.

This is a mechanical conversion of production DOM/CSS, not a new UI kit.
The raw capture is never copied into the artifact: it contains runtime state.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import shutil
from pathlib import Path
from urllib.parse import urlparse

from lxml import etree, html


ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parents[2]
DEFAULT_SOURCE = Path('/private/tmp/travel-apartments-rendered.html')
DEFAULT_MANIFEST = Path('/var/folders/nq/701_m3mx73z0hpglbnbpp2p80000gn/T/browser-use/assets/79116fcb-296c-4f8c-aa86-235b4f781658/manifest.json')
CLASS = "contains(concat(' ', normalize-space(@class), ' '), ' {} ')"
TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
APARTMENTS = [
    ('Светлая студия у парка', 'apartment-01.png'),
    ('Квартира с видом на набережную', 'apartment-02.png'),
    ('Уютная квартира на тихой улице', 'apartment-03.png'),
    ('Студия в центре Москвы', 'apartment-04.png'),
    ('Двухкомнатная квартира у метро', 'apartment-05.png'),
    ('Апартаменты с панорамными окнами', 'apartment-06.png'),
    ('Квартира рядом с Арбатом', 'apartment-07.png'),
    ('Студия с отдельной кухней', 'apartment-08.jpg'),
    ('Просторная квартира для двоих', 'apartment-09.jpg'),
    ('Квартира с балконом у парка', 'apartment-10.jpg'),
]
# A nonuniform but stable sample: switching names must not change the stimulus.
PAYMENT_CARD_INDEXES = {0, 2, 3, 6, 8}
DEFAULT_PAYMENT_LABEL = 'Постоплата на месте'


def cls(root, name):
    return root.xpath('.//*[' + CLASS.format(name) + ']')


def remove(node):
    """Remove only the subtree, preserving following text in its parent.

    React places comment boundaries between words and text fragments. lxml's
    parent.remove(node) also discards node.tail, which can contain hotel names,
    prices, or significant spaces even when the removed node is just a comment.
    """
    parent = node.getparent()
    if parent is not None:
        if node.tail:
            previous = node.getprevious()
            if previous is None:
                parent.text = (parent.text or '') + node.tail
            else:
                previous.tail = (previous.tail or '') + node.tail
            node.tail = None
        parent.remove(node)


def normalize_picture_sources(doc):
    """Repair libxml2's treatment of the HTML5 void element <source>.

    lxml's HTML parser may incorrectly nest the following <img> inside a
    <source>. Make those nodes siblings before removing unused dark sources;
    otherwise removing a source also removes the visible fallback logo.
    """
    for picture in doc.xpath('//picture'):
        for source in picture.xpath('.//source'):
            parent = source.getparent()
            position = parent.index(source) + 1
            for child in list(source):
                parent.insert(position, child)
                position += 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--manifest', type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument('--cards', type=int, default=10)
    args = parser.parse_args()
    source = args.source.read_text(encoding='utf-8')
    doc = html.document_fromstring(source)
    normalize_picture_sources(doc)
    # The recent-filter island is explicitly excluded from this research screen.
    for button in doc.xpath('//button[contains(.,"Прошлые фильтры")]'):
        fieldset = button.xpath('ancestor::fieldset[1]')[0]
        wrapper = fieldset.getparent()
        remove(wrapper if wrapper.get('class') == 'tg8vz' else fieldset)
    # Extend the existing published checkbox group, retaining its native states.
    payment_group = doc.xpath('//fieldset[.//legend[contains(.,"Оплата и бронирование")]]')[0]
    payment_choices = cls(payment_group, 'vw5p4')[0]
    payment_choice = copy.deepcopy(payment_choices.xpath('./label')[0])
    payment_input = payment_choice.xpath('.//input')[0]
    payment_input.attrib.pop('aria-label', None)
    payment_input.attrib.pop('checked', None)
    payment_input.set('data-payment-filter', '')
    payment_input.set('value', 'research-payment')
    payment_label = cls(payment_choice, 'ob4ed')[0]
    payment_label.text = DEFAULT_PAYMENT_LABEL
    payment_label.set('data-payment-label', '')
    cls(payment_choice, 'u2K_4')[0].text = str(len(PAYMENT_CARD_INDEXES))
    payment_choices.append(payment_choice)
    original_filter_text = cls(doc, 'IlVak')[0].text_content()
    original_search_text = cls(doc, 'hotelsSearchForm')[0].text_content()
    original_logo_images = [(pic.get('class'), dict(pic.xpath('./img')[0].attrib))
                            for pic in doc.xpath('//header//picture[@class]')]
    bundle = json.loads(args.manifest.read_text())['assets']
    available = {a['url']: a for a in bundle if 'get-yapic' not in a['url']}
    assets_dir = ROOT / 'assets'
    assets_dir.mkdir(parents=True, exist_ok=True)
    copied, missing = {}, {}

    def local_asset(url, context='image'):
        url = url.strip().strip('\"\'')
        if not url or url.startswith(('#', 'data:')):
            return url
        if url.startswith('assets/'):
            assert (ROOT / url).is_file(), f'Missing local research asset: {url}'
            return url
        if url.startswith('//'):
            url = 'https:' + url
        if 'get-yapic' in url:
            return TRANSPARENT
        item = available.get(url)
        mime = item.get('contentType', '') if item else ''
        ext = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
               'image/svg+xml': '.svg', 'image/gif': '.gif', 'text/css': '.css'}.get(mime)
        if not ext:
            suffix = Path(urlparse(url).path).suffix.lower()
            ext = suffix if suffix in {'.svg', '.jpg', '.jpeg', '.png', '.webp', '.gif'} else '.jpg'
        name = hashlib.sha256(url.encode()).hexdigest()[:16] + ext
        target = assets_dir / name
        if item and Path(item['path']).is_file():
            if not target.exists():
                shutil.copyfile(item['path'], target)
            copied[url] = {'path': 'assets/' + name, 'url': url, 'contentType': mime}
        elif target.is_file():
            copied[url] = {'path': 'assets/' + name, 'url': url, 'contentType': mime, 'completedLocally': True}
        else:
            missing[url] = {'url': url, 'path': 'assets/' + name, 'context': context}
        return 'assets/' + name

    # Include styles loaded after hydration, retaining their original position.
    for link in doc.xpath('//link[@rel="stylesheet"]'):
        item = available.get(link.get('href'))
        if item and Path(item['path']).is_file():
            style = etree.Element('style')
            style.text = Path(item['path']).read_text(encoding='utf-8')
            link.getparent().replace(link, style)
        else:
            local_asset(link.get('href'), 'missing stylesheet')

    # Retain native CSS, minus remote font definitions. Exact local YS fonts are
    # loaded through BaseAI/fonts.css without mixing in archived Base2.0 styles.
    for style in doc.xpath('//style'):
        css = re.sub(r'@font-face\s*\{[^}]+\}', '', style.text or '')
        css = re.sub(r'url\(([^)]+)\)', lambda m: 'url("' + local_asset(m.group(1), 'CSS') + '")', css)
        style.text = css
        style.attrib.clear()

    for node in doc.xpath('//script|//iframe|//noscript|//link|//base|//template|//source[contains(@media,"dark")]'):
        remove(node)
    for node in doc.xpath('//meta'):
        if node.get('charset') or node.get('name') in {'viewport', 'format-detection'}:
            continue
        remove(node)
    for node in doc.xpath('//comment()'):
        remove(node)

    # Remove the entire below-results SEO/footer island, not the filter sidebar.
    for node in cls(doc, 'zSxKM'):
        remove(node)
    # This research copy is a fixed 10-card slice, not a paginated search.
    for node in cls(doc, 'JYmb1'):
        remove(node)
    for anchor in doc.xpath('//a[@href]'):
        if re.search(r'/business/|/spec/b2b/|business\.go\.yandex', anchor.get('href', '')):
            parent = anchor.getparent()
            remove(parent if parent.tag == 'li' and len(parent) == 1 else anchor)

    cards = doc.xpath('//*[@data-seo="hotel_snippet"]')
    assert len(cards) >= args.cards, 'Capture contains fewer hotel cards than requested'
    result_list = cards[0].getparent().getparent()
    retained_lis = {card.getparent() for card in cards[:args.cards]}
    for child in list(result_list):
        if child not in retained_lis:
            remove(child)

    # Keep the production apartment-card structure but use fictional identities
    # and unrelated local interior photographs, as requested for research.
    first_photo_host = cls(cards[0], 'hn0DI')[0]
    first_photo_subtree = copy.deepcopy(first_photo_host[0])
    more_source = WORKSPACE / 'BaseAI/snippets/controls/morebutton/morebutton-themes-primary-1.html'
    more_component = html.fragment_fromstring(more_source.read_text(encoding='utf-8'))
    for index, card in enumerate(cards[:args.cards]):
        title, filename = APARTMENTS[index]
        title_link = cls(card, 'Rqyz9')[0]
        for node in list(title_link):
            title_link.remove(node)
        title_link.text = title
        card.set('data-research-hotel', title)
        card.set('data-research-hotel-id', f'fictional-apartment-{index + 1:02d}')
        if index in PAYMENT_CARD_INDEXES:
            card.set('data-payment-available', 'true')
            # Figma 7052:236656: wallet 14, Body 14/18, gap 4, More Primary.
            badges = cls(card, 'ot7Ay')[0]
            badges.set('data-payment-badges', '')
            payment_row = etree.SubElement(badges, 'div', {'class': 'payment-badge'})
            etree.SubElement(payment_row, 'img', {
                'src': 'assets/payment-wallet.svg', 'width': '14', 'height': '14',
                'alt': '', 'aria-hidden': 'true',
            })
            etree.SubElement(payment_row, 'span', {
                'class': 'kdDAS b9-76', 'data-payment-label': '',
            }).text = DEFAULT_PAYMENT_LABEL
            more = copy.deepcopy(more_component)
            # ui-surface belongs to the snippet demo (8px page padding), not
            # the MoreButton. Keep the component and its theme scopes intact.
            more.set('class', ' '.join(c for c in more.get('class').split() if c != 'ui-surface')
                     + ' payment-badge__more')
            more_button = more.xpath('.//button')[0]
            more_button.set('data-payment-details', '')
            more_button.set('aria-label', 'Подробнее об оплате')
            more_button.set('aria-expanded', 'false')
            payment_row.append(more)
        # Native photo ribbons stay: only standalone advertising was excluded.
        photo_host = cls(card, 'hn0DI')[0]
        for node in list(photo_host):
            remove(node)
        photo_host.append(copy.deepcopy(first_photo_subtree))
        slides = cls(photo_host, 'Puoci')
        for slide in slides[1:]:
            remove(slide)
        image = photo_host.xpath('.//img')[0]
        image.set('src', 'assets/' + filename)
        image.set('alt', title)
        image.attrib.pop('srcset', None)
        image.set('loading', 'eager')
        # These fictional offers rent the entire apartment, never hostel beds
        # or a combination of hotel rooms. Keep the source subtitle wrappers.
        room_summary = cls(card, 'Gq4Rh')[0]
        for child in list(room_summary)[1:]:
            room_summary.remove(child)
        room_line = etree.SubElement(room_summary, 'span')
        etree.SubElement(room_line, 'span').text = 'Квартира целиком'
        for span in card.xpath('.//span[not(*)]'):
            if span.text == 'Апартаменты':
                span.text = 'Квартира'
    original_card_text = [card.text_content() for card in cards[:args.cards]]

    # Source map is a hydration-only placeholder. Keep its native outer layout.
    map_host = (cls(doc, 'VX9pk') or cls(doc, 'l-i-G'))[0]
    map_host.set('id', 'research-map')
    map_host.set('aria-label', 'Карта квартир Москвы')
    map_host.set('data-research-map', 'restored-archive-map')
    for node in list(map_host):
        remove(node)

    # Public header/filter DOM is retained; prevent all original navigation,
    # tracking and requests. Parent-owned local JS supplies prototype actions.
    for node in doc.iter():
        if not isinstance(node.tag, str):
            continue
        for key in list(node.attrib):
            if key.lower().startswith('on') or key in {'nonce', 'integrity', 'crossorigin', 'ping', 'srcdoc'}:
                del node.attrib[key]
            if key.startswith('data-') and re.search(r'metr|track|counter|request|session|stat|log|puid|yandexuid', key, re.I):
                del node.attrib[key]
        if node.tag == 'a':
            node.set('href', '#')
            node.attrib.pop('target', None)
        if node.tag == 'form':
            node.attrib.pop('action', None)
            node.attrib.pop('method', None)
        if node.tag in {'img', 'source', 'image'}:
            for attr in ('src', 'href', 'xlink:href'):
                if node.get(attr):
                    node.set(attr, local_asset(node.get(attr)))
            if node.get('srcset'):
                node.set('srcset', ', '.join(local_asset(part.strip().split()[0]) +
                    (' ' + ' '.join(part.strip().split()[1:]) if len(part.strip().split()) > 1 else '')
                    for part in node.get('srcset').split(',')))
        if node.get('style'):
            node.set('style', re.sub(r'url\(([^)]+)\)', lambda m: 'url("' + local_asset(m.group(1), 'inline CSS') + '")', node.get('style')))

    head = doc.find('head')
    doc.set('class', 'theme_light')
    doc.find('body').set('class', 'fontsLoaded YaTravelUIKit__pointerfocus')
    title = head.find('title')
    if title is None:
        title = etree.SubElement(head, 'title')
    title.text = 'Квартиры в Москве — прототип исследования способов оплаты'
    if not head.xpath('./meta[@charset]'):
        head.insert(0, etree.Element('meta', charset='utf-8'))
    if not head.xpath('./meta[@name="viewport"]'):
        head.insert(1, etree.Element('meta', name='viewport', content='width=device-width, initial-scale=1'))
    fonts = etree.Element('link', rel='stylesheet', href='../../../BaseAI/fonts.css')
    head.insert(2, fonts)
    # Only the new MoreButton uses BaseAI. Captured production styles follow it
    # and remain authoritative for the unchanged search-page components.
    head.insert(3, etree.Element('link', rel='stylesheet', href='../../../BaseAI/library.css'))
    def versioned(filename):
        return filename + '?v=' + hashlib.sha256((ROOT / filename).read_bytes()).hexdigest()[:10]

    head.append(etree.Element('link', rel='stylesheet', href=versioned('local-overrides.css')))
    tooltip = etree.SubElement(doc.find('body'), 'div', {
        'id': 'payment-details-tooltip', 'role': 'tooltip', 'hidden': 'hidden',
        'class': '_8tU4s f49UU _9MOQ8 wDrws NPrA8 Eqn7e i9Gsh',
    })
    etree.SubElement(tooltip, 'div', {'class': 'payment-details-tooltip__content kdDAS b9-76'}).text = (
        'При бронировании можно оплатить часть стоимости, а остаток при заселении '
        'картой, переводом или наличными. Сумма предоплаты будет указана в условиях бронирования'
    )
    doc.find('body').append(etree.Element('script', src=versioned('prototype.js'), defer='defer'))
    doc.find('body').append(etree.Element('script', src=versioned('payment-naming.js'), defer='defer'))
    assert [card.text_content() for card in doc.xpath('//*[@data-seo="hotel_snippet"]')] == original_card_text, \
        'Sanitization changed hotel card text or whitespace'
    assert cls(doc, 'IlVak')[0].text_content() == original_filter_text, \
        'Sanitization changed filter text or whitespace'
    assert cls(doc, 'hotelsSearchForm')[0].text_content() == original_search_text, \
        'Sanitization changed search form text or whitespace'
    for picture_class, attributes in original_logo_images:
        picture = cls(doc, picture_class)[0]
        images = picture.xpath('./img')
        assert len(images) == 1, f'Missing header picture image: {picture_class}'
        expected = dict(attributes)
        expected['src'] = local_asset(attributes['src'])
        assert dict(images[0].attrib) == expected, f'Header logo changed: {picture_class}'
    output = '<!DOCTYPE html>\n' + html.tostring(doc, encoding='unicode', method='html')
    assert 'get-yapic' not in output
    assert '__PRELOADED_REDUX_STATE__' not in output
    assert not re.search(r'<(?:iframe|noscript)\b', output)
    (ROOT / 'index.html').write_text(output, encoding='utf-8')
    (assets_dir / 'manifest.json').write_text(json.dumps({'assets': list(copied.values())}, ensure_ascii=False, indent=2) + '\n')
    (assets_dir / 'missing-assets.json').write_text(json.dumps({'assets': list(missing.values())}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'cards': len(retained_lis), 'copiedAssets': len(copied), 'missingAssets': len(missing),
                      'outputBytes': len(output.encode()), 'mapHook': '#research-map'}, ensure_ascii=False))
    for item in missing.values():
        print(item['context'], item['path'], item['url'])


if __name__ == '__main__':
    main()
