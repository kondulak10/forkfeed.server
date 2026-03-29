#!/usr/bin/env bash
# Upload a local image to S3 and print the CDN URL.
# Usage: bash scripts/upload-image.sh <local-file> <s3-key>
# Example: bash scripts/upload-image.sh /tmp/img.png content/harry-potter/hp-cover.png
# Output: https://$CDN_DOMAIN/content/harry-potter/hp-cover.png

set -euo pipefail

BUCKET="${S3_BUCKET:?Error: S3_BUCKET environment variable is required}"
CDN_DOMAIN="${CDN_DOMAIN:?Error: CDN_DOMAIN environment variable is required}"

if [ $# -lt 2 ]; then
  echo "Usage: bash scripts/upload-image.sh <local-file> <s3-key>" >&2
  exit 1
fi

LOCAL_FILE="$1"
S3_KEY="$2"

if [ ! -f "$LOCAL_FILE" ]; then
  echo "Error: File not found: $LOCAL_FILE" >&2
  exit 1
fi

# Detect content-type from extension
EXT="${LOCAL_FILE##*.}"
EXT_LOWER="$(echo "$EXT" | tr '[:upper:]' '[:lower:]')"
case "$EXT_LOWER" in
  png)  CONTENT_TYPE="image/png" ;;
  jpg|jpeg) CONTENT_TYPE="image/jpeg" ;;
  webp) CONTENT_TYPE="image/webp" ;;
  gif)  CONTENT_TYPE="image/gif" ;;
  *)    CONTENT_TYPE="application/octet-stream" ;;
esac

aws s3 cp "$LOCAL_FILE" "s3://${BUCKET}/${S3_KEY}" \
  --content-type "$CONTENT_TYPE" \
  --quiet

echo "https://${CDN_DOMAIN}/${S3_KEY}"
