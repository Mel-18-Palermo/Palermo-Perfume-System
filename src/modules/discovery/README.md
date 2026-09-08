# Deterministic discovery

`DiscoveryService` reads the approved quiz definition and validates every submitted answer against its question bounds and option set. It builds candidate context from active catalogue family and intensity ids, persists a completed quiz attempt and fallback recommendation run, and returns canonical perfume summaries. No AI or external weather provider is called; the deterministic fallback works on its own.
