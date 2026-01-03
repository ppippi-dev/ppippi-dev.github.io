#!/bin/bash

MAX_DURATION=10

echo "Converting GIFs to MP4..."
while IFS= read -r -d '' gif; do
  mp4="${gif%.gif}.mp4"
  
  duration=$(ffprobe -v error -select_streams v:0 -show_entries format=duration -of csv=p=0 "$gif" 2>/dev/null || echo "0")
  
  if (( $(echo "$duration > $MAX_DURATION" | bc -l 2>/dev/null || echo 0) )); then
    speed=$(echo "scale=2; $duration / $MAX_DURATION" | bc -l)
    vf="setpts=PTS/${speed},scale='min(1280,iw)':-2,scale=trunc(iw/2)*2:trunc(ih/2)*2"
    echo "  $gif -> $mp4 (${duration}s -> ${MAX_DURATION}s, ${speed}x)"
  else
    vf="scale='min(1280,iw)':-2,scale=trunc(iw/2)*2:trunc(ih/2)*2"
    echo "  $gif -> $mp4"
  fi
  
  if ffmpeg -nostdin -y -i "$gif" \
    -movflags faststart \
    -pix_fmt yuv420p \
    -vf "$vf" \
    -c:v libx264 \
    -crf 23 \
    -preset ultrafast \
    "$mp4"; then
    rm "$gif"
    echo "  Done: $mp4"
  else
    echo "  FAILED: $gif (keeping original)"
  fi
done < <(find public/img -name '*.gif' -print0)

echo "Updating markdown files..."
find src/content -name '*.md' -exec perl -i -pe '
  s/!\[([^\]]*)\]\(([^)]*?)\.gif\)/<video autoplay loop muted playsinline style="max-width:100%">\n  <source src="$2.mp4" type="video\/mp4">\n<\/video>/g
' {} \;

echo "Done!"
