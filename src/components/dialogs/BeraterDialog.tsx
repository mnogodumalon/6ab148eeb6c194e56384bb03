/**
 * BeraterDialog — pre-generated create/edit dialog for Berater.
 *
 * Props: open, onClose, onSubmit(fields) => Promise<void>, defaultValues?,
 * recordId? (pass when EDITING — enables the attachments section),
 * leistungskatalogList (full hook array — resolves the Leistungskatalog applookup),
 * projekteList (full hook array — resolves the Projekte applookup),
 * enablePhotoScan?, enablePhotoLocation?.
 *
 * defaultValues is SHAPE-TOLERANT and its prop type is the EXPORTED
 * BeraterDialogDefaults — NOT the entity field type: lookup fields accept
 * the bare KEY string (or LookupValue), applookup fields the bare record id
 * (or record URL); the dialog normalizes. Type prefill STATE with the export:
 *  ❌ useState<Partial<Berater['fields']>>({ … })   // LookupValue fields reject string prefills (TS2322)
 *  ✓ useState<BeraterDialogDefaults | undefined>(undefined)
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Berater, Leistungskatalog, Projekte, LookupValue } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, extractRecordIds, getUserProfile, LivingAppsService } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComputedContext } from '@/config/form-enhancements/types';
import { applyFieldOrder, flattenFieldOrder, applyDefaults, evalComputed, numberInputProps, clampNumberValue, classifyComputed, extractApplookupRefs, mergeApplookupRefs, resolveApplookupRef } from '@/config/form-enhancements/types';
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/Berater';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { requiredMessage } from '@/lib/journey/messages';
import { t, appLabel, fieldLabel, lookupLabel, localeTag, CURRENCY } from '@/i18n';
import { Textarea } from '@/components/ui/textarea';
import { Combobox, MultiCombobox } from '@/components/Combobox';
import { LeistungskatalogDialog } from '@/components/dialogs/LeistungskatalogDialog';
import { ProjekteDialog } from '@/components/dialogs/ProjekteDialog';
import { DatePicker } from '@/components/DatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { IconAlertCircle, IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

/** Widened prefill type for BeraterDialog.defaultValues — see file header. */
export type BeraterDialogDefaults = Omit<Berater['fields'], 'status'> & {
    status?: LookupValue | string;
  };

