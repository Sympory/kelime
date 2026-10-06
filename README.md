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

Gereksinim: Node.js 22+

```bash
npm install
npm run dev        # http://localhost:5173/kelime/
npm run build      # tip kontrolü + üretim derlemesi (dist/)
npm run lint       # ESLint
npm run format     # Prettier ile biçimlendir
```

`main` dalına yapılan her push GitHub Actions ile GitHub Pages'e otomatik yayınlanır.

## Lisans

Kod [MIT](LICENSE) lisanslıdır. Kelime verileri kendi lisanslarını taşır (bkz. `DATA_LICENSES.md`, Faz 1'de eklenecek).
