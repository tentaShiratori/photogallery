# UC-03 Enter gallery

Terms are in [GLOSSARY.md](../../GLOSSARY.md).

- ID: UC-03
- Name: Enter gallery
- Primary actor: User
- Preconditions: At least one allowed Google account email address is configured for the gallery.
- Related: R-ACCESS-01 is production access. The login label after arrival is UC-01.
- Postconditions (success):
  - An account with an allowed email address has reached the gallery.
- Postconditions (failure): The gallery screen is not shown. The Cloudflare Access screen is shown.

### Flow

1. The user opens the gallery.
2. The browser goes to Google.
3. The user signs in with an account that has an allowed email address.
   - 3e. The account is not allowed.
     1. The browser shows the Cloudflare Access screen.
4. The browser brings that account to the gallery.