interface BeraterDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Berater['fields']) => Promise<void>;
  /** SHAPE-TOLERANT: lookup fields accept the bare key (string) or the
   *  LookupValue object; applookup fields the bare record id or the full
   *  record URL — the dialog normalizes both. */
  defaultValues?: BeraterDialogDefaults;
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  leistungskatalogList: Leistungskatalog[];
  projekteList: Projekte[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

// defaultValues are SHAPE-TOLERANT: the dialog resolves bare lookup keys via
// its own options and bare record ids via the field's target app — consumers
// never carry the LookupValue/record-URL shape in their head.
const NORMALIZE_LOOKUPS: Record<string, readonly { key: string; label: string }[]> = {
  status: LOOKUP_OPTIONS['berater']?.['status'] ?? [],
};
const NORMALIZE_APPLOOKUPS: Record<string, string> = {
  leistungen: APP_IDS.LEISTUNGSKATALOG,
  zugewiesene_projekte: APP_IDS.PROJEKTE,
};
function normalizeDefaults(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const [k, opts] of Object.entries(NORMALIZE_LOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string') out[k] = opts.find(o => o.key === v) ?? { key: v, label: v };
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' ? opts.find(o => o.key === x) ?? { key: x, label: x } : x));
  }
  for (const [k, appId] of Object.entries(NORMALIZE_APPLOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string' && v !== '' && !v.startsWith('http')) out[k] = createRecordUrl(appId, v);
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' && x !== '' && !x.startsWith('http') ? createRecordUrl(appId, x) : x));
  }
  return out;
}

export function BeraterDialog({ open, onClose, onSubmit, defaultValues, recordId, leistungskatalogList, projekteList, enablePhotoScan = true, enablePhotoLocation = true }: BeraterDialogProps) {
  const [fields, setFields] = useState<Partial<Berater['fields']>>({});
  const [saving, setSaving] = useState(false);
  const normalizedDefaults = useMemo<Record<string, unknown> | undefined>(
    () => (defaultValues ? normalizeDefaults(defaultValues as Record<string, unknown>) : undefined),
    [defaultValues],
  );
  // Dirty-tracking: in edit-mode the Speichern button is disabled until the
  // user actually changes something. JSON.stringify is good enough for our
  // fields (plain values + LookupValue objects + string arrays).
  const isDirty = useMemo(() => {
    if (!normalizedDefaults) return true;  // create-mode: always allow submit
    try {
      return JSON.stringify(fields) !== JSON.stringify(normalizedDefaults);
    } catch {
      return true;
    }
  }, [fields, normalizedDefaults]);
  // Inline-Create state for "Leistungskatalog" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraLeistungskatalog` list, and select it in
  // the originating Combobox via the captured `createLeistungskatalogField`.
  const [createLeistungskatalogOpen, setCreateLeistungskatalogOpen] = useState(false);
  const [createLeistungskatalogInitial, setCreateLeistungskatalogInitial] = useState('');
  const [createLeistungskatalogField, setCreateLeistungskatalogField] = useState<string>('');
  const [extraLeistungskatalog, setExtraLeistungskatalog] = useState< Leistungskatalog[]>([]);
  const leistungskatalogListAll = useMemo(
    () => [...leistungskatalogList, ...extraLeistungskatalog],
    [leistungskatalogList, extraLeistungskatalog],
  );
  function openCreateLeistungskatalog(fieldKey: string, q: string) {
    setCreateLeistungskatalogField(fieldKey);
    setCreateLeistungskatalogInitial(q);
    setCreateLeistungskatalogOpen(true);
  }
  // Inline-Create state for "Projekte" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraProjekte` list, and select it in
  // the originating Combobox via the captured `createProjekteField`.
  const [createProjekteOpen, setCreateProjekteOpen] = useState(false);
  const [createProjekteInitial, setCreateProjekteInitial] = useState('');
  const [createProjekteField, setCreateProjekteField] = useState<string>('');
  const [extraProjekte, setExtraProjekte] = useState< Projekte[]>([]);
  const projekteListAll = useMemo(
    () => [...projekteList, ...extraProjekte],
    [projekteList, extraProjekte],
  );
  function openCreateProjekte(fieldKey: string, q: string) {
    setCreateProjekteField(fieldKey);
    setCreateProjekteInitial(q);
    setCreateProjekteOpen(true);
  }
  // Fields the plan assigns to a tool (empty without a plan).
  const SYSTEM_ASSIGNED: string[] = [];
  const [showErrors, setShowErrors] = useState(false);
  const REQUIRED_FIELDS = ['vorname', 'nachname', 'email_beruflich', 'status'] as const;
  const missingRequired = REQUIRED_FIELDS.filter(k => {
    const v = (fields as Record<string, unknown>)[k];
    return v == null || v === '' || (Array.isArray(v) && v.length === 0);
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  // Computed-field plumbing. Pure no-op when formEnhancements.computed is {}.
  // The number renderer uses computedValues only as a fallback when the user
  // hasn't typed anything — clearing the input always restores the computation.
  // computedContext exposes applookup list props so { kind: 'applookup', ... }
  // operands can resolve to numeric fields on the target record.
  const computedContext = useMemo<ComputedContext>(() => ({
    lookupLists: {
      'leistungen': leistungskatalogList,
      'zugewiesene_projekte': projekteList,
    },
  }), [leistungskatalogList, projekteList, ]);
  const computedValues = useMemo<Record<string, number | null>>(() => {
    let out: Record<string, number | null> = {};
    const entries = Object.entries(formEnhancements.computed);
    for (let i = 0; i < 5; i++) {
      const merged: Record<string, unknown> = { ...(fields as Record<string, unknown>) };
      for (const [k, v] of Object.entries(out)) {
        if (v === null) continue;
        const cur = merged[k];
        if (cur === undefined || cur === null || cur === '') merged[k] = v;
      }
      const next: Record<string, number | null> = {};
      let changed = false;
      for (const [key, spec] of entries) {
        const v = evalComputed(spec, merged, computedContext);
        next[key] = v;
        if (v !== out[key]) changed = true;
      }
      out = next;
      if (!changed) break;
    }
    return out;
  }, [fields, computedContext]);

  useEffect(() => {
    if (open) {
      setFields(applyDefaults(normalizedDefaults ?? {}, formEnhancements.defaults) as Partial<Berater['fields']>);
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
      setSubmitError(null);
    }
  }, [open, normalizedDefaults]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  // Submit errors surface IN the dialog (it is modal — a banner in the page
  // body would be hidden behind it). A consumer onSubmit that THROWS (the
  // documented "throw to prevent closing" validation pattern) lands here:
  // the dialog stays open, nothing is saved, the message is visible.
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (missingRequired.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      // Fill empty number slots from computed values; user-typed values always win.
      // CRITICAL: only backend-mapped keys may be backfilled. Virtual computeds
      // (sub-agent invents `_netto`, `_bestellung_gesamtbetrag` etc. for the
      // "Berechnungen" display) have no backend counterpart — writing them
      // triggers a 422 from the Living-Apps API ("field does not exist").
      const merged = { ...fields };
      for (const [key, val] of Object.entries(computedValues)) {
        if (val === null) continue;
        if (!backendFieldSet.has(key)) continue;
        const cur = (merged as Record<string, unknown>)[key];
        if (cur === undefined || cur === null || cur === '') {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      const clean = cleanFieldsForApi(merged, 'berater');
      await onSubmit(clean as Berater['fields']);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : t('submit_error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="leistungen" entity="Leistungskatalog">\n${JSON.stringify(leistungskatalogList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="zugewiesene_projekte" entity="Projekte">\n${JSON.stringify(projekteList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "vorname": string | null, // Vorname\n  "nachname": string | null, // Nachname\n  "titel": string | null, // Titel (optional)\n  "strasse": string | null, // Straße\n  "hausnummer": string | null, // Hausnummer\n  "plz": string | null, // Postleitzahl\n  "ort": string | null, // Ort\n  "email_beruflich": string | null, // E-Mail (beruflich)\n  "email_privat": string | null, // E-Mail (privat)\n  "einstiegsdatum": string | null, // YYYY-MM-DD\n  "status": LookupValue | null, // Status (select one key: "aktiv" | "urlaub" | "elternzeit" | "sonstiges") mapping: aktiv=Aktiv, urlaub=Urlaub, elternzeit=Elternzeit, sonstiges=Sonstiges\n  "stundensatz": number | null, // Stundensatz (€/h)\n  "stunden_aktueller_monat": number | null, // Gebuchte Stunden – aktueller Monat\n  "stunden_aktuelles_quartal": number | null, // Gebuchte Stunden – aktuelles Quartal\n  "stunden_aktuelles_jahr": number | null, // Gebuchte Stunden – aktuelles Jahr\n  "stunden_letzter_monat": number | null, // Gebuchte Stunden – letzter Monat\n  "stunden_letztes_quartal": number | null, // Gebuchte Stunden – letztes Quartal\n  "stunden_letztes_jahr": number | null, // Gebuchte Stunden – letztes Jahr\n  "sonstiges": string | null, // Sonstige Anmerkungen\n  "leistungen": string[] | null, // Display names from Leistungskatalog, one per referenced record (see <available-records>)\n  "zugewiesene_projekte": string[] | null, // Display names from Projekte, one per referenced record (see <available-records>)\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["leistungen", "zugewiesene_projekte"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const leistungenNames = raw['leistungen'];
        if (Array.isArray(leistungenNames) && leistungenNames.length > 0) {
          const leistungenUrls = (leistungenNames as unknown[])
            .map(n => leistungskatalogList.find(r => matchName(String(n), [String(r.fields.leistungsname ?? '')])))
            .filter((r): r is NonNullable<typeof r> => Boolean(r))
            .map(r => createRecordUrl(APP_IDS.LEISTUNGSKATALOG, r.record_id));
          if (leistungenUrls.length > 0) merged['leistungen'] = leistungenUrls;
        }
        const zugewiesene_projekteNames = raw['zugewiesene_projekte'];
        if (Array.isArray(zugewiesene_projekteNames) && zugewiesene_projekteNames.length > 0) {
          const zugewiesene_projekteUrls = (zugewiesene_projekteNames as unknown[])
            .map(n => projekteList.find(r => matchName(String(n), [String(r.fields.projektkennung ?? '')])))
            .filter((r): r is NonNullable<typeof r> => Boolean(r))
            .map(r => createRecordUrl(APP_IDS.PROJEKTE, r.record_id));
          if (zugewiesene_projekteUrls.length > 0) merged['zugewiesene_projekte'] = zugewiesene_projekteUrls;
        }
        return merged as Partial<Berater['fields']>;
      });
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error(`${t('scan_error')}:`, err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues
    ? t('edit_entity', { entity: appLabel('berater') })
    : t('new_entity', { entity: appLabel('berater') });

  const fieldBlocks: Record<string, React.ReactNode> = {
    'vorname': (
      <div key="vorname" className="space-y-1.5">
        <Label htmlFor="vorname">{fieldLabel('berater', 'vorname')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="vorname"
          placeholder="z. B. Anna"
          value={fields.vorname ?? ''}
          onChange={e => setFields(f => ({ ...f, vorname: e.target.value }))}
          required
        />
        {showErrors && !fields.vorname && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('berater', 'vorname')}</p>
        )}
      </div>
    ),
    'nachname': (
      <div key="nachname" className="space-y-1.5">
        <Label htmlFor="nachname">{fieldLabel('berater', 'nachname')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="nachname"
          placeholder="z. B. Schmidt"
          value={fields.nachname ?? ''}
          onChange={e => setFields(f => ({ ...f, nachname: e.target.value }))}
          required
        />
        {showErrors && !fields.nachname && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('berater', 'nachname')}</p>
        )}
      </div>
    ),
    'titel': (
      <div key="titel" className="space-y-1.5">
        <Label htmlFor="titel">{fieldLabel('berater', 'titel')}</Label>
        <Input
          id="titel"
          placeholder="z. B. Dr., Dipl.-Ing."
          value={fields.titel ?? ''}
          onChange={e => setFields(f => ({ ...f, titel: e.target.value }))}
        />
      </div>
    ),
    'strasse': (
      <div key="strasse" className="space-y-1.5">
        <Label htmlFor="strasse">{fieldLabel('berater', 'strasse')}</Label>
        <Input
          id="strasse"
          placeholder="z. B. Werkstraße"
          value={fields.strasse ?? ''}
          onChange={e => setFields(f => ({ ...f, strasse: e.target.value }))}
        />
      </div>
    ),
    'hausnummer': (
      <div key="hausnummer" className="space-y-1.5">
        <Label htmlFor="hausnummer">{fieldLabel('berater', 'hausnummer')}</Label>
        <Input
          id="hausnummer"
          placeholder="z. B. 7"
          value={fields.hausnummer ?? ''}
          onChange={e => setFields(f => ({ ...f, hausnummer: e.target.value }))}
        />
      </div>
    ),
    'plz': (
      <div key="plz" className="space-y-1.5">
        <Label htmlFor="plz">{fieldLabel('berater', 'plz')}</Label>
        <Input
          id="plz"
          placeholder="z. B. 80333"
          value={fields.plz ?? ''}
          onChange={e => setFields(f => ({ ...f, plz: e.target.value }))}
        />
      </div>
    ),
    'ort': (
      <div key="ort" className="space-y-1.5">
        <Label htmlFor="ort">{fieldLabel('berater', 'ort')}</Label>
        <Input
          id="ort"
          placeholder="z. B. München"
          value={fields.ort ?? ''}
          onChange={e => setFields(f => ({ ...f, ort: e.target.value }))}
        />
      </div>
    ),
    'email_beruflich': (
      <div key="email_beruflich" className="space-y-1.5">
        <Label htmlFor="email_beruflich">{fieldLabel('berater', 'email_beruflich')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="email_beruflich"
          type="email"
          inputMode="email"
          placeholder="anna.schmidt@inclou.de"
          value={fields.email_beruflich ?? ''}
          onChange={e => setFields(f => ({ ...f, email_beruflich: e.target.value }))}
          required
        />
        {showErrors && !fields.email_beruflich && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('berater', 'email_beruflich')}</p>
        )}
      </div>
    ),
    'email_privat': (
      <div key="email_privat" className="space-y-1.5">
        <Label htmlFor="email_privat">{fieldLabel('berater', 'email_privat')}</Label>
        <Input
          id="email_privat"
          type="email"
          inputMode="email"
          placeholder="anna.schmidt@private.de"
          value={fields.email_privat ?? ''}
          onChange={e => setFields(f => ({ ...f, email_privat: e.target.value }))}
        />
      </div>
    ),
    'einstiegsdatum': (
      <div key="einstiegsdatum" className="space-y-1.5">
        <Label htmlFor="einstiegsdatum">{fieldLabel('berater', 'einstiegsdatum')}</Label>
        <DatePicker
          id="einstiegsdatum"
          placeholder="Wann trat der Berater ein?"
          mode="date"
          value={fields.einstiegsdatum ?? null}
          onChange={v => setFields(f => ({ ...f, einstiegsdatum: v ?? undefined }))}
        />
      </div>
    ),
    'status': (
      <div key="status" className="space-y-1.5">
        <Label htmlFor="status">{fieldLabel('berater', 'status')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.status) === 'aktiv'}
            onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'aktiv' ? undefined : 'aktiv') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.status) === 'aktiv'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('berater', 'status', 'aktiv') ?? 'Aktiv'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.status) === 'urlaub'}
            onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'urlaub' ? undefined : 'urlaub') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.status) === 'urlaub'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('berater', 'status', 'urlaub') ?? 'Urlaub'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.status) === 'elternzeit'}
            onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'elternzeit' ? undefined : 'elternzeit') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.status) === 'elternzeit'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('berater', 'status', 'elternzeit') ?? 'Elternzeit'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.status) === 'sonstiges'}
            onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'sonstiges' ? undefined : 'sonstiges') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.status) === 'sonstiges'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('berater', 'status', 'sonstiges') ?? 'Sonstiges'}
          </button>
        </div>
        {showErrors && !fields.status && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('berater', 'status')}</p>
        )}
      </div>
    ),
    'stundensatz': (
      <div key="stundensatz" className="space-y-1.5">
        <Label htmlFor="stundensatz">{fieldLabel('berater', 'stundensatz')}</Label>
        <Input
          id="stundensatz"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'stundensatz')}
          placeholder="z. B. 75"
          value={fields.stundensatz !== undefined ? fields.stundensatz : (computedValues['stundensatz'] ?? '')}
          onChange={e => setFields(f => ({ ...f, stundensatz: clampNumberValue(formEnhancements, 'stundensatz', e.target.value) }))}
        />
      </div>
    ),
    'stunden_aktueller_monat': (
      <div key="stunden_aktueller_monat" className="space-y-1.5">
        <Label htmlFor="stunden_aktueller_monat">{fieldLabel('berater', 'stunden_aktueller_monat')}</Label>
        <Input
          id="stunden_aktueller_monat"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'stunden_aktueller_monat')}
          placeholder="Gebuchte Stunden – dies ist Read-only"
          value={fields.stunden_aktueller_monat !== undefined ? fields.stunden_aktueller_monat : (computedValues['stunden_aktueller_monat'] ?? '')}
          onChange={e => setFields(f => ({ ...f, stunden_aktueller_monat: clampNumberValue(formEnhancements, 'stunden_aktueller_monat', e.target.value) }))}
        />
      </div>
    ),
    'stunden_aktuelles_quartal': (
      <div key="stunden_aktuelles_quartal" className="space-y-1.5">
        <Label htmlFor="stunden_aktuelles_quartal">{fieldLabel('berater', 'stunden_aktuelles_quartal')}</Label>
        <Input
          id="stunden_aktuelles_quartal"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'stunden_aktuelles_quartal')}
          placeholder="Gebuchte Stunden – dies ist Read-only"
          value={fields.stunden_aktuelles_quartal !== undefined ? fields.stunden_aktuelles_quartal : (computedValues['stunden_aktuelles_quartal'] ?? '')}
          onChange={e => setFields(f => ({ ...f, stunden_aktuelles_quartal: clampNumberValue(formEnhancements, 'stunden_aktuelles_quartal', e.target.value) }))}
        />
      </div>
    ),
    'stunden_aktuelles_jahr': (
      <div key="stunden_aktuelles_jahr" className="space-y-1.5">
        <Label htmlFor="stunden_aktuelles_jahr">{fieldLabel('berater', 'stunden_aktuelles_jahr')}</Label>
        <Input
          id="stunden_aktuelles_jahr"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'stunden_aktuelles_jahr')}
          placeholder="Gebuchte Stunden – dies ist Read-only"
          value={fields.stunden_aktuelles_jahr !== undefined ? fields.stunden_aktuelles_jahr : (computedValues['stunden_aktuelles_jahr'] ?? '')}
          onChange={e => setFields(f => ({ ...f, stunden_aktuelles_jahr: clampNumberValue(formEnhancements, 'stunden_aktuelles_jahr', e.target.value) }))}
        />
      </div>
    ),
    'stunden_letzter_monat': (
      <div key="stunden_letzter_monat" className="space-y-1.5">
        <Label htmlFor="stunden_letzter_monat">{fieldLabel('berater', 'stunden_letzter_monat')}</Label>
        <Input
          id="stunden_letzter_monat"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'stunden_letzter_monat')}
          placeholder="Gebuchte Stunden – dies ist Read-only"
          value={fields.stunden_letzter_monat !== undefined ? fields.stunden_letzter_monat : (computedValues['stunden_letzter_monat'] ?? '')}
          onChange={e => setFields(f => ({ ...f, stunden_letzter_monat: clampNumberValue(formEnhancements, 'stunden_letzter_monat', e.target.value) }))}
        />
      </div>
    ),
    'stunden_letztes_quartal': (
      <div key="stunden_letztes_quartal" className="space-y-1.5">
        <Label htmlFor="stunden_letztes_quartal">{fieldLabel('berater', 'stunden_letztes_quartal')}</Label>
        <Input
          id="stunden_letztes_quartal"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'stunden_letztes_quartal')}
          placeholder="Gebuchte Stunden – dies ist Read-only"
          value={fields.stunden_letztes_quartal !== undefined ? fields.stunden_letztes_quartal : (computedValues['stunden_letztes_quartal'] ?? '')}
          onChange={e => setFields(f => ({ ...f, stunden_letztes_quartal: clampNumberValue(formEnhancements, 'stunden_letztes_quartal', e.target.value) }))}
        />
      </div>
    ),
    'stunden_letztes_jahr': (
      <div key="stunden_letztes_jahr" className="space-y-1.5">
        <Label htmlFor="stunden_letztes_jahr">{fieldLabel('berater', 'stunden_letztes_jahr')}</Label>
        <Input
          id="stunden_letztes_jahr"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'stunden_letztes_jahr')}
          placeholder="Gebuchte Stunden – dies ist Read-only"
          value={fields.stunden_letztes_jahr !== undefined ? fields.stunden_letztes_jahr : (computedValues['stunden_letztes_jahr'] ?? '')}
          onChange={e => setFields(f => ({ ...f, stunden_letztes_jahr: clampNumberValue(formEnhancements, 'stunden_letztes_jahr', e.target.value) }))}
        />
      </div>
    ),
    'sonstiges': (
      <div key="sonstiges" className="space-y-1.5">
        <Label htmlFor="sonstiges">{fieldLabel('berater', 'sonstiges')}</Label>
        <Textarea
          id="sonstiges"
          placeholder="Besonderheiten, Zertifikate, Sprachen..."
          value={fields.sonstiges ?? ''}
          onChange={e => setFields(f => ({ ...f, sonstiges: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    'leistungen': (
      <div key="leistungen" className="space-y-1.5">
        <Label htmlFor="leistungen">{fieldLabel('berater', 'leistungen')}</Label>
        <MultiCombobox
          id="leistungen"
          placeholder="Welche Leistungen kann dieser Berater anbieten?"
          items={leistungskatalogListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.leistungsname ?? r.record_id),
          }))}
          values={extractRecordIds(fields.leistungen)}
          onChange={ids => setFields(f => ({ ...f, leistungen: ids.length ? ids.map(id => createRecordUrl(APP_IDS.LEISTUNGSKATALOG, id)) as any : undefined }))}
          onCreateNew={(q) => openCreateLeistungskatalog("leistungen", q)}
          createLabel={t('create_in', { entity: appLabel('leistungskatalog') })}
        />
      </div>
    ),
    'zugewiesene_projekte': (
      <div key="zugewiesene_projekte" className="space-y-1.5">
        <Label htmlFor="zugewiesene_projekte">{fieldLabel('berater', 'zugewiesene_projekte')}</Label>
        <MultiCombobox
          id="zugewiesene_projekte"
          placeholder="Derzeit laufende Projekte zuweisen"
          items={projekteListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.projektkennung ?? r.record_id),
          }))}
          values={extractRecordIds(fields.zugewiesene_projekte)}
          onChange={ids => setFields(f => ({ ...f, zugewiesene_projekte: ids.length ? ids.map(id => createRecordUrl(APP_IDS.PROJEKTE, id)) as any : undefined }))}
          onCreateNew={(q) => openCreateProjekte("zugewiesene_projekte", q)}
          createLabel={t('create_in', { entity: appLabel('projekte') })}
        />
      </div>
    ),
  };
  const orderedFields = applyFieldOrder(Object.keys(fieldBlocks), formEnhancements.fieldOrder);
  const orderedFieldsKey = orderedFields.map((it) => typeof it === 'string' ? it : it.row.join('+')).join(',');

  // Render-Modell für Computed-Felder:
  //
  //   • BACKEND-FELDER mit computed-Eintrag (z.B. gesamtpreis bei einer
  //     Katzenpension) bleiben als normales Eingabe-Feld stehen. Der Number-
  //     Input nutzt den computed-Wert als Vorschlag, der User kann jederzeit
  //     überschreiben (clearing → restore computed).
  //   • VIRTUELLE computed-Keys (Eintrag in formEnhancements.computed, ABER
  //     kein passendes Backend-Feld in orderedFields) erscheinen NICHT als
  //     Input, sondern unten als kompakte 'Berechnungen'-Übersicht oder als
  //     Inline-Hint unter dem letzten beitragenden Input.
  const FIELD_LABELS: Record<string, string> = {"vorname": "Vorname", "nachname": "Nachname", "titel": "Titel (optional)", "strasse": "Straße", "hausnummer": "Hausnummer", "plz": "Postleitzahl", "ort": "Ort", "email_beruflich": "E-Mail (beruflich)", "email_privat": "E-Mail (privat)", "einstiegsdatum": "Einstiegsdatum", "status": "Status", "stundensatz": "Stundensatz (€/h)", "stunden_aktueller_monat": "Gebuchte Stunden – aktueller Monat", "stunden_aktuelles_quartal": "Gebuchte Stunden – aktuelles Quartal", "stunden_aktuelles_jahr": "Gebuchte Stunden – aktuelles Jahr", "stunden_letzter_monat": "Gebuchte Stunden – letzter Monat", "stunden_letztes_quartal": "Gebuchte Stunden – letztes Quartal", "stunden_letztes_jahr": "Gebuchte Stunden – letztes Jahr", "sonstiges": "Sonstige Anmerkungen", "leistungen": "Zugeordnete Leistungen", "zugewiesene_projekte": "Aktuell zugewiesene Projekte"};
  const CURRENCY_KEYS = new Set<string>(["stundensatz"]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"leistungen": {"leistungsname": "Leistungsname", "leistungstyp": "Leistungstyp", "beschreibung": "Beschreibung", "kostenvoranschlag": "Normaler Kostenvoranschlag (€)", "einheit": "Abrechnungseinheit", "ausfuehrende_berater": "Ausführende Berater"}, "zugewiesene_projekte": {"projektkennung": "Projektkennung", "projektnummer": "Projektnummer", "projektart": "Projektart", "projektstatus": "Projektstatus", "projektstart_monat": "Startmonat", "projektstart_jahr": "Startjahr", "kunde": "Kunde", "ansprechpartner_kunde": "Ansprechpartner beim Kunden", "letzter_schritt": "Letzter Schritt / aktueller Stand", "projektleitung": "Projektleitung"}};
  const inputFields = useMemo(() => flattenFieldOrder(orderedFields), [orderedFieldsKey]);
  const backendFieldSet = useMemo(() => new Set(inputFields), [inputFields.join(',')]);
  const virtualComputed = useMemo(
    () => Object.fromEntries(
      Object.entries(formEnhancements.computed).filter(([k]) => !backendFieldSet.has(k)),
    ),
    [backendFieldSet],
  );
  const virtualFormEnhancements = useMemo(
    () => ({ ...formEnhancements, computed: virtualComputed }),
    [virtualComputed],
  );
  const computedLayout = useMemo(
    () => classifyComputed(virtualFormEnhancements, inputFields, computedDeps),
    [virtualFormEnhancements, inputFields.join(',')],
  );
  // Applookup-Referenzen: pro ownKey (Lookup-Feld im Form) die Liste der
  // lookupKeys, die in irgendeiner computed-Formel referenziert werden.
  // MODUS-1: aus dem Spec-Tree extrahiert. MODUS-2: aus dem Build-Time-
  // Export computedApplookupRefs (parse-formulas hat Regex-Pairs gesammelt).
  // Pro (ownKey, lookupKey)-Paar nur einmal; pro ownKey können aber mehrere
  // lookupKeys gleichzeitig auftauchen (z.B. einzelpreis UND karten10_preis
  // beim Yoga-Kurs), und alle werden separat als Inline-Hint gerendert.
  const applookupRefs = useMemo(
    () => mergeApplookupRefs(
      extractApplookupRefs(formEnhancements.computed),
      computedApplookupRefs,
    ),
    [],
  );
  function summaryLabel(k: string): string {
    if (FIELD_LABELS[k]) return FIELD_LABELS[k];
    // Leading underscore(s) als Virtual-Marker abstreifen; Unterstriche zu
    // Leerzeichen, jedes Wort kapitalisieren. Umlaute kommen vom Sub-Agent
    // direkt im Key (z. B. `_buchung_dauer_nächte`) — JS/TS/Vite unterstützen
    // Unicode-Identifier nativ, daher keine ASCII-Transliteration nötig.
    return k.replace(/^_+/, '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  function formatSummaryValue(k: string, v: unknown): string {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '—';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    // Backend-Feld mit €-Label ODER virtueller Computed-Key, dessen Name nach Geld aussieht.
    const looksLikeCurrency = CURRENCY_KEYS.has(k) || /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k);
    if (looksLikeCurrency) {
      return n.toLocaleString(localeTag(), { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString(localeTag(), { maximumFractionDigits: 2 });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0 max-sm:[&>button]:size-10 max-sm:[&>button]:grid max-sm:[&>button]:place-items-center max-sm:[&>button]:rounded-full max-sm:[&>button]:border max-sm:[&>button]:border-input max-sm:[&>button]:bg-background max-sm:[&>button]:opacity-100 max-sm:[&>button>svg]:size-5">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center gap-3 space-y-0">
          <DialogTitle className="flex-1 truncate text-left">{DIALOG_INTENT}</DialogTitle>
          {enablePhotoScan && (
            <button
              type="button"
              onClick={() => setAiOpen(o => !o)}
              aria-expanded={aiOpen}
              aria-controls="ai-fill-panel"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 max-sm:py-2.5 max-sm:px-4 text-xs font-semibold transition-all mr-7 max-sm:mr-12 shadow-sm ${
                aiOpen
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 hover:border-primary/50'
              }`}
            >
              <IconSparkles className={`h-3.5 w-3.5 ${aiOpen ? '' : 'text-primary'}`} />
              <span className="hidden sm:inline">{t('smart_fill')}</span>
              <IconChevronDown className={`h-3 w-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </DialogHeader>
        {enablePhotoScan && aiOpen && (
          <div id="ai-fill-panel" className="border-b bg-muted/20 px-6 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">{t('scan_header_sub')}</p>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  {t('useinfo_label')}
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? t('useinfo_loading') : `(${t('useinfo_more')})`}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">{t('profile_preamble')}</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">{t('useinfo_error')}</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_analyzing')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_analyzing_sub')}</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('scan_success')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_success_sub')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_upload')}</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />{t('scan_camera_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />{t('scan_file_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />{t('scan_doc_btn')}
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder={t('scan_text_placeholder')}
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title={t('paste')}
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />{t('scan_text_analyze')}
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 min-w-0 max-sm:[&_input]:h-11">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0">
            {(() => {
              const renderField = (k: string) => {
                const inlineHints = computedLayout.anchors[k] ?? [];
                const refs = applookupRefs[k] ?? [];
                // A field the plan gives to a TOOL. On CREATE it is not shown
                // at all — the value does not exist yet and typing one only
                // gets overwritten. On EDIT it stays a normal input with a
                // note: when a tool could not compose its value (a missing
                // ingredient), this is the only place to repair the record.
                if (SYSTEM_ASSIGNED.includes(k) && !recordId) {
                  return (
                    <div key={k} className="space-y-1.5 min-w-0">
                      <Label>{fieldLabel('berater', k)}</Label>
                      <p className="text-sm text-muted-foreground">{t('assigned_by_system')}</p>
                    </div>
                  );
                }
                return (
                  <div key={k} className="space-y-1.5 min-w-0">
                    {fieldBlocks[k]}
                    {SYSTEM_ASSIGNED.includes(k) && (
                      <p className="text-xs text-muted-foreground">{t('assigned_by_system')}</p>
                    )}
                    {refs.map(({ lookupKey }) => {
                      // Show the live numeric value the formula will pull from
                      // the selected lookup target (e.g. "Monatspreis: 34,90 €"
                      // under the Tarif combobox). Hidden while no lookup is
                      // selected or the target field is non-numeric.
                      const v = resolveApplookupRef(k, lookupKey, fields as Record<string, unknown>, computedContext);
                      if (v === null) return null;
                      const lbl = APPLOOKUP_LABELS[k]?.[lookupKey] ?? lookupKey;
                      const text = formatSummaryValue(lookupKey, v);
                      return (
                        <div key={`alh-${k}-${lookupKey}`} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{lbl}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                    {inlineHints.map((cKey) => {
                      const v = computedValues[cKey];
                      const text = formatSummaryValue(cKey, v);
                      if (text === '—') return null;
                      return (
                        <div key={cKey} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{summaryLabel(cKey)}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              };
              return orderedFields.map((item, idx) => {
                if (typeof item === 'string') return renderField(item);
                const cols = item.cols ?? `repeat(${item.row.length}, minmax(0, 1fr))`;
                return (
                  <div key={`row-${idx}`} className="grid gap-3" style={{ gridTemplateColumns: cols }}>
                    {item.row.map(renderField)}
                  </div>
                );
              });
            })()}
            {(computedLayout.aggregates.length > 0 || computedLayout.finalTotal) && (
              <div className="mt-6 pt-4 border-t border-border space-y-1.5">
                {computedLayout.aggregates.length > 0 && (
                  <dl className="space-y-1.5 pb-2">
                    {computedLayout.aggregates.map((k) => {
                      const userVal = (fields as Record<string, unknown>)[k];
                      const computed = computedValues[k];
                      const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                      return (
                        <div key={k} className="flex justify-between items-baseline gap-3">
                          <dt className="text-sm text-muted-foreground truncate">{summaryLabel(k)}</dt>
                          <dd className="text-sm font-medium tabular-nums whitespace-nowrap">{formatSummaryValue(k, v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {computedLayout.finalTotal && (() => {
                  const k = computedLayout.finalTotal;
                  const userVal = (fields as Record<string, unknown>)[k];
                  const computed = computedValues[k];
                  const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                  // Innere Border nur wenn aggregates existieren — sonst hätten wir
                  // zwei direkt aufeinanderfolgende Striche (Outer + Inner) mit nur
                  // einer Aggregat-Zeile dazwischen → zu viel visuelles Rauschen.
                  const sep = computedLayout.aggregates.length > 0 ? 'pt-3 border-t border-border' : 'pt-1';
                  return (
                    <div className={`flex justify-between items-baseline gap-3 ${sep}`}>
                      <span className="text-base font-semibold text-foreground">{summaryLabel(k)}</span>
                      <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground">{formatSummaryValue(k, v)}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {showErrors && missingRequired.length > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1.5" role="alert">
                <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
                {t('missing_required')}
              </p>
            )}
            {recordId && (
              <div className="pt-2 border-t border-border">
                <AttachmentsSection appId={APP_IDS.BERATER} recordId={recordId} />
              </div>
            )}
          </div>
          {submitError && (
            <div className="flex items-start gap-2 border-t border-destructive/20 bg-destructive/10 px-6 py-2.5 text-sm text-destructive" role="alert">
              <IconAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{submitError}</span>
            </div>
          )}
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2 max-sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="max-sm:h-12 max-sm:flex-1 max-sm:text-base">{t('cancel')}</Button>
            <Button
              type="submit"
              className="max-sm:h-12 max-sm:flex-1 max-sm:text-base"
              disabled={saving || !isDirty || (showErrors && missingRequired.length > 0)}
            >
              {saving ? t('saving') : defaultValues ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {createLeistungskatalogOpen && (
      <LeistungskatalogDialog
        open={createLeistungskatalogOpen}
        onClose={() => setCreateLeistungskatalogOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createLeistungskatalogEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Leistungskatalog;
            setExtraLeistungskatalog(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.LEISTUNGSKATALOG, result.id);
            setFields(prev => ({ ...prev, [createLeistungskatalogField]: url } as any));
          }
          setCreateLeistungskatalogOpen(false);
        }}
        defaultValues={createLeistungskatalogInitial
          ? ({ leistungsname: createLeistungskatalogInitial } as any)
          : undefined}
        beraterList={[]}
      />
    )}
    {createProjekteOpen && (
      <ProjekteDialog
        open={createProjekteOpen}
        onClose={() => setCreateProjekteOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createProjekteEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Projekte;
            setExtraProjekte(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.PROJEKTE, result.id);
            setFields(prev => ({ ...prev, [createProjekteField]: url } as any));
          }
          setCreateProjekteOpen(false);
        }}
        defaultValues={createProjekteInitial
          ? ({ projektkennung: createProjekteInitial } as any)
          : undefined}
        kundenList={[]}
        beraterList={[]}
      />
    )}
    </>
  );
}