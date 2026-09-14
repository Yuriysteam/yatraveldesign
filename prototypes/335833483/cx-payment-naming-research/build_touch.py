#!/usr/bin/env python3
"""Sanitize the public Touch SERP and add the desktop research stimuli.

Source DOM: public /hotels/moscow/ rendered for Mobile Safari, 2026-09-14.
The two sheet CSS files and sheet subtree come from the published BottomSheet
story. Production runtimes, tracking, advertising and real offers are excluded.
"""
import copy
import hashlib
import json
import re
from pathlib import Path
from lxml import etree, html
from build import ROOT, WORKSPACE, APARTMENTS, PAYMENT_CARD_INDEXES, cls, remove, normalize_picture_sources

SOURCE = Path('/private/tmp/travel-touch-serp-source.html')
doc = html.document_fromstring(SOURCE.read_text())
desktop = html.parse(str(ROOT / 'index.html'))
normalize_picture_sources(doc)
desktop_cards = desktop.xpath('//*[@data-seo="hotel_snippet"]')
assets = json.loads((ROOT / 'assets/manifest.json').read_text())['assets']
asset_paths = {a['url']: a['path'] for a in assets}
missing = {}


def local(url):
    url = url.strip().strip('\"\'')
    if not url or url.startswith(('data:', '#', 'assets/')):
        return url
    if url.startswith('//'):
        url = 'https:' + url
    if url in asset_paths:
        return asset_paths[url]
    ext = Path(url.split('?')[0]).suffix
    if ext not in {'.png', '.jpg', '.svg', '.webp', '.gif'}:
        ext = '.jpg'
    target = 'assets/' + hashlib.sha256(url.encode()).hexdigest()[:16] + ext
    if not (ROOT / target).exists():
        missing[url] = target
    return target


def rewrite_css(text):
    text = re.sub(r'@font-face\s*\{[^}]+\}', '', text)
    return re.sub(r'url\(([^)]+)\)', lambda m: 'url("' + local(m[1]) + '")', text)


for n in doc.xpath('//script|//noscript|//iframe|//template|//link|//base|//source|//footer'):
    remove(n)
for n in doc.xpath('//comment()'):
    remove(n)
for n in doc.xpath('//meta'):
    if not n.get('charset') and n.get('name') not in {'viewport', 'format-detection'}:
        remove(n)

# Keep only the actual mobile SERP header, filter strip, cards and map button.
main = cls(doc, 'EUF05')[0]
for n in cls(main, 's8t7n'):
    remove(n)  # Hydration-only map skeleton, not a content block.
for n in list(main):
    if not any(token in n.get('class', '').split() for token in ['Nylnl', 'f47C2', '_aq54']):
        if 'На\xa0карте' not in n.text_content():
            remove(n)
        else:
            button = n.xpath('.//a|.//button')[0]
            button.set('data-open-map', '')

cards = doc.xpath('//*[@data-seo="hotel_snippet"]')
result_list = cards[0].getparent().getparent()
result_list.set('data-touch-results', '')
template = copy.deepcopy(cards[0])
for n in list(result_list):
    remove(n)
