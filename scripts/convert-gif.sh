#!/bin/bash
set -e

echo "Converting GIFs to WebM..."
find public/img -name '*.gif' -print0 | while IFS= read -r -d '' gif; do
  webm="${gif%.gif}.webm"
  echo "  $gif -> $webm"
  ffmpeg -y -i "$gif" -c:v libvpx-vp9 -crf 30 -b:v 0 "$webm" 2>/dev/null
done

echo "Updating markdown files..."
find src/content -name '*.md' -exec perl -i -pe '
  s/!\[([^\]]*)\]\(([^)]*?)\.gif\)/<video autoplay loop muted playsinline style="max-width:100%">\n  <source src="$2.webm" type="video\/webm">\n<\/video>/g
' {} \;

echo "Removing original GIFs..."
find public/img -name '*.gif' -delete

echo "Done!"
