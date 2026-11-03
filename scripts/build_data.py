#!/usr/bin/env python3
"""
data/curriculum_videos.json dosyasındaki verileri okuyarak
tarayıcının doğrudan yükleyebileceği js/data.js dosyasını üretir.
"""
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON_PATH = os.path.join(ROOT_DIR, 'data', 'curriculum_videos.json')
JS_OUT_PATH = os.path.join(ROOT_DIR, 'js', 'data.js')

def main():
    if not os.path.exists(JSON_PATH):
        print(f"Hata: {JSON_PATH} bulunamadı!")
        sys.exit(1)

    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    weeks_data = data.get('weeks', [])
    all_videos = data.get('all_videos', [])

    js_content = f"""/**
 * Calculus 2 Öğrenim Portalı - Müfredat ve Video Veri Seti
 * Otomatik oluşturulmuştur. Düzenlemek için data/curriculum_videos.json dosyasını güncelleyip
 * `python scripts/build_data.py` komutunu çalıştırabilirsiniz.
 */
window.CALCULUS_DATA = {{
  weeksData: {json.dumps(weeks_data, ensure_ascii=False)},
  allVideos: {json.dumps(all_videos, ensure_ascii=False)}
}};
"""

    with open(JS_OUT_PATH, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"Başarılı! js/data.js güncellendi ({len(weeks_data)} bölüm, {len(all_videos)} video).")

if __name__ == '__main__':
    main()
