# Kelime

Açık kaynak, tamamen ücretsiz İngilizce kelime kartı uygulaması. B1 → B2+/C1 hedefi için günde ~15 dakikalık aralıklı tekrar (spaced repetition) çalışması.

**Canlı:** https://sympory.github.io/kelime/

## Özellikler (planlanan)

- FSRS algoritmasıyla aralıklı tekrar (`ts-fsrs`)
- Her kelimede CEFR seviyesi, İngilizce tanım, Türkçe karşılık, örnek cümleler, collocation'lar, eş anlamlılar, kelime ailesi
- Hesap yok: ilerleme tarayıcıda (IndexedDB) tutulur, JSON ile dışa/içe aktarılır
- Telefonda ana ekrana eklenebilir, internetsiz çalışır (PWA)

Ayrıntılı yol haritası için [PLAN.md](PLAN.md).

## Geliştirme

Gereksinim: Node.js 22.18+ (veri betikleri TypeScript'i doğrudan Node ile çalıştırır)

```bash
npm install
npm run dev        # http://localhost:5173/kelime/
npm run build      # tip kontrolü + üretim derlemesi (dist/)
npm run lint       # ESLint
npm run format     # Prettier ile biçimlendir
```

`main` korumalıdır: değişiklikler dal + PR ile gelir, CI (lint, format, build) geçmeden birleştirilemez. `main`'e giren her değişiklik GitHub Pages'e otomatik yayınlanır.

## Kelime verisi

Üretilmiş veri `public/data/` altında repoda durur (`a1.json` … `c2.json`, `index.json`); uygulamayı geliştirmek için veri hattını çalıştırmanız **gerekmez**.

Veriyi yeniden üretmek için:

```bash
npm run build:data                    # ilk seferde ~600 MB indirir, Datamuse ile ~30-40 dk
npm run build:data -- --no-datamuse   # collocation'lar olmadan, hızlı
```

Hat şu adımları izler (`scripts/`):

1. **Liste:** CEFR-J (A1–B2) + Octanove (C1–C2) birleştirilir, tekilleştirilir.
2. **Wiktionary:** İngilizce tanım, IPA, Türkçe karşılık, çekimli hâller.
3. **WordNet:** eş anlamlılar, kelime ailesi.
4. **Tatoeba:** kelimenin geçtiği, Türkçe çevirili, kısa örnek cümleler (yazar atfıyla).
5. **Datamuse:** collocation'lar (önbellek: `scripts/.cache/`).
6. **Overrides:** `data/overrides/` altındaki topluluk düzeltmeleri uygulanır.
7. **Rapor:** kapsama tablosu ve Türkçesi eksik kelimeler → [`data/report.md`](data/report.md).

Ham dosyalar `data/raw/`, önbellekler `scripts/.cache/` altına iner (ikisi de git dışı).

### Katkı: Türkçe karşılık ve örnek düzeltmeleri

Kod bilmeden katkı vermenin en kolay yolu: [`data/overrides/`](data/overrides/README.md).

## Lisans

Kod [MIT](LICENSE) lisanslıdır. Kelime verisi kaynaklarından gelen lisansları taşır ve bir bütün olarak CC BY-SA 4.0 ile dağıtılır — bkz. [DATA_LICENSES.md](DATA_LICENSES.md).
