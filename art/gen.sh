#!/bin/zsh
# 切り絵の元画像を生成する。生画像はリポジトリの外（_art_raw/baby-nap-guard）に置く
cd ~/Desktop/claudecode/baby-nap-guard/art
G=~/.claude/skills/3d-homepage/scripts/codex_imagegen.py
R=~/Desktop/claudecode/_art_raw/baby-nap-guard
run() { python3 $G $R/$1.png prompts/$1.md ${@:2} --quality high --size 1536x1024 > logs/$1.log 2>&1 && echo "$1 ok" || echo "$1 FAIL" }
if [[ $1 == 1 ]]; then
  for k in baby_a papa kid_dog dog_car misc; do run $k & done; wait
elif [[ $1 == 2 ]]; then
  run baby_b $R/baby_a.png & run baby_c $R/baby_a.png & wait
elif [[ $1 == 3 ]]; then
  run dog2 $R/dog_car.png & wait
else
  for k in ${@:2}; do if [[ $k == baby_b || $k == baby_c ]]; then run $k $R/baby_a.png & else run $k & fi; done; wait
fi