for index, ((title, photo), dc) in enumerate(zip(APARTMENTS, desktop_cards)):
    card = copy.deepcopy(template)
    li = etree.SubElement(result_list, 'li', {'class': 'NeD1G JCW6N'})
    li.append(card)
    card.set('data-research-hotel', title)
    card.set('data-research-hotel-id', f'fictional-apartment-{index + 1:02d}')
    card.set('data-price', ''.join(re.findall(r'\d', dc.xpath('.//*[@data-qa="price"]')[0].text_content())))
    rating = dc.xpath('.//*[@aria-label and starts-with(@aria-label,"Оценка")]')[0]
    card.set('data-rating', rating.get('aria-label').replace('Оценка ', '').replace(',', '.'))
    title_link = cls(card, 'Rqyz9')[0]
    title_link.clear(keep_tail=True)
    title_link.set('class', 'Kw61r _83itD Rqyz9')
    title_link.text = title
    photo_host = cls(card, 'LIFaV')[0]
    for slide in list(photo_host)[1:]:
        remove(slide)
    image = photo_host.xpath('.//img')[0]
    image.set('src', 'assets/' + photo)
    image.set('alt', title)
    image.set('loading', 'eager' if index < 3 else 'lazy')
    image.attrib.pop('srcset', None)
    for n in cls(card, 'IrE-y') + cls(card, 'RQXKw'):
        remove(n)
    cr = card.xpath('.//*[@aria-label and starts-with(@aria-label,"Оценка")]')[0]
    cr.set('aria-label', rating.get('aria-label'))
    cr[0].text = rating.text_content()
    review = cls(dc, 'XKZWb')
    cls(card, 'XKZWb')[0].text = review[0].text_content() if review else ''
    for span in card.xpath('.//span[not(*)]'):
        if span.text == 'Апартаменты':
            span.text = 'Квартира'
    benefits = cls(card, 'y2XZg')[0]
    desktop_benefits = cls(dc, 'y2XZg')
    if desktop_benefits:
        benefits.getparent().replace(benefits, copy.deepcopy(desktop_benefits[0]))
    # Native Touch price row; its content is the same as the desktop stimulus.
    prices = card.xpath('.//*[@data-qa="price"]')
    dp = dc.xpath('.//*[@data-qa="price"]')
    prices[0].text = dp[0].text_content()
    if len(dp) > 1:
        prices[1].text = dp[1].text_content()
        discount = cls(dc, 'K2vuA')
        cls(card, 'K2vuA')[0].text = discount[0].text_content() if discount else ''
    else:
        remove(cls(card, 'WZ7C9')[0])
    summary = cls(card, 'Gq4Rh')[0]
    for child in list(summary):
        remove(child)
    summary.text = '7 ночей · Квартира целиком'
    badges = cls(card, 'ot7Ay')[0]
    # Retain the production Plus component and use the same monetary incentive.
    ds_plus = cls(dc, 'RqnNO')
    if ds_plus:
        cls(badges, 'RqnNO')[0].text = ds_plus[0].text_content()
        cls(badges, 'FrsCe')[0].text = ds_plus[0].text_content()
    if index in PAYMENT_CARD_INDEXES:
        card.set('data-payment-available', 'true')
        badges.set('data-payment-badges', '')
        badges.append(copy.deepcopy(cls(dc, 'payment-badge')[0]))

# Retain native horizontal filter buttons and add the payment group shortcut.
filter_button = doc.xpath('//button[@aria-label="Все фильтры"]')[0]
filter_button.set('data-open-filters', '')
strip = cls(doc, 'UVfeS')[0]
source_chip = copy.deepcopy(strip.xpath('.//button')[1])
for n in list(strip):
    if n == strip[0]:
        continue
    remove(n)
sort = strip.xpath('.//button')[0]
sort.set('data-open-sort', '')
chip = copy.deepcopy(source_chip)
cls(chip, 'eh5Br')[0].text = 'Оплата и бронирование'
chip.set('data-open-filters', 'payment')
strip.append(chip)
price_chip = copy.deepcopy(source_chip)
price_chip.set('data-open-filters', 'price')
strip.append(price_chip)
for n in cls(doc, 'xfRpm'):
    n.set('data-touch-filter-count', '')

# Compact search summary occupies the Touch hydration slot, using the native
# secondary button component. This study keeps destination and dates fixed.
search = cls(doc, 'UO93e')[0]
search.set('class', search.get('class') + ' touch-search-summary')
search_button = copy.deepcopy(source_chip)
for n in search_button.xpath('.//svg'):
    remove(n)
search_button.set('class', search_button.get('class') + ' touch-search-summary__button')
search_button.set('aria-label', 'Москва, 17–24 сентября, 2 взрослых')
label = cls(search_button, 'eh5Br')[0]
label.text = 'Москва'
caption = etree.SubElement(label.getparent(), 'span', {'class': 'kdDAS dNANh'})
caption.text = '17–24 сен · 2 взрослых'
search.append(search_button)

