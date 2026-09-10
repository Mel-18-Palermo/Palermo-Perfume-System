# Cart authority

The cart service owns visitor and customer cart state on the server. Visitor carts are keyed by the signed-in browser's opaque `palermo_visitor` cookie; customer carts are keyed by the authenticated customer id.

Cart responses derive variant pricing and stock validation from the current catalogue and inventory rows. Adding an item never creates an inventory reservation. Reservation and checkout workflows belong to later commerce issues.

Every mutation carries the cart id and `cart-N` revision returned by the previous response. The service rejects stale revisions, validates variant customisation against the current variant configuration, and returns canonical pricing, validation messages, and checkout eligibility.
