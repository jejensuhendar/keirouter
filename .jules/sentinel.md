## 2025-02-14 - Add Security Headers Middleware
**Vulnerability:** Missing standard HTTP security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Strict-Transport-Security)
**Learning:** The application was missing basic defense-in-depth security headers in its HTTP responses. This leaves it potentially exposed to clickjacking, MIME-sniffing, and cross-site scripting (XSS) attacks in older browsers, as well as missing the opportunity to enforce HTTPS connections using HSTS.
**Prevention:** Implement a global middleware in the `chi` router to consistently apply standard HTTP security headers to all incoming responses.
