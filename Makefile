# Image conversion Makefile
# Usage:
#   make convert    - Convert all images (webp + mp4)
#   make webp       - Convert PNG/JPG to WebP
#   make mp4        - Convert GIF to MP4
#   make clean      - Remove converted files (use with caution)

.PHONY: all convert webp mp4 help clean

# Default target
all: convert

# Convert all images
convert: webp mp4
	@echo ""
	@echo "=== All conversions complete ==="

# Convert PNG/JPG to WebP
webp:
	@echo "=== Converting PNG/JPG to WebP ==="
	@./scripts/convert-images-to-webp.sh

# Convert GIF to MP4
mp4:
	@echo "=== Converting GIF to MP4 ==="
	@./scripts/convert-gif.sh

# Help
help:
	@echo "Image Conversion Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make convert  - Convert all images (webp + mp4)"
	@echo "  make webp     - Convert PNG/JPG to WebP only"
	@echo "  make mp4      - Convert GIF to MP4 only"
	@echo "  make help     - Show this help"
	@echo ""
	@echo "Requirements:"
	@echo "  - cwebp (brew install webp)"
	@echo "  - ffmpeg (brew install ffmpeg)"
