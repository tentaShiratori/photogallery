# Identity

The gallery heading shows who is signed in. Without an Access email it shows the local-preview label.

## Sub-features

- `identity-local` shows `ローカルプレビュー` when no Access email is present.
- `identity-email` shows the email from `Cf-Access-Authenticated-User-Email` in the heading.

## How to get to it (user POV)

- Open `http://127.0.0.1:8797/` with no extra headers.
- In production, Cloudflare Access sends `Cf-Access-Authenticated-User-Email` before the page renders. Locally, send that header on the page request.

## Driving it with browser and curl

Preconditions:

- Doctor reports the instance at `http://127.0.0.1:8797`.
- The browser has no `Cf-Access-Authenticated-User-Email` header.

- **Local label.** Open the recorded URL in the browser. The paragraph beside `フォトギャラリー` reads `ローカルプレビュー`.
- **Local response.** Run `curl.exe -sS "http://127.0.0.1:8797/"`. The body contains `ローカルプレビュー` and does not contain `verify@example.com`.
- **Email heading.** Run `curl.exe -sS -D - -H "Cf-Access-Authenticated-User-Email: verify@example.com" "http://127.0.0.1:8797/"`. Status 200 and the body contains `verify@example.com`.
- **Proof.** Save the header response to `.cursor/skills/verify-photogallery/artifacts/identity/email-heading.txt`. Save a browser screenshot of the unauthenticated page to `.cursor/skills/verify-photogallery/artifacts/identity/local.png`. The screenshot shows `ローカルプレビュー`.

## Gotchas

- The email is rendered on the server. Changing the header in a later `fetch` from the page does not change the heading.
- This does not sign the user in through Google or Cloudflare Access. A passed header check is not a passed login.
- The browser journey stays on the local label. Do not inject the email header into the browser and then call that the local-preview proof.
