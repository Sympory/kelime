# Kelime — Açık Kaynak İngilizce Kelime Kartı Uygulaması

> Bu dosya Claude Code için proje planıdır. Repo kökünde `PLAN.md` olarak dursun, ilk mesajda "PLAN.md'yi oku ve Faz 0'dan başla" de.

## Amaç

B1 → B2+/C1 hedefi için günlük ~15 dakikalık kelime çalışması yapılan, **tamamen ücretsiz**, **açık kaynak**, arkadaşlarla GitHub üzerinden geliştirilebilen bir web uygulaması.

- Bilinmeyen kelimeler aralıklı tekrar (spaced repetition) ile belirli aralıklarla yeniden çıkar.
- Her kelimede CEFR seviyesi, anlamı (İngilizce + Türkçe), örnek cümleler, kelime bağlantıları (collocation, eş anlamlı, kelime ailesi) görünür.
- Görsel olarak güzel, hızlı, telefonda da rahat kullanılır.

## Temel kısıtlar

- **Maliyet sıfır:** Backend, veritabanı, ücretli API yok.
- **Yayın:** Vercel (Hobby, ücretsiz) — GitHub reposu Vercel'e bağlı. `main`'e giren her değişiklik production'a çıkar, her PR otomatik bir **önizleme adresi** alır (arkadaşlar değişikliği merge'den önce canlı deneyebilir). Site kökten yayınlanır, Vite `base` ayarı `/` (varsayılan). Vercel yapılandırması `vercel.json`'da.
  - Not: Vercel Hobby planı kişisel/ticari olmayan kullanım içindir; proje öyle kaldığı sürece ücretsiz.
- **Açık kaynak:** Public repo `Sympory/kelime`, MIT lisans (kod). Veri dosyaları kendi lisanslarını taşır (aşağıda).
- **Kullanıcı ilerlemesi tarayıcıda tutulur** (IndexedDB). Hesap/giriş yok. Dışa/içe aktarma (JSON) ile cihazlar arası taşınır.

## Teknoloji

| Katman | Seçim | Neden |
|---|---|---|
| Build | Vite + React + TypeScript | Hızlı, statik çıktı, Vercel'e uygun |
| Stil | Tailwind CSS + Framer Motion | Hızlı güzel arayüz, kart çevirme animasyonu |
| Yerel veri | Dexie.js (IndexedDB) | Kart durumları, kullanıcı kartları, ayarlar |
| Tekrar algoritması | `ts-fsrs` (MIT) | Modern FSRS algoritması; SM-2'den daha isabetli aralıklar |
| Offline/telefon | `vite-plugin-pwa` | Ana ekrana eklenebilir, internetsiz çalışır |
| Router | React Router (BrowserRouter) | Temiz adresler (`/kaynaklar`); `vercel.json`'daki SPA yönlendirmesi sayesinde yenilemede 404 olmaz |
| Deploy | Vercel GitHub entegrasyonu | `main` → production, her PR → önizleme adresi |
| CI | GitHub Actions (`ci.yml`) | lint + format + veri doğrulama + build; geçmeden merge yok |
| Veri hazırlama | Node/TS script'leri (`scripts/`) | Veri build sırasında bir kez üretilip statik JSON olarak repoya girer |

## Kelime verisi — kaynaklar ve lisans

**Önemli:** Oxford 3000/5000 listeleri Oxford University Press'in telif hakkı altında. Public repoya tam listeyi koymak sorunlu. Bu yüzden:

1. **Varsayılan liste açık lisanslı kaynaklardan kurulur:**
   - **CEFR-J Wordlist** (A1–B2, ~7.800 kelime; atıf şartıyla serbest kullanım)
   - **Octanove Vocabulary Profile C1/C2** (CC BY-SA 4.0)
   - Bu ikisi birlikte Oxford 5000'in kapsadığı aralığı (A1–C1) karşılar ve her kelimede CEFR seviyesi hazır gelir.
2. **CSV içe aktarma özelliği** olur: Kullanıcı kendi elindeki listeyi (ör. Oxford 5000) kendi tarayıcısına yükler; bu veri repoya girmez.

Kelime başına zenginleştirme (hepsi build sırasında, `scripts/` ile):

| Bilgi | Kaynak | Lisans |
|---|---|---|
| İngilizce tanım, tür (noun/verb…), IPA | Wiktionary (kaikki.org JSONL dökümü) veya dictionaryapi.dev | CC BY-SA |
| Türkçe karşılık | Wiktionary'deki `translations` alanı (tr) | CC BY-SA |
| Örnek cümleler + Türkçe çevirisi | Tatoeba İngilizce–Türkçe cümle çiftleri | CC BY 2.0 FR |
| Eş anlamlı, kelime ailesi | WordNet (`wordnet-db`) | WordNet lisansı (serbest) |
| Collocation / sık beraber kullanılan kelimeler | Datamuse API (`rel_jja`, `rel_jjb`, `lc`, `rc`) — build sırasında çekilip önbelleğe alınır | Ücretsiz, anahtar yok |

