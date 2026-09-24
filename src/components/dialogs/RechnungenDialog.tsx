/**
 * RechnungenDialog — pre-generated create/edit dialog for Rechnungen.
 *
 * Props: open, onClose, onSubmit(fields) => Promise<void>, defaultValues?,
 * recordId? (pass when EDITING — enables the attachments section),
 * kundenList (full hook array — resolves the Kunden applookup),
 * projekteList (full hook array — resolves the Projekte applookup),
 * beraterList (full hook array — resolves the Berater applookup),
 * zeiterfassungList (full hook array — resolves the Zeiterfassung applookup),
 * enablePhotoScan?, enablePhotoLocation?.
 *
 * defaultValues is SHAPE-TOLERANT and its prop type is the EXPORTED
 * RechnungenDialogDefaults — NOT the entity field type: lookup fields accept
 * the bare KEY string (or LookupValue), applookup fields the bare record id
 * (or record URL); the dialog normalizes. Type prefill STATE with the export:
 *  ❌ useState<Partial<Rechnungen['fields']>>({ … })   // LookupValue fields reject string prefills (TS2322)
 *  ✓ useState<RechnungenDialogDefaults | undefined>(undefined)
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Rechnungen, Kunden, Projekte, Berater, Zeiterfassung, LookupValue } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, extractRecordIds, uploadFile, getUserProfile, LivingAppsService } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComputedContext } from '@/config/form-enhancements/types';
import { applyFieldOrder, flattenFieldOrder, applyDefaults, evalComputed, numberInputProps, clampNumberValue, classifyComputed, extractApplookupRefs, mergeApplookupRefs, resolveApplookupRef } from '@/config/form-enhancements/types';
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/Rechnungen';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { requiredMessage } from '@/lib/journey/messages';
import { t, appLabel, fieldLabel, lookupLabel, localeTag, CURRENCY } from '@/i18n';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox, MultiCombobox } from '@/components/Combobox';
import { KundenDialog } from '@/components/dialogs/KundenDialog';
import { ProjekteDialog } from '@/components/dialogs/ProjekteDialog';
import { BeraterDialog } from '@/components/dialogs/BeraterDialog';
import { ZeiterfassungDialog } from '@/components/dialogs/ZeiterfassungDialog';
import { DatePicker } from '@/components/DatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { IconAlertCircle, IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode, dataUriToBlob } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

/** Widened prefill type for RechnungenDialog.defaultValues — see file header. */
export type RechnungenDialogDefaults = Omit<Rechnungen['fields'], 'rechnungsstatus' | 'rechnungsmonat'> & {
    rechnungsstatus?: LookupValue | string;
    rechnungsmonat?: LookupValue | string;
  };

