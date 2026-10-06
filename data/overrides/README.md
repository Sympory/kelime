# Topluluk düzeltmeleri

Bu klasördeki dosyalar `npm run build:data` sırasında otomatik üretilen verinin **üzerine yazılır**. Kod bilmeden katkı vermenin en kolay yolu burası.

Kelime kimliği (`id`) `public/data/*.json` dosyalarında görünür: `lemma-tür` biçimindedir. Tür ekleri: `n` (isim), `v` (fiil), `adj` (sıfat), `adv` (zarf), `x` (diğer). Örnek: `deteriorate-v`, `decision-n`.

Eksik Türkçe karşılıkların listesi için bkz. [`data/report.md`](../report.md).

## `tr.json` — Türkçe karşılıklar

```json
{
  "deteriorate-v": ["kötüleşmek", "bozulmak"],
  "reluctant-adj": ["isteksiz", "gönülsüz"]
}
```

- En yaygın anlam önce gelsin; en fazla 4 karşılık.
- Liste otomatik üretilen karşılıkların yerine geçer (ekleme değil).

## `examples.json` — Örnek cümleler

```json
{
  "deteriorate-v": [{ "en": "His health deteriorated rapidly.", "tr": "Sağlığı hızla kötüleşti." }]
}
```

- En fazla 3 cümle. `tr` isteğe bağlıdır.
- Kendi yazdığınız cümleleri ya da açık lisanslı kaynakları kullanın; telifli kitap/sözlük cümlelerini kopyalamayın.

## Akış

1. Dosyayı düzenleyin (GitHub web arayüzünden de olur: dosyayı açıp kalem simgesine tıklayın).
2. PR açın. CI geçince birisi gözden geçirip birleştirir.
3. Veriyi yeniden üreten kişi `npm run build:data` çalıştırdığında düzeltmeniz `public/data/` dosyalarına yansır.
