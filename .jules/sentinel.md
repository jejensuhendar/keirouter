## 2025-02-23 - Prevent SSRF when updating proxy pool
**Vulnerability:** The `/proxy-pools/{id}` PATCH endpoint didn't validate the `proxy_url` when updating a proxy pool, which could allow a malicious admin or compromised account to set an unsafe proxy URL (e.g., path traversal or non-proxy schemas), potentially leading to SSRF.
**Learning:** Even internal/admin endpoints that only take user-provided URLs need rigorous validation against path traversal, invalid schemas, etc. before accepting the configuration.
**Prevention:** Always validate configurable proxy endpoints with `httputil.ValidateProxyURL` (or equivalent URL validation specific to the domain), as done in creation endpoints and other proxy URL configurations.
