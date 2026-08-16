# Web input and injection controls

Related issue: #152

Input validation, output encoding, CSRF protection, and parameterized SQL solve different problems.
One control must not be treated as a replacement for another.

## Required controls

| Risk | Control | Verification |
| --- | --- | --- |
| Invalid input | Validate on the server with allowed fields, types, lengths, ranges, and formats. Reject unexpected fields. | Unit tests cover valid values and each rejected boundary. |
| Stored or reflected XSS | Render untrusted strings through React's normal text and attribute bindings. Do not use `dangerouslySetInnerHTML` without an approved sanitizer. | Tests render `<script>`, quotes, and ampersands as text. |
| User-authored HTML | Do not accept HTML unless a requirement needs it. If required later, use a maintained allow-list sanitizer. | Tests remove scripts, event handlers, and unsafe URLs. |
| CSRF | Use the approved authentication library's CSRF protection for cookie-authenticated state changes, including origin checks or session-bound tokens. | Tests reject missing, changed, cross-origin, or cross-session proofs. |
| SQL injection | Use Prisma query operations. Any raw query must use parameter binding, with allow lists for identifiers such as sort columns. | Tests pass SQL metacharacters as data and confirm the query meaning does not change. |
| ID tampering | Ignore browser-supplied ownership and role claims. Scope records to the authenticated actor or an allowed admin action. | Authorization tests try another customer's record ID. |

## Input validation

- Validate at the HTTP boundary before calling a use case.
- Normalize only when the rule is clear, such as trimming surrounding whitespace from an email.
- Keep validation separate from output encoding. Stored text does not need HTML entities until it is
  placed into HTML.
- Reject unknown fields instead of silently accepting data the endpoint does not use.
- Validate third-party responses before storing or displaying them.

Client-side validation may improve form feedback, but the backend repeats every security and business
rule because browser checks can be bypassed.

## XSS

React escapes string values rendered as text or normal attributes. Keep untrusted content in those
bindings:

```tsx
export function ProductName({ name }: { name: string }) {
  return <span>{name}</span>;
}
```

Do not put untrusted values into raw HTML, script source, CSS, or unsafe URL contexts. JSON responses
keep the `application/json` content type. A Content Security Policy adds protection but does not
replace safe rendering.

## CSRF

- Prefer the reviewed authentication library's built-in CSRF and origin validation.
- If the selected flow needs synchronizer tokens, generate them with the server-side Web Crypto API,
  bind them to the session, and compare them without leaking timing information.
- Include required proof in forms or a custom request header.
- Protect `POST`, `PUT`, `PATCH`, and `DELETE` routes that use cookie authentication.
- Never use `GET` for a state-changing action.
- Keep session cookies `HttpOnly`; enable `Secure` outside local development and use `SameSite=Lax`
  unless a reviewed flow needs a stricter value.

`SameSite` is defence in depth. It is not the only CSRF control.

## SQL

User input is never concatenated into SQL. Prefer Prisma's typed query API. If a reviewed requirement
needs a raw query, bind every value through Prisma's safe parameterized interface. Table names,
column names, and sort directions must come from a fixed application allow list.

The application database account receives only the permissions it needs. Schema migration access is
kept separate from normal runtime access when the hosting environment supports it.

## Error handling

Validation errors may name the invalid field but should not reveal SQL, stack traces, credentials,
connection strings, or internal paths. Unexpected exceptions receive a request reference in logs and
a generic response in production.

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
