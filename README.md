# 📐 Calculus 2 (Matematik 2) Video Portalı & Çalışma Takipçisi

Üniversite **Calculus 2 (Matematik 2)** dersi için 13 haftalık müfredatı kapsayan, [BUders](https://www.buders.com) video arşivindeki 390+ videoyu düzenli bir oynatma listesi, **1x - 3x hız kontrolü**, **ilerleme takip sistemi** ve **sinema modu** ile bir araya getiren bağımsız web uygulaması.

---

## 🚀 Özellikler

* **🎥 Gömülü YouTube Oynatıcı:** Siteden ayrılmadan tüm ders ve soru çözüm videolarını geniş ekranda izleme.
* **⛶ Sinema / Geniş Ekran Modu:** Ekranı dolduran devasa video deneyimi (<kbd>T</kbd> tuşu ile geçiş).
* **⚡ 1x - 3x Hızlandırma Desteği:**
  * 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2.0x (Resmi YouTube hızları - Tamamen ücretsiz)
  * 2.5x ve 3.0x özel hızlandırma (Tampermonkey userscript entegrasyonu ile)
  * Seçilen oynatma hızını sonraki videolarda otomatik koruma
* **💾 Otomatik İlerleme Kaydı (`localStorage`):** İzlenen videoları işaretleme ve genel tamamlanma yüzdesi takibi. Sayfa kapatılsa dahi veriler silinmez.
* **📥/📤 İlerlemeyi Dışa / İçe Aktarma:** İlerleme geçmişini JSON olarak yedekleme veya farklı cihazlara aktarma.
* **📚 13 Haftalık Müfredat Filtresi:** Thomas' / Stewart standart konu kodlarına (9.1 - 14.8) göre organize edilmiş üniteler.
* **🔍 Canlı Arama:** Konu adına veya soru tipine göre anında filtreleme.
* **🌙 Karanlık / ☀️ Aydınlık Mod:** Göz yormayan tema seçeneği.

---

## 💻 Başlangıç & Çalıştırma

Projeyi yerel bilgisayarınızda çalıştırmak için:

### Windows:
Klasörün içindeki **`Baslat.bat`** dosyasına çift tıklayın. Tarayıcınız otomatik olarak `http://localhost:8080` adresinde açılacaktır.

### Mac / Linux:
Terminalde proje dizinine gidip yerel bir sunucu başlatın:
```bash
python3 -m http.server 8080
# veya Node.js ile:
npx serve
```
Ardından tarayıcınızdan `http://localhost:8080` adresine gidin.

> **Önemli Not:** YouTube'un güvenlik politikası gereği sayfayı yerel `file://` protokolü yerine yerel bir HTTP sunucusu üzerinden çalıştırmak gerekmektedir (`Baslat.bat` bunu otomatik yapar).

---

## ⚡ 3x Hızlandırma Desteği (Tampermonkey)

YouTube resmi oynatıcı API'si en fazla **2.0x** hıza izin vermektedir. Tarayıcıların güvenlik protokolleri (CORS / Same-Origin Policy) harici sitelerin video etiketine doğrudan müdahalesini kısıtlar.

**3x ve 2.5x hızları doğrudan kullanabilmek için:**
1. Tarayıcınıza [Tampermonkey](https://www.tampermonkey.net/) eklentisini kurun.
2. Projedeki **`calculus2_hizlandirici.user.js`** dosyasına tıklayın ve açılan sekmede **"Kur (Install)"** deyin.
3. Sayfayı yenilediğinizde üst bardaki rozet yeşile döner ve sitedeki `2.5x` / `3.0x` butonları YouTube videosuna doğrudan etki eder.

---

## ⌨️ Klavye Kısayolları

| Kısayol | Açıklama |
| :--- | :--- |
| **Q / W / E / R** | Hızlı Hız Değiştirme (1.0x / 1.25x / 1.5x / 2.0x) |
| **T** | Doğrudan **3.0x Hızlandırma** ⚡ (Tampermonkey ile) |
| **F** | Sinema / Geniş Ekran Modunu Aç / Kapat |
| **Boşluk (Space)** | Oynat / Durdur |
| **N / P** | Sonraki / Önceki Videoya Geç |
| **M** | Mevcut Videoyu İzlendi Olarak İşaretle |
| **< / >** | Hızı Kademeli Azalt / Artır (±0.25x) |

---

## 📁 Proje Dosya Yapısı

```text
calculus2-portal/
├── index.html                       # Ana web uygulaması
├── calculus2_hizlandirici.user.js   # 3x hızlandırma için Tampermonkey userscript'i
├── Baslat.bat                       # Windows için tek tıkla yerel sunucu başlatıcı
├── server.ps1                       # Dahili PowerShell yerel web sunucusu
├── 13_haftalik_mufredat_plani.md    # 13 haftalık ders planı ve video tablosu
├── tum_buders_calculus2_tablosu.md  # 590+ videoluk genel BUders arşivi
└── README.md                        # Proje dokümantasyonu
```

---

## 📚 Kaynakça

* Video içerikleri ve konu anlatımları: [BUders Matematik 2 (Calculus 2)](https://www.buders.com)
* Müfredat konu dağılımı: Thomas' Calculus / Stewart Calculus standart müfredatı