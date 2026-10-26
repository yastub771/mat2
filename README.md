# 📐 Calculus 2 (Mat 2) Video Öğrenim Portalı

Bu proje, üniversite **Calculus 2 (Matematik 2)** dersini alan öğrencilerin 13 haftalık müfredatı BUders video arşivi üzerinden eksiksiz, planlı ve verimli bir şekilde çalışabilmesi için hazırlanmış bağımsız bir web uygulamasıdır.

---

## ⚡ Hızlı Başlangıç (Nasıl Çalıştırılır?)

YouTube'un güvenlik politikası nedeniyle, `index.html` dosyasına doğrudan çift tıklanarak (`file://` protokolü ile) açıldığında YouTube **"Hata 153: Video oynatıcı yapılandırma hatası"** verebilmektedir. 

Bunu önlemek ve videoları sorunsuz izlemek için:

1. **Windows Kullanıcıları (1 Tıkla Açma):**
   * Klasördeki **`Baslat.bat`** dosyasına çift tıklayın.
   * Tarayıcınız otomatik olarak `http://localhost:8080` adresinde açılır ve tüm videolar hatasız oynatılır.

2. **Mac / Linux Kullanıcıları:**
   * Klasörde terminal açıp `python3 -m http.server 8080` yazın ve tarayıcıda `http://localhost:8080` adresine gidin.

3. **Canlı Web Sitesi (Kuruluma Gerek Yok):**
   * Dosyayı GitHub Pages veya Vercel'e yüklediğinizde (`https://...` bağlantısı olduğu için) hem siz hem arkadaşlarınız ek bir çalıştırma işlemi yapmadan doğrudan izleyebilirsiniz.

---

## 👥 Arkadaşlarınızla Nasıl Paylaşabilirsiniz?

### 1. Yöntem: Doğrudan Dosya Gönderme (En Kolay)
* Proje klasörünü zip haline getirip (`calculus2-portal.zip`) veya sadece **`index.html`** dosyasını **WhatsApp**, **Telegram**, **Discord** ya da **Google Drive** üzerinden arkadaşlarınıza gönderebilirsiniz.
* Karşı taraf dosyayı indirdiği anda tarayıcısında açıp izlemeye başlayabilir.

### 2. Yöntem: GitHub Pages ile Ücretsiz Web Sitesi Yapma (Önerilen)
Arkadaşlarınıza doğrudan tıklayıp girebilecekleri bir link (örneğin `https://kullaniciadi.github.io/calculus2`) vermek isterseniz:
1. [GitHub](https://github.com)'a girin ve yeni bir repository (örneğin `calculus2`) açın.
2. Bu klasördeki `index.html` dosyasını repository'ye yükleyin (Upload files).
3. Repository sayfasında **Settings -> Pages** sekmesine gidin.
4. **Branch** kısmını `main` ve `/ (root)` seçip **Save** butonuna tıklayın.
5. 1-2 dakika içinde siteniz herkese açık canlı bir web sitesi linki haline gelecektir!

### 3. Yöntem: Vercel / Netlify (Sürükle-Bırak)
* [Vercel](https://vercel.com) veya [Netlify](https://netlify.com)'ye ücretsiz üye olun.
* `calculus2-portal` klasörünü ekrana sürükleyip bırakın. Saniyeler içinde size özel canlı bir web sitesi adresi oluşturulacaktır.

---

## 🌟 Öne Çıkan Özellikler

* **🎥 Gömülü Oynatıcı:** Siteden ayrılmadan YouTube videoları geniş ekranda doğrudan oynatılır.
* **⚡ 1x - 3x Hızlandırma:** `0.75x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`, `2.5x` ve `3.0x` hız butonları ve hassas kaydırıcı.
* **💾 Otomatik Kayıt (`localStorage`):** İzlediğiniz videoların onay kutuları tarayıcınızın hafızasına kaydedilir, sayfayı kapatsanız dahi silinmez.
* **📥/📤 İlerlemeyi Dışa / İçe Aktarma:** İlerlemenizi JSON formatında yedekleyebilir veya başka bir bilgisayara/tarayıcıya aktarabilirsiniz.
* **🌙 Karanlık / ☀️ Aydınlık Mod:** Tek tıkla göz yormayan tema değişimi.
* **📚 13 Haftalık Müfredat Filtresi:** Thomas' / Stewart standart konu kodlarına (9.1 - 14.8) göre organize edilmiş 394 video.
* **🔍 Hızlı Arama:** Konu veya soru tipine göre filtreleme.

---

## ⌨️ Klavye Kısayolları

| Kısayol | Fonksiyon |
| :--- | :--- |
| **Boşluk (Space)** | Oynat / Durdur |
| **Shift + >** | Hızı Artır (+0.25x) |
| **Shift + <** | Hızı Azalt (-0.25x) |
| **N** | Sonraki Videoya Geç |
| **P** | Önceki Videoya Dön |
| **M** | Mevcut Videoyu İzlendi Olarak İşaretle |

---

## 📁 Proje Dosya Yapısı

* **`index.html`**: Tüm arayüzü, videoları ve hız kontrol mantığını barındıran bağımsız web sitesi.
* **`13_haftalik_mufredat_plani.md`**: Haftalık konu ve video dökümünün detaylı Markdown tablosu.
* **`tum_buders_calculus2_tablosu.md`**: BUders platformundaki 29 ana konunun ve 590+ videonun genel arşivi.
* **`README.md`**: Bu bilgilendirme ve paylaşım rehberi.
