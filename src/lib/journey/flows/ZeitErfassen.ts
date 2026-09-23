/**
 * useZeitErfassenFlow — the plumbing of the flow « Zeit erfassen », generated from the plan.
 *
 * Writes `zeiterfassung`: asks `berater`, `projekt`, `leistung`, `datum`, `stunden`, `taetigkeit`, `abrechenbar`.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 5)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *   compute   REQUIRED — the plan says these values are computed in the flow
 *             but leaves the rule to you: `erfassungsmonat` (derived:computed:Monat aus dem eingegebenen Datum ableiten), `erfassungsjahr` (derived:computed:Jahr aus dem eingegebenen Datum ableiten) *
 *   const flow = useZeitErfassenFlow({
 *     steps: { berater: 1, projekt: 2, leistung: 3, datum: 4, stunden: 4, taetigkeit: 4, abrechenbar: 4 },
 *     items: { berater: r => ({ id: r.id, title: fieldText(r, 'vorname') }) },
 *     compute: { erfassungsmonat: forms => null, erfassungsjahr: forms => null },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.berater.select} {...flow.pick('berater')} />
 *     <EntitySelectStep {...flow.picks.projekt.select} {...flow.pick('projekt')} />
 *     <EntitySelectStep {...flow.picks.leistung.select} {...flow.pick('leistung')} />
 *     <Bound form={flow.forms.zeiterfassung} name="datum" />
 *     <Bound form={flow.forms.zeiterfassung} name="stunden" />
 *     <Bound form={flow.forms.zeiterfassung} name="taetigkeit" />
 *     <Bound form={flow.forms.zeiterfassung} name="abrechenbar" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';

export type ZeitErfassenFieldKey = 'abrechenbar' | 'berater' | 'datum' | 'leistung' | 'projekt' | 'stunden' | 'taetigkeit';

export interface ZeitErfassenForms {
  zeiterfassung: StepForm<'zeiterfassung'>;
}

// Alias so the option generics stay readable.
type Key = ZeitErfassenFieldKey;

export interface ZeitErfassenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    berater?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    projekt?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    leistung?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** The plan computes these in the flow but leaves the rule to the page. */
  compute: {
    erfassungsmonat: (forms: ZeitErfassenForms) => unknown;   // derived:computed:Monat aus dem eingegebenen Datum ableiten
    erfassungsjahr: (forms: ZeitErfassenForms) => unknown;   // derived:computed:Jahr aus dem eingegebenen Datum ableiten
  };
}

const DEFAULT_STEPS: Record<string, number> = {"abrechenbar": 4, "berater": 1, "datum": 4, "leistung": 3, "projekt": 2, "stunden": 4, "taetigkeit": 4};
export const ZEITERFASSEN_REVIEW_STEP = 5;

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): Partial<T> | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as Partial<T>;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useZeitErfassenFlow(options: ZeitErfassenFlowOptions) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const zeiterfassung = useStepForm('zeiterfassung', {
    fields: ["berater", "projekt", "leistung", "datum", "stunden", "taetigkeit", "abrechenbar"],
    steps: only(steps, ["berater", "projekt", "leistung", "datum", "stunden", "taetigkeit", "abrechenbar"]) as Record<string, number>,
    // the plan builds a value from these — required here, whatever the app's base view says
    required: { datum: true },
    initial: only(options.initial as FormValues | undefined, ["berater", "projekt", "leistung", "datum", "stunden", "taetigkeit", "abrechenbar"]),
    messages: only(options.messages as Record<string, string> | undefined, ["berater", "projekt", "leistung", "datum", "stunden", "taetigkeit", "abrechenbar"]),
  });
  const forms: ZeitErfassenForms = { zeiterfassung };
  const formList: StepForm[] = [zeiterfassung];

  const picks = {
    berater: useRecordSearch(servicePort, 'berater', {
      searchFields: ["vorname", "nachname"] as never,
      filter: "r.v_status == 'aktiv'",
      where: (r: JourneyRecord) => (fieldLookup(r, "status")?.key ?? null) === "aktiv",
      toItem: options.items?.berater as never,
    }),
    projekt: useRecordSearch(servicePort, 'projekte', {
      searchFields: ["projektkennung"] as never,
      filter: "r.v_projektstatus == 'in_bearbeitung'",
      where: (r: JourneyRecord) => (fieldLookup(r, "projektstatus")?.key ?? null) === "in_bearbeitung",
      toItem: options.items?.projekt as never,
    }),
    leistung: useRecordSearch(servicePort, 'leistungskatalog', {
      searchFields: ["leistungsname"] as never,
      toItem: options.items?.leistung as never,
    }),
  };

  const plan: PlanStep[] = [
    {
      key: 'zeiterfassung', entity: 'zeiterfassung', form: zeiterfassung, primary: true,      values: (): FormValues => ({
        erfassungsmonat: options.compute.erfassungsmonat(forms),
        erfassungsjahr: options.compute.erfassungsjahr(forms),
      }),
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'zeit-erfassen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: ZeitErfassenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      onSelect: (id: string) => owner.set(field as never, id, search?.labelOf(id)),
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: ZeitErfassenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'zeit-erfassen' as const,
    draftKey: 'zeit-erfassen' as const,
    entity: 'zeiterfassung' as const,
    form: zeiterfassung,
    forms, formList, picks, submit, steps,
    reviewStep: ZEITERFASSEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
  };
}

export type ZeitErfassenFlow = ReturnType<typeof useZeitErfassenFlow>;
