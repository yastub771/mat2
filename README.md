# 📐 Calculus 2 (Matematik 2) Video Portalı & Çalışma Takipçisi

Üniversite **Calculus 2 (Matematik 2)** dersi için 13 haftalık standart müfredatı ve vize/final sınav hazırlık sorularını kapsayan; [BUders](https://www.buders.com) arşivindeki **486 videoyu** düzenli bir oynatma listesi, **1x – 3x hız kontrolü**, **kişisel video notları**, **Pomodoro sayacı** ve **ilerleme takip sistemi** ile bir araya getiren açık kaynaklı web uygulaması.

---

## 🚀 Özellikler

* **🎥 Gömülü YouTube Oynatıcı & Sinema Modu:** Siteden ayrılmadan tüm ders ve soru çözüm videolarını geniş ekran modunda (<kbd>Y</kbd>) veya tam ekranda (<kbd>F</kbd>) izleme.
* **⚡ 1x – 3x Hızlandırma & QWERTY Kısayolları:**
  * `0.75x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x` (Resmi YouTube hızları — ücretsiz)
  * `2.5x` ve `3.0x` özel hızlandırma (Tampermonkey Userscript köprüsü ile)
  * <kbd>Q</kbd> `1x`, <kbd>W</kbd> `1.25x`, <kbd>E</kbd> `1.5x`, <kbd>R</kbd> `2x`, <kbd>T</kbd> `3x` klavye kısayolları
  * Seçilen oynatma hızını sonraki videolarda otomatik koruma
* **📝 Video Bazlı Ders Notları:** Her videonun altına o videoya özel formül, ipucu veya dakika notları alma (`📝 Notlular` filtresiyle hızlı erişim).
* **🔄 Otomatik Geçiş & İzlendi İşaretleme:** Video bittiğinde otomatik olarak izlendi işaretleyip sıradaki videoya geçme.
* **🍅 Pomodoro Çalışma Sayacı:** Üst menüye entegre 25 dakikalık odaklanma sayacı.
* **💾 Otomatik Kayıt & JSON Yedekleme:** İzlenen videolar ve alınan ders notları `localStorage` üzerinde saklanır; tek tıkla `.json` olarak dışa/içe aktarılabilir.
* **📚 13 Haftalık Müfredat + Sınav Özel Bölümleri:**
  * **Hafta 1 – 13:** Thomas' / Stewart Calculus standart konu kodlarına (`9.1` – `14.8`) göre eşleştirilmiş 394 ders videosu.
  * **Sınav Özel:** 32 adet çıkmış seri sorusu + 60 adet vize/final genel sınav sorusu.

---

## 💻 Başlangıç & Çalıştırma

Projeyi yerel bilgisayarınızda çalıştırmak için:

### Windows (Tek Tıkla):
Klasörün içindeki **`Baslat.bat`** dosyasına çift tıklayın. Tarayıcınız otomatik olarak `http://localhost:8080` adresinde açılacaktır.

### Mac / Linux / Geliştirici Ortamı:
Terminalde proje dizinine gidip yerel bir HTTP sunucusu başlatın:
```bash
python3 -m http.server 8080
# veya Node.js ile:
npm run dev
```
Ardından tarayıcınızdan `http://localhost:8080` adresine gidin.

> **Not:** YouTube'un güvenlik politikası (Hata 153) gereği sayfayı yerel `file://` protokolü yerine yerel bir HTTP sunucusu üzerinden çalıştırmak gerekmektedir (`Baslat.bat` bunu otomatik yapar).

---

## ⚡ 3x Hızlandırma Kurulumu (Tampermonkey)

YouTube resmi oynatıcı API'si hızı maksimum **2.0x** ile sınırlar ve tarayıcıların güvenlik duvarı (CORS) harici sitelerin video etiketine doğrudan müdahalesini engeller.

**2.5x ve 3.0x hızlarını doğrudan kullanabilmek için:**
1. Tarayıcınıza [Tampermonkey](https://www.tampermonkey.net/) eklentisini kurun.
2. Projedeki **`calculus2_hizlandirici.user.js`** dosyasına (veya site içindeki *"1-Tıkla Scripti Yükle"* butonuna) tıklayıp **"Kur (Install)"** deyin.
3. Sayfayı yenilediğinizde üst bardaki gösterge `3x hazır` olur ve <kbd>T</kbd> tuşu veya hız menüsündeki `3x` doğrudan YouTube videosuna etki eder.

---

## ⌨️ Klavye Kısayolları

| Kısayol | Açıklama |
| :--- | :--- |
| **Q / W / E / R** | Hızlı Hız Değiştirme (`1.0x` / `1.25x` / `1.5x` / `2.0x`) |
| **T** | Doğrudan **3.0x Hızlandırma** ⚡ (Tampermonkey ile) |
| **F** | Tam Ekran Aç / Kapat |
| **Y** | Sinema / Geniş Ekran Modunu Aç / Kapat |
| **Boşluk (Space)** | Oynat / Durdur (Toggle) |
| **← / → (Sol / Sağ Ok)** | 10 Saniye Geri / İleri Sar |
| **N / P** | Sonraki / Önceki Videoya Geç |
| **M** | Mevcut Videoyu İzlendi Olarak İşaretle |
| **< / >** | Hızı Kademeli Azalt / Artır (`±0.25x`) |

---

## 📁 Proje Mimari Yapısı

```text
calculus2-portal/
├── index.html                       # Ana kullanıcı arayüzü
├── css/
│   └── style.css                    # Açık/Koyu tema değişkenleri ve özel stiller
├── js/
│   ├── data.js                      # Tarayıcı tarafından yüklenen müfredat veri seti
│   └── app.js                       # Oynatıcı, hız köprüsü, notlar, filtreleme ve kısayol mantığı
├── data/
│   ├── curriculum_videos.json       # 13 haftalık müfredat + sınav hazırlık ham JSON verisi
│   └── all_buders_videos.json       # Tüm BUders Calculus 2 konularının ham arşivi
├── docs/
│   ├── 13_haftalik_mufredat_plani.md # Haftalık ders planı Markdown tabloları
│   └── tum_buders_calculus2_tablosu.md # 590+ videoluk genel BUders tablosu
├── scripts/
│   ├── build_data.py                # JSON verisinden js/data.js üreten derleme scripti
│   └── server.ps1                   # Windows için kurulumsuz yerel PowerShell sunucusu
├── calculus2_hizlandirici.user.js   # 3x hızlandırma için Tampermonkey Userscript köprüsü
├── Baslat.bat                       # Windows için tek tıkla başlatıcı
├── CONTRIBUTING.md                  # Geliştiriciler için katkıda bulunma rehberi
├── GEMINI.md                        # AI asistanları ve geliştiriciler için mimari kurallar
├── package.json                     # NPM betikleri ve proje meta verisi
└── LICENSE                          # MIT Lisansı
```

---

## 🤝 Katkıda Bulunma

Projeyi geliştirmek veya yeni özellikler eklemek için [CONTRIBUTING.md](CONTRIBUTING.md) ve mimari kuralları içeren [GEMINI.md](GEMINI.md) dosyalarını inceleyebilirsiniz.

---

## 📚 Kaynakça & Lisans

* **Video İçerikleri:** [BUders Matematik 2 (Calculus 2)](https://www.buders.com/altsayfa/calculus_2_videolari.html)
* **Müfredat Akışı:** Thomas' Calculus / Stewart Calculus standart ders planı
* **Lisans:** [MIT](LICENSE)
