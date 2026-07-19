# App Store Connect API key — copy to asc-credentials.sh and fill in.
#   cp asc-credentials.example.sh asc-credentials.sh
# asc-credentials.sh is gitignored. Never commit it, never paste these values
# into chat. The .p8 file itself lives outside the repo (see ASC_KEY_PATH).

# From App Store Connect → Users and Access → Integrations → App Store Connect API:
export ASC_KEY_ID="XXXXXXXXXX"                                   # the key's Key ID
export ASC_ISSUER_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"       # the Issuer ID (top of that page)

# Where you saved the downloaded AuthKey_<KEY_ID>.p8 (Apple auto-discovers this path):
export ASC_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
