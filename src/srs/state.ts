/**
 * Kart durumları — ts-fsrs'in `State` değerleriyle aynı (state.test.ts doğrular).
 * Ana sayfa ve ayarlar gibi ilk yüklenen ekranlar zamanlayıcı kütüphanesini indirmesin diye
 * bu sabitler kütüphaneden bağımsız tutulur; ts-fsrs yalnızca çalışma ekranında yüklenir.
 */
export const State = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
} as const
