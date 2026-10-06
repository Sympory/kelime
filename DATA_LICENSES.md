# Veri lisansları

Uygulamanın **kodu** [MIT](LICENSE) lisanslıdır. **Kelime verisi** (`public/data/*.json`) aşağıdaki kaynaklardan derlenir ve her biri kendi lisansını taşır.

`public/data/` altındaki derlenmiş dosyalar, ShareAlike şartı taşıyan kaynaklar (Wiktionary, Octanove) nedeniyle bir bütün olarak **[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)** lisansıyla dağıtılır. İçerdikleri Tatoeba cümleleri ayrıca kendi lisanslarını (CC BY 2.0 FR) ve yazar atıflarını korur.

`data/overrides/` altındaki topluluk katkıları da aynı şekilde CC BY-SA 4.0 lisanslıdır. PR gönderen herkes katkısının bu lisansla yayınlanmasını kabul etmiş sayılır.

| Kaynak                                                                                                   | Ne için                                                                          | Lisans                                                                  |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [CEFR-J Wordlist 1.5](https://github.com/openlanguageprofiles/olp-en-cefrj)                              | A1–B2 kelime listesi ve seviyeleri                                               | Atıf şartıyla ücretsiz kullanım                                         |
| [Octanove Vocabulary Profile C1/C2 1.0](https://github.com/openlanguageprofiles/olp-en-cefrj)            | C1–C2 kelime listesi ve seviyeleri                                               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)         |
| [Wiktionary](https://en.wiktionary.org/) ([kaikki.org](https://kaikki.org/dictionary/English/) dökümü)   | İngilizce tanımlar, IPA, Türkçe karşılıklar, çekimli hâller, bazı örnek cümleler | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) ve GFDL |
| [Vikisözlük](https://tr.wiktionary.org/) ([kaikki.org](https://kaikki.org/trwiktionary/) dökümü)         | Ek Türkçe karşılıklar (İngilizce Vikisözlük'te bulunmayanlar için)               | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) ve GFDL |
| [Tatoeba](https://tatoeba.org/)                                                                          | İngilizce örnek cümleler ve Türkçe çevirileri                                    | [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/)         |
| [WordNet 3.1](https://wordnet.princeton.edu/) ([`wordnet-db`](https://www.npmjs.com/package/wordnet-db)) | Eş anlamlılar, kelime ailesi                                                     | WordNet lisansı (aşağıda)                                               |
| [Datamuse API](https://www.datamuse.com/api/)                                                            | Collocation'lar (sık birlikte kullanılan kelimeler)                              | Ücretsiz; atıf rica edilir                                              |

## Atıflar

### CEFR-J

> The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Retrieved from http://www.cefr-j.org/download.html

Telif hakkı Tokyo Yabancı Çalışmalar Üniversitesi (TUFS) Tono Laboratuvarı'na aittir. Veri seti, düzgün atıf yapılması şartıyla araştırma ve ticari amaçlarla ücretsiz kullanılabilir.

### Octanove

> Octanove Vocabulary Profile C1/C2 (ver 1.0), Octanove Labs — CC BY-SA 4.0

### Wiktionary

Tanımlar, telaffuzlar ve Türkçe karşılıklar İngilizce Vikisözlük ve Türkçe Vikisözlük katkıcılarının emeğidir. Veri [Wiktextract](https://github.com/tatuylonen/wiktextract) ile [kaikki.org](https://kaikki.org/) üzerinden alınmıştır.

> Tatu Ylonen: Wiktextract: Wiktionary as Machine-Readable Structured Data. Proceedings of the 13th Conference on Language Resources and Evaluation (LREC), pp. 1317–1325, Marseille, 2022.

### Tatoeba

Her örnek cümlenin JSON kaydında Tatoeba kimliği (`tatoebaId`, `trTatoebaId`) ve yazarının kullanıcı adı (`author`, `trAuthor`) bulunur; uygulama bu bilgiyi cümlenin yanında gösterir. Bir cümlenin kaynağı: `https://tatoeba.org/sentences/show/<id>`.

### Datamuse

Collocation verisi [Datamuse API](https://www.datamuse.com/api/) ile build sırasında bir kez çekilir. Datamuse kendi içinde Google Books Ngrams gibi kaynaklar kullanır. Not: Datamuse 1 Şubat 2027'den itibaren API anahtarı isteyecek; o tarihten sonra `npm run build:data` için anahtar desteği eklenmesi gerekir.

### WordNet

```
WordNet Release 3.0

This software and database is being provided to you, the LICENSEE, by
Princeton University under the following license.  By obtaining, using
and/or copying this software and database, you agree that you have
read, understood, and will comply with these terms and conditions.:

Permission to use, copy, modify and distribute this software and
database and its documentation for any purpose and without fee or
royalty is hereby granted, provided that you agree to comply with
the following copyright notice and statements, including the disclaimer,
and that the same appear on ALL copies of the software, database and
documentation, including modifications that you make for internal
use or for distribution.

WordNet 3.0 Copyright 2006 by Princeton University.  All rights reserved.

THIS SOFTWARE AND DATABASE IS PROVIDED "AS IS" AND PRINCETON
UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR
IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, PRINCETON
UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES OF MERCHANT-
ABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE
OF THE LICENSED SOFTWARE, DATABASE OR DOCUMENTATION WILL NOT
INFRINGE ANY THIRD PARTY PATENTS, COPYRIGHTS, TRADEMARKS OR
OTHER RIGHTS.

The name of Princeton University or Princeton may not be used in
advertising or publicity pertaining to distribution of the software
and/or database.  Title to copyright in this software, database and
any associated documentation shall at all times remain with
Princeton University and LICENSEE agrees to preserve same.
```

## Kullanıcının kendi listeleri

Uygulamaya CSV ile içe aktarılan listeler (ör. Oxford 3000/5000) yalnızca kullanıcının kendi tarayıcısında saklanır; bu repoya girmez ve buradan dağıtılmaz.
