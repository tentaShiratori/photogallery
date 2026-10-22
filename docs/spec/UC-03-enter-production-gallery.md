# UC-03 Enter production gallery

Terms are in [GLOSSARY.md](../../GLOSSARY.md).

- ID: UC-03
- Name: Enter production gallery
- Primary actor: User
- Preconditions: For the production gallery, at least one Google account email address allowed to open it is configured.
- Related: R-ACCESS-01 is production access. Login label after arrival is UC-01.
- Postconditions (success):
  - An account with an allowed email address has reached the gallery.
- Postconditions (failure): The gallery screen is not shown. The Cloudflare Access screen is shown.

### Flow

1. The user opens the production gallery.
2. The browser proceeds to Google.
3. The user signs in with an account that has an allowed email address.
   - 3e. Not allowed.
     1. The browser shows the Cloudflare Access screen.
4. The browser delivers that account to the gallery.