# Published BottomSheet subtree (with-close-button / with-footer-button stories).
def sheet(id, title):
    root = html.fragment_fromstring('''<dialog class="PWIB3 nooi_ touch-sheet" aria-modal="true">
      <div class="YCRpa pBR3O"><div class="RbeQt E7yOK EKZ4_ ntMJl"><div class="NeRaT DIwPW SB3vN E7yOK"><div class="NeRaT UdqtE iXsdc wtDXO svXDq SB3vN E7yOK b7Pkd absoz"><div class="NeRaT FXobw k5_tD _o97R iEliM DIwPW SB3vN E7yOK"><span class="weGtR jKxAS" data-sheet-title></span></div><button class="rVCQa NeRaT j71R_ mg7hx jsv85 wtDXO jKxAS SB3vN E7yOK" type="button" aria-label="Закрыть" data-sheet-close><svg width="24" height="24" fill="none" viewBox="0 0 24 24" focusable="false"><path fill-rule="evenodd" clip-rule="evenodd" d="M19.2071 6.20701C19.3892 6.01841 19.49 5.76581 19.4878 5.50361C19.4855 5.24141 19.3803 4.9906 19.1949 4.80519C19.0095 4.61978 18.7587 4.51461 18.4965 4.51234C18.2343 4.51006 17.9817 4.61085 17.7931 4.79301L12.0001 10.586L6.20708 4.79301C6.01848 4.61085 5.76588 4.51006 5.50368 4.51234C5.24148 4.51461 4.99067 4.61978 4.80526 4.80519C4.61985 4.9906 4.51469 5.24141 4.51241 5.50361C4.51013 5.76581 4.61092 6.01841 4.79308 6.20701L10.5861 12L4.79308 17.793C4.69757 17.8853 4.62139 17.9956 4.56898 18.1176C4.51657 18.2396 4.48898 18.3708 4.48783 18.5036C4.48668 18.6364 4.51198 18.7681 4.56226 18.891C4.61254 19.0139 4.68679 19.1255 4.78069 19.2194C4.87458 19.3133 4.98623 19.3876 5.10913 19.4378C5.23202 19.4881 5.3637 19.5134 5.49648 19.5123C5.62926 19.5111 5.76048 19.4835 5.88249 19.4311C6.00449 19.3787 6.11483 19.3025 6.20708 19.207L12.0001 13.414L17.7931 19.207C17.9817 19.3892 18.2343 19.49 18.4965 19.4877C18.7587 19.4854 19.0095 19.3802 19.1949 19.1948C19.3803 19.0094 19.4855 18.7586 19.4878 18.4964C19.49 18.2342 19.3892 17.9816 19.2071 17.793L13.4141 12L19.2071 6.20701Z" fill="currentColor"/></svg></button></div></div></div></div>
      <div class="Z24dD mQoRd" data-qa="content"><div class="YjW6S content_paddingTopSpace_undefined content_paddingBottomSpace_undefined content_paddingSpace_undefined VRMM9 touch-sheet__body"></div></div></dialog>''')
    root.set('id', id)
    heading = root.xpath('.//*[@data-sheet-title]')[0]
    heading.set('id', id + '-title')
    heading.text = title
    root.set('aria-labelledby', id + '-title')
    wrapper = etree.SubElement(doc.find('body'), 'div', {'class': 'zMtt0 unYFa'})
    wrapper.append(root)
    return root, cls(root, 'touch-sheet__body')[0]


def primary_button(text, hook):
    b = html.fragment_fromstring('<button type="button" class="ezchR N5nkU wQbdl hrX_M"><span class="xrQTk"><span class="eTNAq"><span class="w3ayf ZtwHq c31FS"></span></span></span></button>')
    b.set(hook, '')
    cls(b, 'w3ayf')[0].text = text
    return b


filters, filter_body = sheet('touch-filters', 'Фильтры')
# Filter checklist primitives are shared across the actual desktop and Touch
# product CSS. Preserve every desktop group, including the apartment selection.
for fieldset in desktop.xpath('//fieldset'):
    group = copy.deepcopy(fieldset)
    # Select the published M sizes for Touch without redrawing controls.
    for label in group.xpath('.//label'):
        label.set('class', ' '.join({'kkMzK': 'I8biG', 'w4qme': 'h9P4I'}.get(c, c) for c in label.get('class', '').split()))
    for text in cls(group, 'ob4ed') + cls(group, 'ib5Sc'):
        text.set('class', ' '.join('Eqn7e' if c == 'kdDAS' else c for c in text.get('class', '').split()))
    for heading in cls(group, 'aUmBg'):
        heading.set('class', heading.get('class').replace('ry53s', 'glgcY'))
    for inp in group.xpath('.//input[@aria-label=""]'):
        inp.attrib.pop('aria-label', None)
    if group.xpath('.//*[@data-payment-filter]'):
        group.set('id', 'touch-payment-group')
    if 'Цена за' in group.text_content():
        group.set('id', 'touch-price-group')
    filter_body.append(group)