Kurallar:
- Lisans şartlarını mutlaka doğrula ve `DATA_LICENSES.md` ile uygulama içi "Kaynaklar" sayfasına atıfları yaz. CC BY-SA veriler `data/` altında ayrı lisans notuyla dursun.
- Datamuse'a build sırasında saygılı istek at (rate limit, önbellek dosyası `scripts/.cache/`).
- Türkçe karşılığı bulunamayan kelimeler boş kalsın; arkadaşlar PR ile doldurabilsin (`data/overrides/tr.json`).

### Veri formatı

Seviyeye göre parçalanmış statik dosyalar (`public/data/a1.json` … `c1.json`), ilk açılış hızlı olsun diye yalnızca gereken seviye yüklenir.

```ts
type Word = {
  id: string;            // "deteriorate-v"
  lemma: string;         // "deteriorate"
  pos: "noun" | "verb" | "adj" | "adv" | "other";
  cefr: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  ipa?: string;
  defEn: string[];       // kısa İngilizce tanımlar (en fazla 2)
  tr: string[];          // Türkçe karşılıklar
  examples: { en: string; tr?: string; source: "tatoeba" | "wiktionary" }[]; // en fazla 3
  collocations: string[];// "deteriorate rapidly", "health deteriorated"
  synonyms: string[];
  family: string[];      // deterioration, deteriorating
};
```

## Tekrar sistemi (uygulamanın kalbi)

- `ts-fsrs` ile her kartın `due`, `stability`, `difficulty`, `state` alanları IndexedDB'de tutulur.
- Değerlendirme 4 buton: **Tekrar (1) / Zor (2) / İyi (3) / Kolay (4)**.
- **Günlük yeni kelime limiti:** varsayılan 10, ayarlardan değişir. Önce vadesi gelen tekrarlar, sonra yeniler gösterilir.
- **Yerleştirme (ilk açılış):** Seçilen seviyeden kelimeleri hızlıca "biliyorum / bilmiyorum" diye kaydırarak eleme ekranı. "Biliyorum" denenler çalışma havuzuna girmez (istenirse sonra açılır). Böylece B1 kullanıcı A1–A2'yi baştan çalışmak zorunda kalmaz.
- **Kart yüzü:** Ön yüzde kelime değil, **örnek cümle içinde boşluklu/vurgulu kelime** + CEFR rozeti. Arka yüzde tanım, Türkçe, IPA, collocation'lar, eş anlamlılar, kelime ailesi, diğer örnekler.
- İsteğe bağlı mod: "Türkçeden İngilizceye" (aktif hatırlama) kartları.
- Telaffuz: tarayıcının ücretsiz Web Speech API'si (`speechSynthesis`, en-US/en-GB seçilebilir).

## Ekranlar

