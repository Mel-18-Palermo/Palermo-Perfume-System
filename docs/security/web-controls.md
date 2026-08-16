# Web input and injection controls

Related issue: #152

Input validation, output encoding, CSRF protection, and parameterized SQL solve different problems.
One control must not be treated as a replacement for another.

## Required controls

| Risk | Control | Verification |
| --- | --- | --- |
| Invalid input | Validate on the server with allowed fields, types, lengths, ranges, and formats. Reject unexpected fields. | Unit tests cover valid values and each rejected boundary. |
| Stored or reflected XSS | Encode data for the output context. Use `htmlspecialchars` for HTML text and attributes. Avoid untrusted data in inline JavaScript or CSS. | Tests render `<script>`, quotes, and ampersands as text. |
| User-authored HTML | Do not accept HTML unless a requirement needs it. If required later, use a maintained allow-list sanitizer. | Tests remove scripts, event handlers, and unsafe URLs. |
| CSRF | Use a session-bound synchronizer token on every state-changing browser request. | Tests reject missing, changed, or cross-session tokens. |
| SQL injection | Use PDO prepared statements for values and allow lists for identifiers such as sort columns. | Tests pass SQL metacharacters as data and confirm the query meaning does not change. |
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

Use the encoder that matches the output location. For normal HTML text and quoted attributes, PHP
uses:

```php
htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
```

JSON responses keep the `application/json` content type. Dynamic values should not be inserted into
HTML comments, tag names, event-handler attributes, inline scripts, or inline styles. A future Content
Security Policy may add protection, but it does not replace correct encoding.

## CSRF

- Generate tokens with `bin2hex(random_bytes(32))` and store them in the user's server-side session.
- Include the token in forms or a custom request header.
- Compare submitted and stored tokens with `hash_equals`.
- Protect `POST`, `PUT`, `PATCH`, and `DELETE` routes that use cookie authentication.
- Never use `GET` for a state-changing action.
- Keep session cookies `HttpOnly`; enable `Secure` outside local development and use `SameSite=Lax`
  unless a reviewed flow needs a stricter value.

`SameSite` is defence in depth. It is not the only CSRF control.

## SQL

User input is never concatenated into SQL. Placeholder binding protects values, but placeholders
cannot represent table names, column names, or sort directions. Those identifiers must come from a
fixed application allow list.

The application database account receives only the permissions it needs. Schema migration access is
kept separate from normal runtime access when the hosting environment supports it.

## Error handling

Validation errors may name the invalid field but should not reveal SQL, stack traces, credentials, or
internal paths. Unexpected exceptions receive a request reference in logs and a generic response when
`APP_DEBUG=false`.

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
