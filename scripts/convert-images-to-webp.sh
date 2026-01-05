#!/bin/bash
#
# Convert PNG/JPG images to WebP format and update markdown references
# Similar pattern to convert-gif.sh
#

set -e

QUALITY=80  # WebP quality (0-100, higher = better quality, larger file)
IMG_DIR="public/img"
CONTENT_DIR="src/content"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track statistics
total_original=0
total_converted=0
converted_count=0
failed_count=0

echo "=== Converting images to WebP ==="
echo "Quality: ${QUALITY}"
echo ""

# Check if cwebp is installed
if ! command -v cwebp &> /dev/null; then
    echo -e "${RED}Error: cwebp is not installed${NC}"
    echo "Install with: brew install webp"
    exit 1
fi

# Find and convert images
while IFS= read -r -d '' img; do
    # Get file extension and create webp path
    ext="${img##*.}"
    webp="${img%.*}.webp"

    # Get original size
    original_size=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null)
    total_original=$((total_original + original_size))

    # Convert based on file type
    if [[ "$ext" == "png" ]]; then
        # PNG: use lossless for screenshots, lossy for photos
        if cwebp -q "$QUALITY" "$img" -o "$webp" 2>/dev/null; then
            converted_size=$(stat -f%z "$webp" 2>/dev/null || stat -c%s "$webp" 2>/dev/null)
            total_converted=$((total_converted + converted_size))
            savings=$((100 - (converted_size * 100 / original_size)))

            echo -e "${GREEN}OK${NC} $img -> $webp (${savings}% smaller)"
            rm "$img"
            ((converted_count++))
        else
            echo -e "${RED}FAILED${NC} $img (keeping original)"
            ((failed_count++))
        fi
    elif [[ "$ext" == "jpg" || "$ext" == "jpeg" ]]; then
        # JPEG: lossy conversion
        if cwebp -q "$QUALITY" "$img" -o "$webp" 2>/dev/null; then
            converted_size=$(stat -f%z "$webp" 2>/dev/null || stat -c%s "$webp" 2>/dev/null)
            total_converted=$((total_converted + converted_size))
            savings=$((100 - (converted_size * 100 / original_size)))

            echo -e "${GREEN}OK${NC} $img -> $webp (${savings}% smaller)"
            rm "$img"
            ((converted_count++))
        else
            echo -e "${RED}FAILED${NC} $img (keeping original)"
            ((failed_count++))
        fi
    fi
done < <(find "$IMG_DIR" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) -print0)

echo ""
echo "=== Updating markdown files ==="

# Update markdown references: .png -> .webp
find "$CONTENT_DIR" -name '*.md' -exec perl -i -pe '
    s/(src=["'"'"']\/img\/[^"'"'"']*?)\.png(["'"'"'])/$1.webp$2/g;
    s/(src=["'"'"']\/img\/[^"'"'"']*?)\.jpg(["'"'"'])/$1.webp$2/g;
    s/(src=["'"'"']\/img\/[^"'"'"']*?)\.jpeg(["'"'"'])/$1.webp$2/g;
    s/(\(\/img\/[^)]*?)\.png\)/$1.webp)/g;
    s/(\(\/img\/[^)]*?)\.jpg\)/$1.webp)/g;
    s/(\(\/img\/[^)]*?)\.jpeg\)/$1.webp)/g;
' {} \;

echo "Markdown files updated!"
echo ""

# Print summary
echo "=== Summary ==="
echo -e "Converted: ${GREEN}${converted_count}${NC} images"
if [[ $failed_count -gt 0 ]]; then
    echo -e "Failed: ${RED}${failed_count}${NC} images"
fi

if [[ $total_original -gt 0 ]]; then
    total_savings=$((100 - (total_converted * 100 / total_original)))
    original_mb=$(echo "scale=2; $total_original / 1048576" | bc)
    converted_mb=$(echo "scale=2; $total_converted / 1048576" | bc)
    saved_mb=$(echo "scale=2; ($total_original - $total_converted) / 1048576" | bc)

    echo ""
    echo "Original size:  ${original_mb} MB"
    echo "Converted size: ${converted_mb} MB"
    echo -e "Saved: ${GREEN}${saved_mb} MB (${total_savings}%)${NC}"
fi

echo ""
echo "Done!"
