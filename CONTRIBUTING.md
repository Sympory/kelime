# Katkı rehberi

Kelime'ye katkı verdiğin için teşekkürler! Bu rehber iki yolu anlatıyor:

1. **Veri düzeltmesi** — Türkçe karşılık ya da örnek cümle düzeltmek. **Kod bilmen gerekmez**, GitHub'ın web arayüzü yeter.
2. **Kod katkısı** — yeni özellik, hata düzeltmesi, tasarım.

Her iki yolda da akış aynı: **dal aç → değişiklik yap → PR gönder → kontroller geçince gözden geçirilip birleştirilir.** `main` dalı korumalıdır; doğrudan değişiklik yapılamaz.

---

## 1. Veri düzeltmesi (kod gerekmez)

Uygulamadaki kelime verisi açık kaynaklardan otomatik üretiliyor; bazı Türkçe karşılıklar eksik, yanlış ya da yapay zekâ ile üretilmiş ("otomatik" etiketli) olabilir. Düzeltmeler `data/overrides/` klasöründeki iki dosyaya yazılır ve **otomatik üretilen verinin yerine geçer**.

### Hangi kelimeyi düzelteceğimi nasıl bulurum?

- Uygulamada kartın arkasında **"otomatik"** etiketi gördüğün her Türkçe karşılık gözden geçirilmeyi bekliyor.
- [`data/report.md`](data/report.md) dosyasında seviye seviye "Gözden geçirilmeyi bekleyen otomatik çeviriler" listesi var.
- [`good first issue`](https://github.com/Sympory/kelime/labels/good%20first%20issue) etiketli issue'lar küçük, başlangıca uygun işlerdir.

### Kelimenin kimliği (id)

Her kelimenin bir kimliği var: `kelime-tür`. Tür ekleri: `n` isim, `v` fiil, `adj` sıfat, `adv` zarf, `x` diğer.
Örnek: `decline-v`, `decision-n`, `reluctant-adj`. Uygulamada kelimenin detay sayfasının adresinde de görünür: `.../kelime/decline-v`.

### Adım adım (tarayıcıdan)

1. GitHub'da [`data/overrides/tr.json`](data/overrides/tr.json) dosyasını aç, sağ üstteki **kalem** (✏️ Edit) simgesine tıkla. GitHub senin için bir kopya (fork) oluşturur.
2. Kelimeyi ekle ya da düzelt:
   ```json
   {
     "$comment": "...",
     "deteriorate-v": ["kötüleşmek", "bozulmak"],
     "reluctant-adj": ["isteksiz", "gönülsüz"]
   }
   ```
   - En yaygın anlam önce, en fazla **4** karşılık.
   - Liste otomatik olanın **yerine** geçer (ekleme değil), "otomatik" etiketi de kalkar.
   - Satır sonlarındaki virgüllere dikkat: son satırdan sonra virgül olmaz.
3. Sayfanın altında **"Commit changes"** → **"Propose changes"** → **"Create pull request"**.
4. CI otomatik olarak dosyanın geçerli olduğunu kontrol eder (`npm run check:data`). Kırmızı ✗ çıkarsa hata mesajı neyin yanlış olduğunu söyler (ör. bilinmeyen kelime kimliği, fazla virgül).

Örnek cümle düzeltmeleri için [`data/overrides/examples.json`](data/overrides/examples.json) aynı şekilde çalışır; biçim [`data/overrides/README.md`](data/overrides/README.md)'de.

> **Lisans:** Kelime verisi CC BY-SA 4.0 ile dağıtılıyor. PR gönderdiğinde katkın da bu lisansla yayınlanır. Telifli sözlük ya da kitaplardan cümle **kopyalama**; kendi cümleni yaz ya da açık lisanslı kaynak kullan.

### Düzeltme ne zaman uygulamada görünür?

Düzeltmeler birleştirildikten sonra veriyi yeniden üreten kişi `npm run build:data` çalıştırınca `public/data/` dosyalarına yansır (bkz. aşağıdaki "Veri hattı").

---

## 2. Kod katkısı

### Kurulum

Gereksinim: **Node.js 22.18+**

```bash
git clone https://github.com/Sympory/kelime.git
cd kelime
npm install
npm run dev        # http://localhost:5173/
```

Uygulamayı geliştirmek için veri hattını çalıştırman **gerekmez**; üretilmiş veri `public/data/` altında repoda.

### Komutlar

| Komut                | Ne yapar                                                                         |
| -------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`        | Geliştirme sunucusu                                                              |
| `npm test`           | Birim testleri (Vitest)                                                          |
| `npm run lint`       | ESLint                                                                           |
| `npm run format`     | Prettier ile biçimlendir (`format:check` CI'da)                                  |
| `npm run check:data` | Veri ve overrides dosyalarını doğrula                                            |
| `npm run build`      | Tip kontrolü + üretim derlemesi (PWA dahil)                                      |
| `npm run build:data` | Veri hattı: listeleri indir, zenginleştir, `public/data/` üret (~600 MB indirir) |
| `npm run icons`      | `public/logo.svg`'den favicon ve PWA simgelerini üret                            |

CI (`.github/workflows/ci.yml`) PR'larda **lint, format, veri doğrulama, test ve build** çalıştırır; hepsi geçmeden birleştirilemez. Her PR'a Vercel bir **önizleme adresi** ekler; değişikliği tarayıcıda oradan dene.

### Proje yapısı

```
src/
├─ srs/        tekrar sistemi: zamanlayıcı (ts-fsrs), kuyruk, oturum, istatistik — saf fonksiyonlar + testler
├─ db/         IndexedDB (Dexie): kartlar, tekrar günlüğü, ayarlar, kendi kelimeler, yedek
├─ data/       kelime verisini yükleme (seviye dosyaları, sözlük)
├─ features/   ekranlar: home, study, placement, browse, word, add, stats, settings, onboarding
├─ components/ ortak bileşenler (CefrBadge, WordParts, ikonlar…)
└─ lib/        tema, sesli okuma, sözlük önerisi, CSV
scripts/       veri hattı (build-data.ts) ve doğrulama (check-data.ts)
data/          overrides (topluluk düzeltmeleri), report.md
public/data/   üretilmiş kelime verisi (a1.json … c2.json, lookup.json)
```

Ayrıntılı tasarım kararları [`PLAN.md`](PLAN.md)'de.

### Kurallar

- **Dal adı:** ne yaptığını anlatsın (`fix-kart-cevirme`, `ozellik-sesli-okuma-hizi`).
- **Küçük PR'lar:** bir PR bir konu. Büyük işleri parçalara böl.
- **Test:** `src/srs`, `src/db` ve saf yardımcı fonksiyonlara yapılan değişiklikler test içermeli.
- **Arayüz metni Türkçe**, kod içi yorumlar da Türkçe.
- **Görsel dil:** yeni ekranlarda `src/index.css`'teki ortak sınıfları kullan (`surface`, `btn-primary`, `btn-brand`, `btn-ghost`, `field`, `chip`, `eyebrow`). Animasyonlar kısa (≤ 300 ms) olmalı ve `prefers-reduced-motion`'a saygı göstermeli.
- **Ücretsiz kalmalı:** ücretli API, sunucu ya da veritabanı ekleme (bkz. PLAN.md "Temel kısıtlar").
- **Gizlilik:** kullanıcı verisi tarayıcıdan dışarı gönderilmez. Dış servis (ör. Datamuse) gerekiyorsa yalnızca gerekli en küçük bilgi gönderilir ve arayüzde belirtilir.

### Veri hattı

`npm run build:data` şu adımları izler: CEFR-J + Octanove listeleri → Wiktionary (İngilizce ve Türkçe) → WordNet → Tatoeba örnek cümleleri → Datamuse collocation'ları → `data/overrides/` → `public/data/*.json` ve `data/report.md`. Ham indirmeler `data/raw/`, önbellekler `scripts/.cache/` altına iner (ikisi de git dışı). Kaynakların lisansları: [`DATA_LICENSES.md`](DATA_LICENSES.md).

---

## Hata bildirimi ve öneriler

[Issue aç](https://github.com/Sympory/kelime/issues/new/choose) — şablonlar ne yazman gerektiğini soracak. Hata bildirirken telefon/tarayıcı bilgisi ve mümkünse ekran görüntüsü çok yardımcı olur.
