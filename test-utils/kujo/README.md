# kujo fixtures

Real result sets from pure-orm's heaviest production consumer (the kujo
storefront), captured 2026-08-16 from a development copy of its database,
paired with entity definitions mirrored from its `models/` directory as of
the same date. Together they exercise the ORM the way that application
actually does, which the hand-built fixtures in the sibling directories do
not:

- **product-page-retail** — the variant query behind a product page render:
  2394 rows × 68 columns over 11 joined entities, reducing to 119
  `actual_product_variant` roots. The ORDER BY (color position, image
  position, size) makes the root scope _cycle_: 893 of 2393 row transitions
  change roots, and each root's rows arrive in ~7 separate runs, so
  most-recently-used caching is systematically defeated. `gender` is joined
  but null on every row; `shipment` is joined and nulled by its ON-clause
  date filter while `shipment_actual_product_variant` still fans out.
- **product-page-wholesale** — the same page for a logged-in wholesaler,
  which widens the shape with `catalog_product_variant`.
- **product-page-mid** — a typical mid-sized product (288 rows), for shape
  rotation and cheaper derived variants.
- **account-orders** — a heavy order-history page: 101 rows × 174 columns
  over 12 entities, 62 order roots, one customer re-materialized per root
  scope, a joined-but-always-null `person` (affiliate), and an image join
  that happens to match nothing. `order` is 46 columns wide and references
  `physical_address` twice.
- **parcel-tracking** — the widest query in the application: 17 entities,
  183 columns per row, 9 rows reducing to a single root (consumed via
  `createOneFromDatabase`).
- **sizes / colors / product / instagrams / product-notes /
  product-features / product-specifications** — the small side queries the
  product page issues alongside the big one. `sizes` and `colors` are
  hand-aliased partial column lists, not full entity clauses.

Model realism that the other fixtures lack, preserved here on purpose:

- Models build with `Object.assign(this, props)` (kujo's `Base`), not one
  property store per declared field.
- `LineItem` and `Shipment` derive data in their constructors — construction
  is not free, and must run exactly once per materialized model.
- `line_item.columns` is a lazy function (circular model requires).
- `inventory_location` lists `physical_address_id` twice (kujo really does).
- Collections subclass a base with a `length` getter and iteration helpers,
  and `InventoryLevels` carries a domain getter (`totalAvailable`).

Anonymization: only what the storefront already serves publicly (retail
prices, image URLs, product copy, marketing posts) kept its real values.
Everything else was replaced deterministically, preserving exactly what the
ORM can observe — types, string formats, null patterns, equality patterns,
zero/non-zero, and ordering: personal strings (names, emails, phones,
addresses, tracking numbers, tokens, URLs) were faked default-deny across
`order`, `customer`, `person`, `physical_address`, `parcel`, and
`return_line_item`; wholesale prices, order money, inventory quantities, and
shipment quantities were remapped to synthetic values; order and fulfillment
timestamps were shifted wholesale (order-preserving). All emails end in
`example.com`. No value in these files is a real business figure.

To regenerate: capture the application's product-page, order-history, and
parcel queries as raw rows (`orm.db.any`), run them through the same
anonymization, and gzip the large sets. The capture-and-anonymize procedure
lives with the application, not in this repository.