1. **Ana sayfa:** Bugün vadesi gelen kart sayısı, yeni kart sayısı, seri (streak), seviye bazında ilerleme çubukları (A1…C1 kaçını öğrendin), "Çalışmaya başla" butonu.
2. **Çalışma:** Kart çevirme animasyonu, klavye kısayolları (Boşluk = çevir, 1–4 = değerlendir), telefonda kaydırma hareketleri, oturum sonu özeti.
3. **Kelime gezgini:** Arama, seviye/tür filtresi, durum filtresi (yeni / öğreniliyor / öğrenildi), kelime detay sayfası.
4. **Makaleden ekle:** Okuduğun cümleyi yapıştır, kelimeyi seç → listede varsa o kelimenin kartına bu cümle örnek olarak eklenir; yoksa kullanıcı kartı oluşturulur (tanımı Datamuse/dictionaryapi.dev'den canlı çekip önerir, kullanıcı düzenler).
5. **İstatistik:** Son 30 günlük çalışma ısı haritası, günlük tekrar sayısı, doğru oranı, önümüzdeki 7 günün yük tahmini.
6. **Ayarlar:** Günlük limit, kart yönü, aksan, tema (açık/koyu/sistem), JSON dışa/içe aktarma, CSV liste içe aktarma, tüm veriyi sıfırlama (onaylı).
7. **Kaynaklar:** Veri atıfları ve lisanslar.

## Tasarım

- Sade ama karakterli: geniş boşluklar, güçlü tipografi (ör. başlıklarda *Fraunces* veya *Instrument Serif*, metinde *Inter*), yumuşak gölgeli büyük kart.
- CEFR seviyelerine özel renk rozetleri (A1 yeşil → C1 mor gibi tutarlı bir skala).
- Koyu tema öncelikli olsun, açık tema da düzgün çalışsın.
- Mobil öncelikli tasarım; çalışma ekranında başparmak erişimi için butonlar altta.
- Animasyonlar hızlı ve kısa (kart çevirme ≤ 300 ms); asıl öncelik hız.

## Klasör yapısı

```
kelime/
├─ scripts/            # veri hazırlama (build-time), .cache/ gitignore
├─ data/raw/           # indirilen ham listeler (gitignore, script indirir)
├─ data/overrides/     # topluluk düzeltmeleri (tr.json vb.) — PR'a açık
├─ public/data/        # üretilmiş a1.json … c1.json (repoya girer)
├─ src/
│  ├─ db/              # Dexie şeması
│  ├─ srs/             # ts-fsrs sarmalayıcı, kuyruk mantığı
│  ├─ features/        # study, browse, add, stats, settings
│  └─ components/
├─ .github/workflows/ci.yml   # yalnızca kontrol; yayın Vercel'de
├─ vercel.json                # SPA yönlendirmesi, önbellek başlıkları
├─ PLAN.md · README.md · CONTRIBUTING.md · DATA_LICENSES.md · LICENSE
```

## Fazlar

**Faz 0 — İskelet ve yayın** ✅
- Vite + React + TS + Tailwind kurulumu, BrowserRouter, `base: '/'`.
- Vercel'e otomatik deploy (GitHub entegrasyonu), PR önizlemeleri. "Merhaba" sayfası canlıda görünsün.
- GitHub Actions ile CI; `main` dal koruması.
- ESLint + Prettier, basit README.
- _Not: İlk olarak GitHub Pages'e yayınlandı, ardından Vercel'e taşındı._

**Faz 1 — Veri hattı**
- `scripts/` altında: listeleri indir → birleştir/tekilleştir → zenginleştir (Wiktionary, Tatoeba, WordNet, Datamuse) → `overrides` uygula → `public/data/*.json` üret.
- `npm run build:data` komutu. Rapor çıktısı: kaç kelime, kaçında Türkçe/örnek/collocation eksik.

**Faz 2 — Tekrar sistemi ve çalışma ekranı**
- Dexie şeması, ts-fsrs entegrasyonu, günlük kuyruk, çalışma ekranı, klavye kısayolları.
- Yerleştirme (eleme) ekranı.
- Algoritma için birim testleri (Vitest).

**Faz 3 — Gezgin, detay ve ana sayfa**
- Kelime gezgini, detay sayfası, ana sayfa ilerleme göstergeleri, telaffuz.

**Faz 4 — Makaleden ekleme, istatistik, ayarlar**
- Makaleden ekle akışı, istatistik sayfası, JSON/CSV içe-dışa aktarma, PWA.

**Faz 5 — Açık kaynak cilası**
- CONTRIBUTING.md (veri düzeltme nasıl yapılır, PR akışı), issue/PR şablonları, "good first issue" etiketleri.
- Lighthouse: performans ve erişilebilirlik ≥ 90.

## Arkadaşlarla çalışma

- `main` korumalı; herkes branch açıp PR gönderir, Actions build + test geçmeden merge yok.
- Her PR'a Vercel bir önizleme adresi yorum olarak ekler; gözden geçiren değişikliği tarayıcıda deneyip onaylar.
- Katkının en kolay yolu `data/overrides/` dosyalarındaki Türkçe karşılık ve örnek düzeltmeleri; kod bilmeyen arkadaşlar da katkı verebilir.
- İlerleme verisi kişiye özel ve tarayıcıda olduğu için herkes aynı siteyi kendi ilerlemesiyle kullanır.

## Kapsam dışı (şimdilik)

- Hesap sistemi, sunucu tarafı senkronizasyon, ücretli API'ler.
- İleride istenirse: GitHub Gist ile ücretsiz senkronizasyon, arkadaşlar arası liderlik tablosu.

### İleride: sosyal özellikler (Faz 5 sonrası fikir, şimdilik kapsam dışı)

Vercel'e geçiş bunun önünü açıyor ama mevcut fazlar bitmeden başlanmayacak.

- **Online arkadaşlık:** arkadaş ekleme, birbirinin serisini (streak) ve haftalık ilerlemesini görme.
- **Challenge:** arkadaşlar arası haftalık kelime yarışı, aynı kelime setiyle düello.
- **Gerekecekler:** hesap/giriş (ör. GitHub ile giriş), sunucu tarafı küçük bir veritabanı ve API (Vercel Functions + ücretsiz katmanlı bir veritabanı). Bu, "backend yok" ve "hesap yok" kısıtlarını değiştirir; o zaman ayrı bir planla ele alınmalı.
- Tasarım ilkesi: sosyal özellikler **isteğe bağlı** kalmalı; hesap açmayan kullanıcı uygulamayı bugünkü gibi tamamen yerel kullanabilmeli.