interface RechnungenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Rechnungen['fields']) => Promise<void>;
  /** SHAPE-TOLERANT: lookup fields accept the bare key (string) or the
   *  LookupValue object; applookup fields the bare record id or the full
   *  record URL — the dialog normalizes both. */
  defaultValues?: RechnungenDialogDefaults;
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  kundenList: Kunden[];
  projekteList: Projekte[];
  beraterList: Berater[];
  zeiterfassungList: Zeiterfassung[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

// defaultValues are SHAPE-TOLERANT: the dialog resolves bare lookup keys via
// its own options and bare record ids via the field's target app — consumers
// never carry the LookupValue/record-URL shape in their head.
const NORMALIZE_LOOKUPS: Record<string, readonly { key: string; label: string }[]> = {
  rechnungsstatus: LOOKUP_OPTIONS['rechnungen']?.['rechnungsstatus'] ?? [],
  rechnungsmonat: LOOKUP_OPTIONS['rechnungen']?.['rechnungsmonat'] ?? [],
};
const NORMALIZE_APPLOOKUPS: Record<string, string> = {
  kunde: APP_IDS.KUNDEN,
  projekt: APP_IDS.PROJEKTE,
  berater: APP_IDS.BERATER,
  zeiterfassungseintraege: APP_IDS.ZEITERFASSUNG,
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

export function RechnungenDialog({ open, onClose, onSubmit, defaultValues, recordId, kundenList, projekteList, beraterList, zeiterfassungList, enablePhotoScan = true, enablePhotoLocation = true }: RechnungenDialogProps) {
  const [fields, setFields] = useState<Partial<Rechnungen['fields']>>({});
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
  // Inline-Create state for "Kunden" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraKunden` list, and select it in
  // the originating Combobox via the captured `createKundenField`.
  const [createKundenOpen, setCreateKundenOpen] = useState(false);
  const [createKundenInitial, setCreateKundenInitial] = useState('');
  const [createKundenField, setCreateKundenField] = useState<string>('');
  const [extraKunden, setExtraKunden] = useState< Kunden[]>([]);
  const kundenListAll = useMemo(
    () => [...kundenList, ...extraKunden],
    [kundenList, extraKunden],
  );
  function openCreateKunden(fieldKey: string, q: string) {
    setCreateKundenField(fieldKey);
    setCreateKundenInitial(q);
    setCreateKundenOpen(true);
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
  // Inline-Create state for "Berater" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraBerater` list, and select it in
  // the originating Combobox via the captured `createBeraterField`.
  const [createBeraterOpen, setCreateBeraterOpen] = useState(false);
  const [createBeraterInitial, setCreateBeraterInitial] = useState('');
  const [createBeraterField, setCreateBeraterField] = useState<string>('');
  const [extraBerater, setExtraBerater] = useState< Berater[]>([]);
  const beraterListAll = useMemo(
    () => [...beraterList, ...extraBerater],
    [beraterList, extraBerater],
  );
  function openCreateBerater(fieldKey: string, q: string) {
    setCreateBeraterField(fieldKey);
    setCreateBeraterInitial(q);
    setCreateBeraterOpen(true);
  }
  // Inline-Create state for "Zeiterfassung" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraZeiterfassung` list, and select it in
  // the originating Combobox via the captured `createZeiterfassungField`.
  const [createZeiterfassungOpen, setCreateZeiterfassungOpen] = useState(false);
  const [createZeiterfassungInitial, setCreateZeiterfassungInitial] = useState('');
  const [createZeiterfassungField, setCreateZeiterfassungField] = useState<string>('');
  const [extraZeiterfassung, setExtraZeiterfassung] = useState< Zeiterfassung[]>([]);
  const zeiterfassungListAll = useMemo(
    () => [...zeiterfassungList, ...extraZeiterfassung],
    [zeiterfassungList, extraZeiterfassung],
  );
  function openCreateZeiterfassung(fieldKey: string, q: string) {
    setCreateZeiterfassungField(fieldKey);
    setCreateZeiterfassungInitial(q);
    setCreateZeiterfassungOpen(true);
  }
  // Fields the plan assigns to a tool (empty without a plan).
  const SYSTEM_ASSIGNED: string[] = ["gesamtbetrag", "rechnungsnummer"];
  const [showErrors, setShowErrors] = useState(false);
  const REQUIRED_FIELDS = ['rechnungsdatum', 'kunde', 'projekt'] as const;
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
      'kunde': kundenList,
      'projekt': projekteList,
      'berater': beraterList,
      'zeiterfassungseintraege': zeiterfassungList,
    },
  }), [kundenList, projekteList, beraterList, zeiterfassungList, ]);
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
      setFields(applyDefaults(normalizedDefaults ?? {}, formEnhancements.defaults) as Partial<Rechnungen['fields']>);
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
      const clean = cleanFieldsForApi(merged, 'rechnungen');
      await onSubmit(clean as Rechnungen['fields']);
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
      contextParts.push(`<available-records field="kunde" entity="Kunden">\n${JSON.stringify(kundenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="projekt" entity="Projekte">\n${JSON.stringify(projekteList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="berater" entity="Berater">\n${JSON.stringify(beraterList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="zeiterfassungseintraege" entity="Zeiterfassung">\n${JSON.stringify(zeiterfassungList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "rechnungsnummer": string | null, // Rechnungsnummer\n  "rechnungsdatum": string | null, // YYYY-MM-DD\n  "faelligkeitsdatum": string | null, // YYYY-MM-DD\n  "rechnungsstatus": LookupValue | null, // Rechnungsstatus (select one key: "entwurf" | "versendet" | "bezahlt" | "ueberfaellig" | "storniert") mapping: entwurf=Entwurf, versendet=Versendet, bezahlt=Bezahlt, ueberfaellig=Überfällig, storniert=Storniert\n  "rechnungsmonat": LookupValue | null, // Abrechnungsmonat (select one key: "januar" | "februar" | "maerz" | "april" | "mai" | "juni" | "juli" | "august" | "september" | "oktober" | "november" | "dezember") mapping: januar=Januar, februar=Februar, maerz=März, april=April, mai=Mai, juni=Juni, juli=Juli, august=August, september=September, oktober=Oktober, november=November, dezember=Dezember\n  "rechnungsjahr": number | null, // Abrechnungsjahr\n  "kunde": string | null, // Display name from Kunden (see <available-records>)\n  "nettobetrag": number | null, // Nettobetrag (€)\n  "mehrwertsteuer": number | null, // Mehrwertsteuer (%)\n  "gesamtbetrag": number | null, // Gesamtbetrag (€)\n  "notizen": string | null, // Notizen\n  "projekt": string | null, // Display name from Projekte (see <available-records>)\n  "berater": string[] | null, // Display names from Berater, one per referenced record (see <available-records>)\n  "zeiterfassungseintraege": string[] | null, // Display names from Zeiterfassung, one per referenced record (see <available-records>)\n}`;
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
        const applookupKeys = new Set<string>(["kunde", "projekt", "berater", "zeiterfassungseintraege"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const kundeName = raw['kunde'] as string | null;
        if (kundeName) {
          const kundeMatch = kundenList.find(r => matchName(kundeName!, [String(r.fields.kundenname ?? '')]));
          if (kundeMatch) merged['kunde'] = createRecordUrl(APP_IDS.KUNDEN, kundeMatch.record_id);
        }
        const projektName = raw['projekt'] as string | null;
        if (projektName) {
          const projektMatch = projekteList.find(r => matchName(projektName!, [String(r.fields.projektkennung ?? '')]));
          if (projektMatch) merged['projekt'] = createRecordUrl(APP_IDS.PROJEKTE, projektMatch.record_id);
        }
        const beraterNames = raw['berater'];
        if (Array.isArray(beraterNames) && beraterNames.length > 0) {
          const beraterUrls = (beraterNames as unknown[])
            .map(n => beraterList.find(r => matchName(String(n), [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')])))
            .filter((r): r is NonNullable<typeof r> => Boolean(r))
            .map(r => createRecordUrl(APP_IDS.BERATER, r.record_id));
          if (beraterUrls.length > 0) merged['berater'] = beraterUrls;
        }
        const zeiterfassungseintraegeNames = raw['zeiterfassungseintraege'];
        if (Array.isArray(zeiterfassungseintraegeNames) && zeiterfassungseintraegeNames.length > 0) {
          const zeiterfassungseintraegeUrls = (zeiterfassungseintraegeNames as unknown[])
            .map(n => zeiterfassungList.find(r => matchName(String(n), [String(r.fields.taetigkeit ?? '')])))
            .filter((r): r is NonNullable<typeof r> => Boolean(r))
            .map(r => createRecordUrl(APP_IDS.ZEITERFASSUNG, r.record_id));
          if (zeiterfassungseintraegeUrls.length > 0) merged['zeiterfassungseintraege'] = zeiterfassungseintraegeUrls;
        }
        return merged as Partial<Rechnungen['fields']>;
      });
      // Upload scanned file to file fields
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        try {
          const blob = dataUriToBlob(uri!);
          const fileUrl = await uploadFile(blob, file.name);
          setFields(prev => ({ ...prev, anhang: fileUrl }));
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
        }
      }
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
    ? t('edit_entity', { entity: appLabel('rechnungen') })
    : t('new_entity', { entity: appLabel('rechnungen') });

  const fieldBlocks: Record<string, React.ReactNode> = {
    'rechnungsnummer': (
      <div key="rechnungsnummer" className="space-y-1.5">
        <Label htmlFor="rechnungsnummer">{fieldLabel('rechnungen', 'rechnungsnummer')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="rechnungsnummer"
          placeholder="Eindeutige Rechnungsnummer"
          value={fields.rechnungsnummer ?? ''}
          onChange={e => setFields(f => ({ ...f, rechnungsnummer: e.target.value }))}
          required
        />
        {showErrors && !fields.rechnungsnummer && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('rechnungen', 'rechnungsnummer')}</p>
        )}
      </div>
    ),
    'rechnungsdatum': (
      <div key="rechnungsdatum" className="space-y-1.5">
        <Label htmlFor="rechnungsdatum">{fieldLabel('rechnungen', 'rechnungsdatum')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <DatePicker
          id="rechnungsdatum"
          placeholder="Wann wurde die Rechnung gestellt?"
          mode="date"
          value={fields.rechnungsdatum ?? null}
          onChange={v => setFields(f => ({ ...f, rechnungsdatum: v ?? undefined }))}
          required
        />
        {showErrors && !fields.rechnungsdatum && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('rechnungen', 'rechnungsdatum')}</p>
        )}
      </div>
    ),
    'faelligkeitsdatum': (
      <div key="faelligkeitsdatum" className="space-y-1.5">
        <Label htmlFor="faelligkeitsdatum">{fieldLabel('rechnungen', 'faelligkeitsdatum')}</Label>
        <DatePicker
          id="faelligkeitsdatum"
          placeholder="Bis wann fällig?"
          mode="date"
          value={fields.faelligkeitsdatum ?? null}
          onChange={v => setFields(f => ({ ...f, faelligkeitsdatum: v ?? undefined }))}
        />
      </div>
    ),
    'rechnungsstatus': (
      <div key="rechnungsstatus" className="space-y-1.5">
        <Label htmlFor="rechnungsstatus">{fieldLabel('rechnungen', 'rechnungsstatus')}</Label>
        <div role="radiogroup" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.rechnungsstatus) === 'entwurf'}
            onClick={() => setFields(f => ({ ...f, rechnungsstatus: (lookupKey(f.rechnungsstatus) === 'entwurf' ? undefined : 'entwurf') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.rechnungsstatus) === 'entwurf'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('rechnungen', 'rechnungsstatus', 'entwurf') ?? 'Entwurf'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.rechnungsstatus) === 'versendet'}
            onClick={() => setFields(f => ({ ...f, rechnungsstatus: (lookupKey(f.rechnungsstatus) === 'versendet' ? undefined : 'versendet') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.rechnungsstatus) === 'versendet'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('rechnungen', 'rechnungsstatus', 'versendet') ?? 'Versendet'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.rechnungsstatus) === 'bezahlt'}
            onClick={() => setFields(f => ({ ...f, rechnungsstatus: (lookupKey(f.rechnungsstatus) === 'bezahlt' ? undefined : 'bezahlt') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.rechnungsstatus) === 'bezahlt'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('rechnungen', 'rechnungsstatus', 'bezahlt') ?? 'Bezahlt'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.rechnungsstatus) === 'ueberfaellig'}
            onClick={() => setFields(f => ({ ...f, rechnungsstatus: (lookupKey(f.rechnungsstatus) === 'ueberfaellig' ? undefined : 'ueberfaellig') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.rechnungsstatus) === 'ueberfaellig'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('rechnungen', 'rechnungsstatus', 'ueberfaellig') ?? 'Überfällig'}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={lookupKey(fields.rechnungsstatus) === 'storniert'}
            onClick={() => setFields(f => ({ ...f, rechnungsstatus: (lookupKey(f.rechnungsstatus) === 'storniert' ? undefined : 'storniert') as any }))}
            className={`inline-flex items-center justify-center min-h-9 max-sm:min-h-11 max-sm:px-4 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              lookupKey(fields.rechnungsstatus) === 'storniert'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-input hover:bg-accent'
            }`}
          >
            {lookupLabel('rechnungen', 'rechnungsstatus', 'storniert') ?? 'Storniert'}
          </button>
        </div>
      </div>
    ),
    'rechnungsmonat': (
      <div key="rechnungsmonat" className="space-y-1.5">
        <Label htmlFor="rechnungsmonat">{fieldLabel('rechnungen', 'rechnungsmonat')}</Label>
        <Select
          value={lookupKey(fields.rechnungsmonat) ?? ''}
          onValueChange={v => setFields(f => ({ ...f, rechnungsmonat: v === 'none' ? undefined : v as any }))}
        >
          <SelectTrigger id="rechnungsmonat" className="max-sm:h-11"><SelectValue placeholder="Für welchen Monat?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            <SelectItem value="januar">{lookupLabel('rechnungen', 'rechnungsmonat', 'januar') ?? 'Januar'}</SelectItem>
            <SelectItem value="februar">{lookupLabel('rechnungen', 'rechnungsmonat', 'februar') ?? 'Februar'}</SelectItem>
            <SelectItem value="maerz">{lookupLabel('rechnungen', 'rechnungsmonat', 'maerz') ?? 'März'}</SelectItem>
            <SelectItem value="april">{lookupLabel('rechnungen', 'rechnungsmonat', 'april') ?? 'April'}</SelectItem>
            <SelectItem value="mai">{lookupLabel('rechnungen', 'rechnungsmonat', 'mai') ?? 'Mai'}</SelectItem>
            <SelectItem value="juni">{lookupLabel('rechnungen', 'rechnungsmonat', 'juni') ?? 'Juni'}</SelectItem>
            <SelectItem value="juli">{lookupLabel('rechnungen', 'rechnungsmonat', 'juli') ?? 'Juli'}</SelectItem>
            <SelectItem value="august">{lookupLabel('rechnungen', 'rechnungsmonat', 'august') ?? 'August'}</SelectItem>
            <SelectItem value="september">{lookupLabel('rechnungen', 'rechnungsmonat', 'september') ?? 'September'}</SelectItem>
            <SelectItem value="oktober">{lookupLabel('rechnungen', 'rechnungsmonat', 'oktober') ?? 'Oktober'}</SelectItem>
            <SelectItem value="november">{lookupLabel('rechnungen', 'rechnungsmonat', 'november') ?? 'November'}</SelectItem>
            <SelectItem value="dezember">{lookupLabel('rechnungen', 'rechnungsmonat', 'dezember') ?? 'Dezember'}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    ),
    'rechnungsjahr': (
      <div key="rechnungsjahr" className="space-y-1.5">
        <Label htmlFor="rechnungsjahr">{fieldLabel('rechnungen', 'rechnungsjahr')}</Label>
        <Input
          id="rechnungsjahr"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'rechnungsjahr')}
          placeholder="Abrechnungsjahr"
          value={fields.rechnungsjahr !== undefined ? fields.rechnungsjahr : (computedValues['rechnungsjahr'] ?? '')}
          onChange={e => setFields(f => ({ ...f, rechnungsjahr: clampNumberValue(formEnhancements, 'rechnungsjahr', e.target.value) }))}
        />
      </div>
    ),
    'kunde': (
      <div key="kunde" className="space-y-1.5">
        <Label htmlFor="kunde">{fieldLabel('rechnungen', 'kunde')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Combobox
          id="kunde"
          placeholder="Für welchen Kunden?"
          items={kundenListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.kundenname ?? r.record_id),
          }))}
          value={extractRecordId(fields.kunde)}
          onChange={id => setFields(f => ({ ...f, kunde: id ? createRecordUrl(APP_IDS.KUNDEN, id) : undefined }))}
          onCreateNew={(q) => openCreateKunden("kunde", q)}
          createLabel={t('create_in', { entity: appLabel('kunden') })}
        />
        {showErrors && !fields.kunde && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('rechnungen', 'kunde')}</p>
        )}
      </div>
    ),
    'nettobetrag': (
      <div key="nettobetrag" className="space-y-1.5">
        <Label htmlFor="nettobetrag">{fieldLabel('rechnungen', 'nettobetrag')}</Label>
        <Input
          id="nettobetrag"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'nettobetrag')}
          placeholder="z. B. 10000 (€)"
          value={fields.nettobetrag !== undefined ? fields.nettobetrag : (computedValues['nettobetrag'] ?? '')}
          onChange={e => setFields(f => ({ ...f, nettobetrag: clampNumberValue(formEnhancements, 'nettobetrag', e.target.value) }))}
        />
      </div>
    ),
    'mehrwertsteuer': (
      <div key="mehrwertsteuer" className="space-y-1.5">
        <Label htmlFor="mehrwertsteuer">{fieldLabel('rechnungen', 'mehrwertsteuer')}</Label>
        <Input
          id="mehrwertsteuer"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'mehrwertsteuer')}
          placeholder="z. B. 19 (%)"
          value={fields.mehrwertsteuer !== undefined ? fields.mehrwertsteuer : (computedValues['mehrwertsteuer'] ?? '')}
          onChange={e => setFields(f => ({ ...f, mehrwertsteuer: clampNumberValue(formEnhancements, 'mehrwertsteuer', e.target.value) }))}
        />
      </div>
    ),
    'gesamtbetrag': (
      <div key="gesamtbetrag" className="space-y-1.5">
        <Label htmlFor="gesamtbetrag">{fieldLabel('rechnungen', 'gesamtbetrag')}</Label>
        <Input
          id="gesamtbetrag"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'gesamtbetrag')}
          placeholder="Wird automatisch berechnet"
          value={fields.gesamtbetrag !== undefined ? fields.gesamtbetrag : (computedValues['gesamtbetrag'] ?? '')}
          onChange={e => setFields(f => ({ ...f, gesamtbetrag: clampNumberValue(formEnhancements, 'gesamtbetrag', e.target.value) }))}
        />
      </div>
    ),
    'notizen': (
      <div key="notizen" className="space-y-1.5">
        <Label htmlFor="notizen">{fieldLabel('rechnungen', 'notizen')}</Label>
        <Textarea
          id="notizen"
          placeholder="Rechnungsdetails, Besonderheiten..."
          value={fields.notizen ?? ''}
          onChange={e => setFields(f => ({ ...f, notizen: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    'anhang': (
      <div key="anhang" className="space-y-1.5">
        <Label htmlFor="anhang">{fieldLabel('rechnungen', 'anhang')}</Label>
        {fields.anhang ? (
          <div className="flex items-center gap-3 rounded-lg border p-2">
            <div className="relative h-14 w-14 shrink-0 rounded-md bg-muted overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <IconFileText size={20} className="text-muted-foreground" />
              </div>
              <img
                src={fields.anhang}
                alt=""
                className="relative h-full w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate text-foreground">{fields.anhang.split("/").pop()}</p>
              <div className="flex gap-2 mt-1">
                <label
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  {t('fr_change')}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const fileUrl = await uploadFile(file, file.name);
                        setFields(f => ({ ...f, anhang: fileUrl }));
                      } catch (err) { console.error('Upload failed:', err); }
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setFields(f => ({ ...f, anhang: undefined }))}
                >
                  {t('fr_remove')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label
            className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <IconUpload size={20} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('fr_upload_file')}</span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const fileUrl = await uploadFile(file, file.name);
                  setFields(f => ({ ...f, anhang: fileUrl }));
                } catch (err) { console.error('Upload failed:', err); }
              }}
            />
          </label>
        )}
      </div>
    ),
    'projekt': (
      <div key="projekt" className="space-y-1.5">
        <Label htmlFor="projekt">{fieldLabel('rechnungen', 'projekt')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Combobox
          id="projekt"
          placeholder="Dem Projekt zugeordnet?"
          items={projekteListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.projektkennung ?? r.record_id),
          }))}
          value={extractRecordId(fields.projekt)}
          onChange={id => setFields(f => ({ ...f, projekt: id ? createRecordUrl(APP_IDS.PROJEKTE, id) : undefined }))}
          onCreateNew={(q) => openCreateProjekte("projekt", q)}
          createLabel={t('create_in', { entity: appLabel('projekte') })}
        />
        {showErrors && !fields.projekt && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('rechnungen', 'projekt')}</p>
        )}
      </div>
    ),
    'berater': (
      <div key="berater" className="space-y-1.5">
        <Label htmlFor="berater">{fieldLabel('rechnungen', 'berater')}</Label>
        <MultiCombobox
          id="berater"
          placeholder="Welche Berater waren beteiligt?"
          items={beraterListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.vorname ?? r.record_id),
          }))}
          values={extractRecordIds(fields.berater)}
          onChange={ids => setFields(f => ({ ...f, berater: ids.length ? ids.map(id => createRecordUrl(APP_IDS.BERATER, id)) as any : undefined }))}
          onCreateNew={(q) => openCreateBerater("berater", q)}
          createLabel={t('create_in', { entity: appLabel('berater') })}
        />
      </div>
    ),
    'zeiterfassungseintraege': (
      <div key="zeiterfassungseintraege" className="space-y-1.5">
        <Label htmlFor="zeiterfassungseintraege">{fieldLabel('rechnungen', 'zeiterfassungseintraege')}</Label>
        <MultiCombobox
          id="zeiterfassungseintraege"
          placeholder="Welche Zeiteinträge gehören zur Rechnung?"
          items={zeiterfassungListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.taetigkeit ?? r.record_id),
          }))}
          values={extractRecordIds(fields.zeiterfassungseintraege)}
          onChange={ids => setFields(f => ({ ...f, zeiterfassungseintraege: ids.length ? ids.map(id => createRecordUrl(APP_IDS.ZEITERFASSUNG, id)) as any : undefined }))}
          onCreateNew={(q) => openCreateZeiterfassung("zeiterfassungseintraege", q)}
          createLabel={t('create_in', { entity: appLabel('zeiterfassung') })}
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
  const FIELD_LABELS: Record<string, string> = {"rechnungsnummer": "Rechnungsnummer", "rechnungsdatum": "Rechnungsdatum", "faelligkeitsdatum": "Fälligkeitsdatum", "rechnungsstatus": "Rechnungsstatus", "rechnungsmonat": "Abrechnungsmonat", "rechnungsjahr": "Abrechnungsjahr", "kunde": "Kunde", "nettobetrag": "Nettobetrag (€)", "mehrwertsteuer": "Mehrwertsteuer (%)", "gesamtbetrag": "Gesamtbetrag (€)", "notizen": "Notizen", "anhang": "Rechnungsdokument (PDF)", "projekt": "Projekt", "berater": "Beteiligte Berater", "zeiterfassungseintraege": "Zeiterfassungseinträge"};
  const CURRENCY_KEYS = new Set<string>(["nettobetrag", "gesamtbetrag"]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"kunde": {"kundenname": "Name / Firmenname", "kundentyp": "Kundentyp", "email": "E-Mail", "anlagedatum": "Anlagedatum", "strasse": "Straße", "hausnummer": "Hausnummer", "plz": "Postleitzahl", "ort": "Ort", "rechnungsadresse_gleich": "Rechnungsadresse ist identisch mit der Adresse", "rechnungsstrasse": "Rechnungsstraße", "rechnungshausnummer": "Rechnungs-Hausnummer", "rechnungsplz": "Rechnungs-Postleitzahl", "rechnungsort": "Rechnungsort", "ansprechpartner_titel": "Titel des Ansprechpartners", "ansprechpartner_vorname": "Vorname des Ansprechpartners", "ansprechpartner_nachname": "Nachname des Ansprechpartners", "ansprechpartner_email": "E-Mail des Ansprechpartners", "bevorzugte_kontaktart": "Bevorzugte Kontaktart", "letzter_kontakt_datum": "Datum des letzten Kontakts", "letzter_kontakt_ansprechpartner": "Ansprechpartner beim letzten Kontakt", "notizen": "Notizen"}, "projekt": {"projektkennung": "Projektkennung", "projektnummer": "Projektnummer", "projektart": "Projektart", "projektstatus": "Projektstatus", "projektstart_monat": "Startmonat", "projektstart_jahr": "Startjahr", "kunde": "Kunde", "ansprechpartner_kunde": "Ansprechpartner beim Kunden", "letzter_schritt": "Letzter Schritt / aktueller Stand", "projektleitung": "Projektleitung"}, "berater": {"vorname": "Vorname", "nachname": "Nachname", "titel": "Titel (optional)", "strasse": "Straße", "hausnummer": "Hausnummer", "plz": "Postleitzahl", "ort": "Ort", "email_beruflich": "E-Mail (beruflich)", "email_privat": "E-Mail (privat)", "einstiegsdatum": "Einstiegsdatum", "status": "Status", "stundensatz": "Stundensatz (€/h)", "stunden_aktueller_monat": "Gebuchte Stunden – aktueller Monat", "stunden_aktuelles_quartal": "Gebuchte Stunden – aktuelles Quartal", "stunden_aktuelles_jahr": "Gebuchte Stunden – aktuelles Jahr", "stunden_letzter_monat": "Gebuchte Stunden – letzter Monat", "stunden_letztes_quartal": "Gebuchte Stunden – letztes Quartal", "stunden_letztes_jahr": "Gebuchte Stunden – letztes Jahr", "sonstiges": "Sonstige Anmerkungen", "leistungen": "Zugeordnete Leistungen", "zugewiesene_projekte": "Aktuell zugewiesene Projekte"}, "zeiterfassungseintraege": {"berater": "Berater", "projekt": "Projekt", "leistung": "Erbrachte Leistung", "datum": "Datum", "stunden": "Anzahl Stunden", "erfassungsmonat": "Abrechnungsmonat", "erfassungsjahr": "Abrechnungsjahr", "abrechenbar": "Abrechenbar", "taetigkeit": "Tätigkeitsbeschreibung"}};
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
                      <Label>{fieldLabel('rechnungen', k)}</Label>
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
                <AttachmentsSection appId={APP_IDS.RECHNUNGEN} recordId={recordId} />
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
    {createKundenOpen && (
      <KundenDialog
        open={createKundenOpen}
        onClose={() => setCreateKundenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createKundenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Kunden;
            setExtraKunden(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.KUNDEN, result.id);
            setFields(prev => ({ ...prev, [createKundenField]: url } as any));
          }
          setCreateKundenOpen(false);
        }}
        defaultValues={createKundenInitial
          ? ({ kundenname: createKundenInitial } as any)
          : undefined}
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
        kundenList={kundenList}
        beraterList={beraterList}
      />
    )}
    {createBeraterOpen && (
      <BeraterDialog
        open={createBeraterOpen}
        onClose={() => setCreateBeraterOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createBeraterEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Berater;
            setExtraBerater(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.BERATER, result.id);
            setFields(prev => ({ ...prev, [createBeraterField]: url } as any));
          }
          setCreateBeraterOpen(false);
        }}
        defaultValues={createBeraterInitial
          ? ({ vorname: createBeraterInitial } as any)
          : undefined}
        leistungskatalogList={[]}
        projekteList={projekteList}
      />
    )}
    {createZeiterfassungOpen && (
      <ZeiterfassungDialog
        open={createZeiterfassungOpen}
        onClose={() => setCreateZeiterfassungOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createZeiterfassungEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Zeiterfassung;
            setExtraZeiterfassung(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.ZEITERFASSUNG, result.id);
            setFields(prev => ({ ...prev, [createZeiterfassungField]: url } as any));
          }
          setCreateZeiterfassungOpen(false);
        }}
        defaultValues={createZeiterfassungInitial
          ? ({ taetigkeit: createZeiterfassungInitial } as any)
          : undefined}
        beraterList={beraterList}
        projekteList={projekteList}
        leistungskatalogList={[]}
      />
    )}
    </>
  );
}