footer = etree.SubElement(filters, 'div', {'class': 'touch-sheet__actions touch-sheet__footer'})
reset = copy.deepcopy(source_chip)
for svg in reset.xpath('.//svg'):
    remove(svg)
reset.set('data-filter-reset', '')
cls(reset, 'eh5Br')[0].text = 'Сбросить'
footer.append(reset)
apply = primary_button('Показать 10 вариантов', 'data-filter-apply')
cls(apply, 'w3ayf')[0].set('data-filter-apply-label', '')
footer.append(apply)

details, body = sheet('touch-details', 'Об оплате')
etree.SubElement(body, 'p', {'class': 'kdDAS b9-76'}).text = desktop.xpath('//*[@id="payment-details-tooltip"]')[0].text_content()
body.append(primary_button('Понятно', 'data-sheet-close'))
sort_sheet, body = sheet('touch-sort', 'Сортировка')
for text, value in [('Сначала популярные', 'relevant'), ('Сначала недорогие', 'cheap'), ('По рейтингу', 'rating')]:
    b = copy.deepcopy(source_chip)
    for svg in b.xpath('.//svg'):
        remove(svg)
    cls(b, 'eh5Br')[0].text = text
    b.set('data-sort', value)
    body.append(b)
map_sheet, body = sheet('touch-map', 'Квартиры на карте')
etree.SubElement(body, 'img', {'src': 'assets/map-archive.png', 'alt': 'Карта Москвы', 'class': 'touch-map-image'})

# Remove unsafe/non-local behaviors and resolve every remaining resource.
for node in doc.iter():
    if not isinstance(node.tag, str):
        continue
    for key in list(node.attrib):
        if key.lower().startswith('on') or key in {'nonce', 'integrity', 'crossorigin', 'ping', 'srcdoc', 'itemtype', 'itemscope', 'itemprop'}:
            del node.attrib[key]
        elif key.startswith('data-') and re.search(r'metr|track|counter|request|session|stat|log|puid|yandexuid', key, re.I):
            del node.attrib[key]
    if node.tag == 'a':
        node.set('href', '#')
        node.attrib.pop('target', None)
    if node.tag in {'img', 'image'}:
        for attr in ['src', 'href', 'xlink:href']:
            if node.get(attr):
                node.set(attr, local(node.get(attr)))
        node.attrib.pop('srcset', None)
    if node.get('style'):
        node.set('style', rewrite_css(node.get('style')))
for style in doc.xpath('//style'):
    style.text = rewrite_css(style.text or '')
    style.attrib.clear()
head = doc.find('head')
head.find('title').text = 'Квартиры в Москве · Touch'
head.insert(0, etree.Element('meta', charset='utf-8'))
head.insert(1, etree.Element('link', rel='stylesheet', href='../../../BaseAI/fonts.css'))
head.insert(2, etree.Element('link', rel='stylesheet', href='../../../BaseAI/library.css'))
for i, filename in enumerate(['touch-ds-main.css', 'touch-ds-bottomsheet.css']):
    style = etree.Element('style')
    style.text = rewrite_css((ROOT / 'assets' / filename).read_text())
    head.insert(3 + i, style)
doc.set('class', 'theme_light')
doc.find('body').set('class', 'deviceTypeIOS mobile deviceBrowserSafari fontsLoaded YaTravelUIKit__pointerfocus touch-research')
def versioned(filename):
    file = ROOT / filename
    return filename + '?v=' + (hashlib.sha256(file.read_bytes()).hexdigest()[:10] if file.exists() else 'initial')
head.append(etree.Element('link', rel='stylesheet', href=versioned('touch.css')))
doc.find('body').append(etree.Element('script', src=versioned('touch.js'), defer='defer'))
output = '<!DOCTYPE html>\n' + html.tostring(doc, encoding='unicode', method='html')
assert '__PRELOADED_REDUX_STATE__' not in output
assert 'get-yapic' not in output
assert len(doc.xpath('//*[@data-payment-label]')) == 6
assert len(doc.xpath('//*[@data-seo="hotel_snippet"]')) == 10
(ROOT / 'touch.html').write_text(output)
(ROOT / 'assets/touch-missing-assets.json').write_text(json.dumps(missing, indent=2))
print(json.dumps({'cards': 10, 'paymentCards': 5, 'bytes': len(output.encode()), 'missingAssets': missing}, ensure_ascii=False))
