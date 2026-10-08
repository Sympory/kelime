import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CefrBadge } from '../../components/CefrBadge'
import { Loading } from '../../components/Loading'
import { BackupError, downloadJson, exportBackup, importBackup, resetAll } from '../../db/backup'
import { db, type Settings } from '../../db/db'
import { useSettings } from '../../db/hooks'
import { saveSettings } from '../../db/repo'
import { speak, speechSupported } from '../../lib/speech'
import { dayKey } from '../../srs/day'
import { importWordList, parseWordList, type ImportSummary } from './wordList'

export default function SettingsPage() {
  const settings = useSettings()
  if (!settings) return <Loading />
  return <SettingsForm settings={settings} />
}

function SettingsForm({ settings }: { settings: Settings }) {
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string }>()
  const set = (patch: Partial<Settings>) => void saveSettings(db, patch)

  async function onExport() {
    const backup = await exportBackup(db)
    downloadJson(backup, `kelime-yedek-${dayKey(new Date())}.json`)
    setMessage({ ok: true, text: `Yedek indirildi (${backup.cards.length} kart).` })
  }

  async function onImport(file: File) {
    if (!confirm('Yedek geri yüklensin mi? Bu tarayıcıdaki mevcut ilerlemenin yerine geçer.'))
      return
    try {
      const { cards, reviews } = await importBackup(db, JSON.parse(await file.text()))
      setMessage({ ok: true, text: `Geri yüklendi: ${cards} kart, ${reviews} tekrar kaydı.` })
    } catch (e) {
      setMessage({
        ok: false,
        text: e instanceof BackupError ? e.message : 'Dosya okunamadı (geçerli bir JSON değil).',
      })
    }
  }

  async function onReset() {
    if (!confirm('Tüm ilerleme, tekrar geçmişi ve ayarlar silinecek. Emin misin?')) return
    if (!confirm('Bu işlem geri alınamaz. Önce yedek almak istersen "Vazgeç"e bas.')) return
    await resetAll(db)
    navigate('/baslangic')
  }

  return (
    <section className="py-6">
      <h1 className="font-display text-3xl font-bold">Ayarlar</h1>

      <Group title="Çalışma">
        <Row
          label="Günlük yeni kelime"
          hint="Önce vadesi gelen tekrarlar, sonra bu kadar yeni kelime"
        >
          <div className="flex items-center gap-2">
            <Stepper
              value={settings.dailyNewLimit}
              onChange={(v) => set({ dailyNewLimit: v })}
              min={0}
              max={50}
              step={5}
            />
          </div>
        </Row>
        <Row label="Kart yönü">
          <Segmented
            value={settings.direction}
            onChange={(v) => set({ direction: v })}
            options={[
              { value: 'en-tr', label: 'İngilizce → Türkçe' },
              { value: 'tr-en', label: 'Türkçe → İngilizce' },
            ]}
          />
        </Row>
        <Row label="Seviyeler">
          <Link to="/baslangic" className="flex items-center gap-1">
            {settings.levels.map((l) => (
              <CefrBadge key={l} level={l} />
            ))}
            <span className="ml-2 text-sm underline underline-offset-4">Değiştir</span>
          </Link>
        </Row>
      </Group>

      <Group title="Telaffuz">
        <Row label="Aksan">
          <div className="flex items-center gap-2">
            <Segmented
              value={settings.accent}
              onChange={(v) => set({ accent: v })}
              options={[
                { value: 'en-US', label: 'Amerikan' },
                { value: 'en-GB', label: 'İngiliz' },
              ]}
            />
            {speechSupported && (
              <button
                onClick={() => speak('The weather is lovely today.', settings.accent)}
                className="rounded-lg px-2 py-1 text-sm underline underline-offset-4"
              >
                Dinle
              </button>
            )}
          </div>
        </Row>
        {!speechSupported && (
          <p className="text-sm text-zinc-500">Bu tarayıcı sesli okumayı desteklemiyor.</p>
        )}
      </Group>

      <Group title="Görünüm">
        <Row label="Tema">
          <Segmented
            value={settings.theme}
            onChange={(v) => set({ theme: v })}
            options={[
              { value: 'system', label: 'Sistem' },
              { value: 'light', label: 'Açık' },
              { value: 'dark', label: 'Koyu' },
            ]}
          />
        </Row>
      </Group>

      <Group title="Veri">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          İlerlemen yalnızca bu tarayıcıda saklanır. Başka bir cihaza taşımak için yedeği indirip
          orada geri yükle.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onExport}>Yedeği indir (JSON)</Button>
          <Button onClick={() => fileInput.current?.click()}>Yedekten geri yükle</Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void onImport(f)
            }}
          />
        </div>
        {message && (
          <p
            role="status"
            className={`text-sm ${message.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
          >
            {message.text}
          </p>
        )}
        <WordListImport />
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button
            onClick={onReset}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
          >
            Tüm veriyi sıfırla
          </button>
        </div>
      </Group>
    </section>
  )
}

/** Kendi kelime listesini (ör. Oxford 5000) CSV olarak içe aktarma; liste repoya değil tarayıcıya girer. */
function WordListImport() {
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<
    | { phase: 'idle' }
    | { phase: 'running'; done: number; total: number }
    | { phase: 'done'; summary: ImportSummary }
    | { phase: 'error'; text: string }
  >({ phase: 'idle' })

  async function run(file: File) {
    const rows = parseWordList(await file.text())
    if (rows.length === 0) {
      setState({ phase: 'error', text: 'Dosyada kelime bulunamadı. İlk satır başlık olmalı.' })
      return
    }
    setState({ phase: 'running', done: 0, total: rows.length })
    try {
      const summary = await importWordList(rows, (done) =>
        setState({ phase: 'running', done, total: rows.length }),
      )
      setState({ phase: 'done', summary })
    } catch {
      setState({ phase: 'error', text: 'İçe aktarma sırasında bir hata oldu.' })
    }
  }

  return (
    <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <p className="font-medium">Kendi kelime listen</p>
      <p className="text-xs text-zinc-500">
        CSV dosyası: ilk satır başlık (ör. <code>word,pos,level,tr</code> ya da{' '}
        <code>kelime;türkçe</code>). Listedeki kelimeler çalışma sırasının başına alınır; hazır
        veride olmayanlar kendi kelimen olarak eklenir. Liste yalnızca bu tarayıcıda kalır.
      </p>
      <Button onClick={() => input.current?.click()}>Kelime listesi içe aktar (CSV)</Button>
      <input
        ref={input}
        type="file"
        accept=".csv,.tsv,.txt,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void run(f)
        }}
      />
      {state.phase === 'running' && (
        <p role="status" className="text-sm text-zinc-500 tabular-nums">
          İçe aktarılıyor… {state.done} / {state.total}
        </p>
      )}
      {state.phase === 'done' && (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          {state.summary.matched} kelime eşleşti ({state.summary.queued} tanesi sıraya alındı),{' '}
          {state.summary.created} yeni kelime eklendi
          {state.summary.skipped > 0 && `, ${state.summary.skipped} satır atlandı`}.
        </p>
      )}
      {state.phase === 'error' && (
        <p role="status" className="text-sm text-rose-600 dark:text-rose-400">
          {state.text}
        </p>
      )}
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{title}</h2>
      <div className="surface mt-3 space-y-4 p-5">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{label}</p>
        {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div role="radiogroup" className="inline-flex rounded-xl bg-zinc-900/5 p-1 dark:bg-white/10">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            value === o.value
              ? 'bg-white shadow-sm dark:bg-zinc-950'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Stepper({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  return (
    <div className="inline-flex items-center rounded-xl bg-zinc-900/5 p-1 dark:bg-white/10">
      <button
        aria-label="Azalt"
        onClick={() => onChange(clamp(value - step))}
        className="size-8 rounded-lg text-lg hover:bg-white dark:hover:bg-zinc-950"
      >
        −
      </button>
      <span className="w-10 text-center font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        aria-label="Artır"
        onClick={() => onChange(clamp(value + step))}
        className="size-8 rounded-lg text-lg hover:bg-white dark:hover:bg-zinc-950"
      >
        +
      </button>
    </div>
  )
}

function Button({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="btn-ghost bg-zinc-900/5 px-4 py-2 text-sm dark:bg-white/10"
    >
      {children}
    </button>
  )
}
