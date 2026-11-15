# Beanwright: a reCAPTCHA v3 test shop

A made-up coffee gear shop used as a probe for measuring how browsers score with reCAPTCHA v3 (Enterprise,
score-based). It is part of poweragents' stealth eval. reCAPTCHA scores what a visitor does during a visit, so the page
has real content and interactions: search, filters, pagination, a gallery, tabs, a form. Nothing here is for sale.

Served by GitHub Pages at https://kedrzu.github.io/stealth-eval-page/. Plain static HTML, CSS and vanilla JS, no build.

## Privacy

The page collects nothing beyond the in-page eval data (below), which stays in the browser's `sessionStorage` and the DOM
until someone copies it. It sends nothing anywhere except Google's reCAPTCHA: the `enterprise.js` script from
`google.com`/`gstatic.com`, the token request, and one assessment `POST` per token to
`recaptchaenterprise.googleapis.com`. There is no analytics, no other `fetch`, XHR or beacon, and no external image,
font or script hosts. Typed text is never recorded, only its length and timing counts.

## Why the API key is public

The assessment call is made from the page, so its key is visible in `shop.js`. That is intentional. The key is restricted
to the reCAPTCHA API and to the referrer `https://kedrzu.github.io/*`, and capped at 300 assessments per day, so it is
useless for anything else. The reCAPTCHA site key is public by design. Opened from `file://` or `localhost`, the
assessment (and usually the token request) fails on the referrer; each action then records an `error` and the page keeps
working.

## Pages

- `index.html`: product list, 40 products, search, filters, sort, 12 per page. State in the query: `?q=&cat=&brand=&min=&max=&stock=1&sort=&page=`.
- `product.html?id=<id>`: breadcrumb, gallery, description, tabs, FAQ, quantity and add to cart.
- `order.html[?product=<id>]`: order form with client-side validation and a confirmation panel (nothing is sent).
- `products.js` (catalogue and inline SVG pictures), `shop.js` (everything else), `shop.css`.
- A cookie modal appears on the first page of each browser session and blocks the page until a choice is made.

## Actions

Each action requests a reCAPTCHA token with this action name and assesses it at once. The UI never waits for it, except
that navigating actions (`search`, `filter`, `sort`, `paginate`, `open_product`) navigate when the token arrives or after
1.5 s. A token whose assessment was cut off by navigation is kept in `sessionStorage` and assessed by the next page
(tokens older than 110 s are dropped with an error).

| Action | When |
| --- | --- |
| `page_list`, `page_product`, `page_order` | page load |
| `search` | search submitted (Enter or button, any page) |
| `filter` | filter changed or applied, or cleared |
| `sort` | sort select changed |
| `paginate` | pagination link followed |
| `open_product` | product link followed |
| `tab` | product tab selected |
| `gallery` | gallery thumbnail, previous or next |
| `faq` | FAQ item opened |
| `add_to_cart` | Add to cart |
| `cookie_accept`, `cookie_reject` | modal choice (Save settings counts as accept if any box is ticked) |
| `order_submit` | valid order form submitted |
| `order_invalid` | submit that failed validation |
| `read_description` | once per product page view: at least 80% of the description scrolled into view and 10 s on the page |

## Selectors

Header (all pages): `#search-form`, `#search-input`, `#search-submit`, `#cart-link`, `#cart-count`,
`[data-test=logo]`, `[data-test=nav-shop]`, `[data-test=nav-order]`.

Cookie modal: `#cookie-modal`, `#cookie-accept`, `#cookie-reject`, `#cookie-settings-toggle`, `#cookie-analytics`,
`#cookie-marketing`, `#cookie-save` (visible after Settings).

List: `#list-title`, `#results-count`, `#filter-form`, `[data-test=filter-cat-grinders|kettles|scales|filters|accessories]`,
`#filter-brand`, `#filter-min`, `#filter-max`, `#filter-stock`, `#filters-apply`, `#filters-clear`, `#sort-select`
(`relevance`, `price-asc`, `price-desc`, `rating`, `name`), `#product-grid`, `[data-test=product-card-<id>]`,
`[data-test=product-link-<id>]`, `#pagination`, `[data-test=page-1]`... `[data-test=page-N]`, `[data-test=page-prev]`,
`[data-test=page-next]`. Checkboxes and the brand select apply at once; price needs Apply or Enter.

Product ids: `g01`-`g10` (grinders), `k01`-`k08` (kettles), `s01`-`s08` (scales), `f01`-`f07` (filters),
`a01`-`a07` (accessories).

Product: `#breadcrumb`, `[data-test=crumb-shop]`, `[data-test=crumb-category]`, `#product-title`, `#gallery-main`,
`#gallery-count`, `[data-test=gallery-prev]`, `[data-test=gallery-next]`, `[data-test=gallery-thumb-N]` (1-based, 3 to 5
per product), `#tab-description`, `#tab-specs`, `#tab-reviews`, `#panel-description`, `#panel-specs`, `#panel-reviews`,
`#description-text`, `[data-test=faq-1]`...`[data-test=faq-4]` (the `<summary>`; the `<details>` is `#faq-N-item`),
`#qty-input`, `#add-to-cart`, `#cart-message`, `#order-link`, `#back-to-results`.

Order: `#order-form`, `#order-name`, `#order-email`, `#order-phone`, `#order-delivery` (`courier`, `express`, `pickup`),
`#order-pay-card`, `#order-pay-transfer`, `#order-pay-cash` (radio `name=payment`), `#order-date`, `#order-notes`,
`#order-terms`, `#order-submit`, `#order-<field>-error` (`name`, `email`, `phone`, `delivery`, `payment`, `date`,
`terms`), `#order-confirmation`, `#order-reference`.

Eval widget (collapsed): `#eval-toggle`, `#eval-panel`, `#eval-summary`, `#copy-results`, `#reset-visit`,
`#eval-status`, `#eval-fallback` (shown if the clipboard is unavailable). Results: `#eval-results`.

## Results

`<script type="application/json" id="eval-results">` always holds the current JSON, kept across the shop's pages in
`sessionStorage`:

```json
{
  "version": 1, "visitId": "...", "startedAt": "iso", "userAgent": "...",
  "actions": [
    { "action": "search", "page": "list", "at": "iso", "score": 0.9, "reasons": [], "valid": true, "error": null }
  ],
  "input": []
}
```

An action with `valid: null` and `error: null` is still waiting for its token or assessment. `page` is `list`,
`product` or `order`. `input` holds at most 500 records:

- `{ kind: "click", at, target, isTrusted, pointerType, mouseMovesBefore, pathPxBefore, msSinceLastMove, offsetFromCenter: {x, y} }`
  per `pointerdown` (a `click` without one is recorded too). Movement counters cover the time since the previous click.
- `{ kind: "text", at, target, chars, keydowns, inputEvents, insertTextWithoutKey, pastes, meanKeyIntervalMs, minKeyIntervalMs }`
  per focus-to-blur session on a text input or textarea. `insertTextWithoutKey` counts `insertText` input events with
  no keydown in the 50 ms before.
- `{ kind: "scroll", at, page, wheelEvents, scrollEvents, maxScrollPct }` per page, written on `pagehide`, so the last
  page of a visit has none until it is left.

"Reset visit" clears `sessionStorage` (also the cookie choice) and reloads.
