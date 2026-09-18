# Delivery authority

The delivery module owns the internal simulator boundary for one shipment per
qualifying, successfully paid order. `DeliveryService` performs customer-owned
tracking reads and administrator-authorised simulator transitions. Shipment
status claims use conditional database writes so only one concurrent request can
create each transition event; order status changes are committed in the same
transaction.

Customer transport is exposed through `TrackingApi` at `/api/tracking`. The
route derives identity from the active server session and never accepts a
caller-supplied customer ID. The simulator is deterministic and does not call a
courier network.
