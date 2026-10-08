# Kelime

Açık kaynak, tamamen ücretsiz İngilizce kelime kartı uygulaması. B1 → B2+/C1 hedefi için günde ~15 dakikalık aralıklı tekrar (spaced repetition) çalışması.

**Canlı:** https://kelime-pink.vercel.app/

## Özellikler

- **Aralıklı tekrar:** FSRS algoritması (`ts-fsrs`); günlük kuyruk, Tekrar / Zor / İyi / Kolay, telefonda kaydırma, klavye kısayolları
- **9.723 kelime (A1–C2):** CEFR seviyesi, İngilizce tanım, IPA, Türkçe karşılık, Tatoeba örnek cümleleri (Türkçe çevirili), collocation'lar, eş anlamlılar, kelime ailesi
- **Kart ön yüzünde cümle içinde kelime**, her tekrarda farklı örnek; isteğe bağlı Türkçe → İngilizce yönü
- **Hızlı eleme:** bildiğin kelimeleri kaydırarak ayıkla, yalnızca bilmediklerini çalış
- **Makaleden ekle:** okuduğun metinde kelimeye dokun; cümle o kelimenin kartına eklenir, listede yoksa kendi kelimen olur
- **Kendi listen:** CSV ile kelime listesi içe aktar (ör. Oxford 5000; yalnızca tarayıcında kalır)
- **İstatistik:** seri, doğru oranı, son 30 gün ısı haritası, önümüzdeki 7 günün yükü
- **Telaffuz:** tarayıcının sesli okuması (Amerikan / İngiliz aksanı)
- **Hesap yok:** ilerleme tarayıcıda (IndexedDB) tutulur, JSON yedeği ile cihazlar arası taşınır
- **Telefona kurulabilir, internetsiz çalışır** (PWA); açık / koyu tema

Ayrıntılı yol haritası için [PLAN.md](PLAN.md).

## Geliştirme

Gereksinim: Node.js 22.18+ (veri betikleri TypeScript'i doğrudan Node ile çalıştırır)

```bash
npm install
npm run dev        # http://localhost:5173/
npm run build      # tip kontrolü + üretim derlemesi (dist/)
npm run lint       # ESLint
npm run format     # Prettier ile biçimlendir
```

Yayın **Vercel** üzerinden yapılır: `main`'e giren her değişiklik production'a çıkar, her PR otomatik bir önizleme adresi alır. GitHub Actions (`ci.yml`) yalnızca kontrol çalıştırır (lint, format, veri doğrulama, build); `main` korumalıdır ve bu kontroller geçmeden merge edilemez.

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

## Katkı

Katkılar çok değerli — özellikle **Türkçe karşılık düzeltmeleri**, ki bunun için kod bilmek gerekmez. Ayrıntılar: [CONTRIBUTING.md](CONTRIBUTING.md).

- Uygulamada "otomatik" etiketli Türkçe karşılıklar gözden geçirilmeyi bekliyor ([liste](data/report.md)).
- Başlangıç için: [`good first issue`](https://github.com/Sympory/kelime/labels/good%20first%20issue).
- Hata ya da öneri: [issue aç](https://github.com/Sympory/kelime/issues/new/choose).

## Lisans

Kod [MIT](LICENSE) lisanslıdır. Kelime verisi kaynaklarından gelen lisansları taşır ve bir bütün olarak CC BY-SA 4.0 ile dağıtılır — bkz. [DATA_LICENSES.md](DATA_LICENSES.md).
