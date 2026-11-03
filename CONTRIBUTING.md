# Katkıda Bulunma Rehberi (CONTRIBUTING.md)

**Calculus 2 Öğrenim Portalı** projesini geliştirmek istediğiniz için teşekkürler! Bu belge, projeyi kendi bilgisayarınızda nasıl çalıştıracağınızı, kod yapısını ve nasıl yeni özellikler ekleyebileceğinizi açıklar.

---

## 🛠️ Geliştirme Ortamını Kurma

Proje **Zero-Build (Sıfır Derleme)** felsefesiyle geliştirilmiştir; herhangi bir ağır paket yöneticisi veya derleme adımı gerektirmez.

1. Depoyu bilgisayarınıza klonlayın:
   ```bash
   git clone https://github.com/<kullanici-adi>/calculus2-portal.git
   cd calculus2-portal
   ```
2. Yerel sunucuyu başlatın:
   * **Windows:** `Baslat.bat` dosyasına çift tıklayın.
   * **VS Code:** *Live Server* eklentisi ile `index.html`'e sağ tıklayıp *"Open with Live Server"* deyin.
   * **Python:** `python -m http.server 8080`
   * **Node.js:** `npm run dev` (veya `npx serve -l 8080`)

---

## 📂 Kod Yapısı ve Modüller

* **`index.html`**: Sadece sayfa iskeletini ve UI bileşenlerini barındırır.
* **`css/style.css`**: Aydınlık/Karanlık mod CSS değişkenleri (`--bg`, `--card`, `--text`, `--border`, `--primary`) ve Sinema Modu (`theater-active`) kuralları.
* **`js/app.js`**:
  * YouTube IFrame `postMessage` iletişimi ve durum takibi
  * Tampermonkey 3x hız köprüsü
  * Oynatma listesi oluşturma, canlı arama ve filtreleme
  * Video bazlı kişisel ders notları ve Pomodoro sayacı
  * JSON yedekleme (Export / Import)
* **`data/curriculum_videos.json` & `js/data.js`**:
  * Videolarla ilgili bir başlık, sıra veya link değiştirecekseniz **`data/curriculum_videos.json`** dosyasını düzenleyin.
  * Ardından terminalde şu komutu çalıştırarak `js/data.js` dosyasını otomatik güncelleyin:
    ```bash
    python scripts/build_data.py
    ```

---

## 💡 Geliştirilebilecek Fikirler (Roadmap)

Projeye katkıda bulunmak isterseniz aşağıdaki fikirlerden başlayabilirsiniz:
1. **Zaman Damgalı Notlar (Timestamped Notes):** Ders notu yazarken `04:25` gibi dakikalara tıklandığında videoyu doğrudan o saniyeye saran (`seekTo`) özellik.
2. **Formül Kağıdı (Cheat Sheet) Sekmesi:** Her haftanın (örn. Seri Testleri, Kuadrik Yüzeyler, Katlı İntegral) özet formüllerini içeren açılır bir panel (KaTeX / MathJax ile).
3. **Çoklu Ders Desteği:** Aynı altyapıya BUders'in *Calculus 1*, *Lineer Cebir* ve *Diferansiyel Denklemler* derslerinin eklenmesi.
4. **İstatistik & Çalışma Grafiği:** Günlük kaç video izlendiğini gösteren mini aktivite grafiği.

---

## ✅ Pull Request (PR) Gönderirken Dikkat Edilecekler

1. Yeni eklediğiniz UI elemanlarında sabit renkler yerine `var(--card)`, `var(--text)` gibi tema değişkenlerini kullanın (Aydınlık ve Karanlık modda test edin).
2. Kullanıcıların mevcut verilerinin silinmemesi için `js/app.js` içindeki `localStorage` anahtar isimlerini (`calculus2_watched_videos_v1` vb.) değiştirmeyin.
3. Kodu göndermeden önce `node -c js/app.js` ile sözdizimi hatası olmadığından emin olun.
