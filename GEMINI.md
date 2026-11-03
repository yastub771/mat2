# Calculus 2 Öğrenim Portalı — AI & Geliştirici Kuralları (GEMINI.md)

Bu dosya, projede çalışan yapay zeka asistanları (Antigravity / Gemini / Cursor / Copilot) ve geliştiriciler için mimari kuralları, veri akışını ve teknik kısıtlamaları tanımlar.

---

## 1. Proje Özeti ve Mimari

**Calculus 2 Öğrenim Portalı**, üniversite Matematik 2 (Calculus 2) dersi için [BUders](https://www.buders.com) video arşivindeki 486 videoyu (13 haftalık Thomas/Stewart müfredatı + 2 sınav hazırlık bölümü) gömülü YouTube oynatıcısı, 1x–3x hız kontrolü, kişisel ders notları, Pomodoro sayacı ve ilerleme takibi ile sunan hafif bir web uygulamasıdır.

* **Teknoloji Yığını:** Saf HTML5, Vanilla JavaScript (ES6+), Tailwind CSS (CDN) ve CSS Değişkenleri (`css/style.css`).
* **Sıfır Derleme (Zero-Build) İlkesi:** Proje herhangi bir derleme (build) adımına ihtiyaç duymadan doğrudan statik bir sunucuda (`Baslat.bat`, `python -m http.server` veya GitHub Pages) çalışacak şekilde tasarlanmıştır.

---

## 2. Dizin ve Dosya Yapısı

```text
calculus2-portal/
├── index.html                       # Ana kullanıcı arayüzü (modüler yapı)
├── css/
│   └── style.css                    # Açık/Koyu tema değişkenleri ve özel bileşen stilleri
├── js/
│   ├── data.js                      # Tarayıcı tarafından yüklenen müfredat verisi (window.CALCULUS_DATA)
│   └── app.js                       # Ana uygulama mantığı, oynatıcı, hız köprüsü, notlar ve kısayollar
├── data/
│   ├── curriculum_videos.json       # 13 haftalık müfredat + sınav hazırlık videolarının ham JSON kaynağı
│   └── all_buders_videos.json       # BUders Calculus 2 sayfasındaki tüm 29 konunun tam arşivi
├── docs/
│   ├── 13_haftalik_mufredat_plani.md # Haftalık ders planı Markdown tabloları
│   └── tum_buders_calculus2_tablosu.md # Tüm BUders videolarının hiyerarşik Markdown tablosu
├── scripts/
│   ├── build_data.py                # data/curriculum_videos.json -> js/data.js dönüştürücü script
│   └── server.ps1                   # Windows için kurulumsuz yerel HTTP sunucusu
├── calculus2_hizlandirici.user.js   # 2.5x ve 3x hız için Tampermonkey Userscript köprüsü
├── Baslat.bat                       # Windows için tek tıkla sunucu başlatıcı
├── CONTRIBUTING.md                  # Katkıda bulunma rehberi
├── GEMINI.md                        # Proje kuralları ve mimari rehber (bu dosya)
└── README.md                        # Kullanıcı ve kurulum dokümantasyonu
```

---

## 3. Kritik Teknik Kurallar ve Kısıtlamalar

### 3.1. YouTube Hata 153 (Error 153) Önlemleri
YouTube, geçerli bir `Referer` / `Origin` başlığı göndermeyen (`file://` protokolü veya katı referrer politikası kullanan) gömülü oynatıcıları **Hata 153** ile engeller. Bu nedenle:
1. `index.html` içindeki `<meta name="referrer" content="strict-origin-when-cross-origin">` etiketi **asla kaldırılmamalıdır**.
2. `#yt-player` iframe etiketinde `referrerpolicy="strict-origin-when-cross-origin"` özniteliği korunmalıdır.
3. Video URL'leri oluşturulurken `https://www.youtube-nocookie.com/embed/${yt_id}?enablejsapi=1` yapısı kullanılmalıdır.

### 3.2. YouTube IFrame & Tampermonkey 3x Hız Köprüsü (`postMessage`)
Tarayıcıların **Same-Origin Policy (CORS)** kuralları gereği ana sayfa, YouTube iframe'i içindeki `<video>` etiketine doğrudan erişemez ve YouTube resmi API'si hızı maksimum `2.0x` ile sınırlar.
* **Resmi Hızlar (`0.5x` – `2.0x`):** `sendYtCommand('setPlaybackRate', [speed])` ile YouTube IFrame API'sine iletilir.
* **Yüksek Hızlar (`2.5x` – `3.0x`):** `js/app.js` ile `calculus2_hizlandirici.user.js` arasında `window.postMessage` protokolü kullanılır:
  * **El Sıkışma (Handshake):** Userscript, ana pencereye `{ type: 'CALCULUS_TAMPERMONKEY_READY' }` mesajı gönderir.
  * **Hız Emri:** Ana pencere, iframe'e `{ type: 'CALCULUS_SPEED_OVERRIDE', speed: <number> }` mesajı gönderir.
  * Bu mesaj tipleri (`type`) iki dosya arasında sözleşme niteliğindedir; değiştirilmemelidir.

### 3.3. LocalStorage Anahtarları (Geriye Dönük Uyumluluk)
Kullanıcıların tarayıcılarındaki mevcut ilerlemelerinin ve notlarının kaybolmaması için aşağıdaki `localStorage` anahtar adları değiştirilmemelidir:
* `calculus2_watched_videos_v1`: İzlenen video ID'lerinin JSON dizisi (`["w1_1_1", ...]`)
* `calculus2_video_notes_v1`: Video ID -> Not metni eşleşmesi (`{ "w1_1_1": "..." }`)
* `calculus2_player_speed_v1`: Son seçilen oynatma hızı (`"1.5"`)
* `calculus2_current_video_id`: Son açılan videonun ID'si (`"w1_1_1"`)
* `calculus2_theme_preference`: Tema tercihi (`"dark"` veya `"light"`)
* `calculus2_theater_mode`: Sinema modu durumu (`"true"` veya `"false"`)
* `calculus2_autonext_v1`: Video bitince otomatik sıradakine geçiş (`"true"` veya `"false"`)

### 3.4. Veri Güncelleme İş Akışı
Müfredata yeni video, hafta veya ders ekleneceği zaman:
1. Değişiklikleri `data/curriculum_videos.json` dosyasında yapın.
2. `python scripts/build_data.py` komutunu çalıştırarak `js/data.js` dosyasını güncelleyin.
3. Neden `fetch('data/curriculum_videos.json')` yerine `js/data.js` kullanılıyor? Bazı kullanıcılar dosyayı yerel ağda veya kısıtlı ortamlarda açtığında `fetch` CORS hatasına takılmaması için veri `window.CALCULUS_DATA` global nesnesi olarak yüklenir.

---

## 4. Kodlama ve Arayüz Standartları

1. **Tema Değişkenleri:** Yeni bir UI bileşeni eklerken sabit renk sınıfları (`bg-slate-900`, `text-white`) yerine `css/style.css` içindeki semantik değişkenleri (`bg-[var(--card)]`, `bg-[var(--bg)]`, `bg-[var(--elev)]`, `text-[var(--text)]`, `text-[var(--text-strong)]`, `text-[var(--muted)]`, `border-[var(--border)]`) kullanın. Böylece hem Aydınlık hem Karanlık modda tam uyum sağlanır.
   * **Tasarım dili:** Monokrom zinc paleti + tek vurgu rengi `var(--accent)` (amber). İndigo / mor / neon glow / radial gradyan kullanılmaz; ayrım gölge yerine 1px kenarlıkla yapılır.
   * **Hazır bileşen sınıfları:** `.card`, `.pill`, `.btn` (`.btn-primary`, `.is-on`), `.icon-btn`, `.field`, `.seg` / `.seg-btn`, `.popover` / `.menu-item`, `.kbd`, `.switch`, `.cbx`.
   * **Fontlar:** Arayüz `Plus Jakarta Sans` (`font-sans`), süre / numara / metrik `JetBrains Mono` (`font-mono`).
   * Bu sınıflar `display` belirlediği için `hidden md:inline-flex` gibi duyarlı görünürlük sınıflarını doğrudan onlara değil, sarmalayıcı bir elemana verin.
2. **Özel Oynatıcı Kontrolleri:** YouTube iframe'i `controls=0` ile yüklenir ve `pointer-events: none` ile tıklamaları `.player-overlay` alır (klavye odağı sayfada kalır). Oynat / ses / tam ekran overlay'de; scrubber ve hız menüsü video altındadır. `listening` el sıkışması ~15 sn içinde kurulamazsa `enableNativeControls()` YouTube'un kendi kontrollerine geri döner.
3. **Klavye Kısayolları Güvenliği:** `keydown` dinleyicisine yeni bir kısayol eklerken mutlaka aktif elemanın `INPUT`, `SELECT` veya `TEXTAREA` olmadığını kontrol edin (kullanıcı arama yaparken veya ders notu yazarken kısayollar tetiklenmemelidir).
4. **Kod Doğrulama:** `js/app.js` üzerinde yapılan her değişiklikten sonra `node -c js/app.js` komutuyla sözdizimi (syntax) kontrolü yapılmalıdır.
