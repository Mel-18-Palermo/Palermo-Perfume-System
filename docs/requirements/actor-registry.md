# Actor Registry

## Business actors

- **Visitor** — unauthenticated person interacting with public customer-facing functionality.
- **Customer** — person who owns a Palermo customer account; authentication/account state is a precondition where required rather than a separate actor type.
- **Administrator** — authorised Palermo administrative user; administrative capability is controlled through server-enforced RBAC.

## External systems

- Email delivery service
- Stripe sandbox/payment service
- AI service/API

A real Delivery/Tracking Service becomes an external system actor only if a real courier integration is introduced. The baseline simulated delivery provider is an internal Palermo test/demo component and is not an external actor.

## Not actors

- Palermo Online Perfume Selling System
- Supabase
- PostgreSQL
- Prisma
- React / Next.js

Decision references: `D-008`, `D-049`, `D-057`, `D-058`.
