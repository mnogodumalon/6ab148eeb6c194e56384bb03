/**
 * useAngebotErstellenFlow — the plumbing of the flow « Angebot erstellen », generated from the plan.
 *
 * Writes `angebote`: asks `projekt`, `berater`, `angebotstyp`, `zeitrahmen_anfang`, `zeitrahmen_ende`, `dauer`, `kostentyp`, `kostenbetrag`, `beschreibung`; sets `angebotsstatus` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 4)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *   compute   REQUIRED — the plan says these values are computed in the flow
 *             but leaves the rule to you: `angebotsjahr` (derived:computed:Aktuelles Kalenderjahr zum Zeitpunkt der Anlage) *
 *   const flow = useAngebotErstellenFlow({
 *     steps: { projekt: 1, berater: 2, angebotstyp: 3, zeitrahmen_anfang: 3, zeitrahmen_ende: 3, dauer: 3, kostentyp: 3, kostenbetrag: 3, beschreibung: 3 },
 *     items: { projekt: r => ({ id: r.id, title: fieldText(r, 'projektkennung') }) },
 *     compute: { angebotsjahr: forms => null },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.projekt.select} {...flow.pick('projekt')} />
 *     <EntitySelectStep {...flow.picks.berater.select} {...flow.pick('berater')} />
 *     <Bound form={flow.forms.angebote} name="angebotstyp" />
 *     <Bound form={flow.forms.angebote} name="zeitrahmen_anfang" />
 *     <Bound form={flow.forms.angebote} name="zeitrahmen_ende" />
 *     <Bound form={flow.forms.angebote} name="dauer" />
 *     <Bound form={flow.forms.angebote} name="kostentyp" />
 *     <Bound form={flow.forms.angebote} name="kostenbetrag" />
 *     <Bound form={flow.forms.angebote} name="beschreibung" />
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
export type AngebotErstellenFieldKey = 'angebotstyp' | 'berater' | 'beschreibung' | 'dauer' | 'kostenbetrag' | 'kostentyp' | 'projekt' | 'zeitrahmen_anfang' | 'zeitrahmen_ende';

export interface AngebotErstellenForms {
  angebote: StepForm<'angebote'>;
}

// Alias so the option generics stay readable.
type Key = AngebotErstellenFieldKey;

export interface AngebotErstellenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    projekt?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    berater?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** The plan computes these in the flow but leaves the rule to the page. */
  compute: {
    angebotsjahr: (forms: AngebotErstellenForms) => unknown;   // derived:computed:Aktuelles Kalenderjahr zum Zeitpunkt der Anlage
  };
}

const DEFAULT_STEPS: Record<string, number> = {"angebotstyp": 3, "berater": 2, "beschreibung": 3, "dauer": 3, "kostenbetrag": 3, "kostentyp": 3, "projekt": 1, "zeitrahmen_anfang": 3, "zeitrahmen_ende": 3};
export const ANGEBOTERSTELLEN_REVIEW_STEP = 4;

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

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useAngebotErstellenFlow(options: AngebotErstellenFlowOptions) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const angebote = useStepForm('angebote', {
    fields: ["projekt", "berater", "angebotstyp", "zeitrahmen_anfang", "zeitrahmen_ende", "dauer", "kostentyp", "kostenbetrag", "beschreibung"],
    steps: only(steps, ["projekt", "berater", "angebotstyp", "zeitrahmen_anfang", "zeitrahmen_ende", "dauer", "kostentyp", "kostenbetrag", "beschreibung"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["projekt", "berater", "angebotstyp", "zeitrahmen_anfang", "zeitrahmen_ende", "dauer", "kostentyp", "kostenbetrag", "beschreibung"]),
    messages: only(options.messages as Record<string, string> | undefined, ["projekt", "berater", "angebotstyp", "zeitrahmen_anfang", "zeitrahmen_ende", "dauer", "kostentyp", "kostenbetrag", "beschreibung"]),
  });
  const forms: AngebotErstellenForms = { angebote };
  const formList: StepForm[] = [angebote];

  const picks = {
    projekt: useRecordSearch(servicePort, 'projekte', {
      searchFields: ["projektkennung"] as never,
      toItem: options.items?.projekt as never,
    }),
    berater: useRecordSearch(servicePort, 'berater', {
      searchFields: ["vorname", "nachname"] as never,
      filter: "r.v_status == 'aktiv'",
      where: (r: JourneyRecord) => (fieldLookup(r, "status")?.key ?? null) === "aktiv",
      toItem: options.items?.berater as never,
    }),
  };

  const plan: PlanStep[] = [
    {
      key: 'angebote', entity: 'angebote', form: angebote, primary: true,
      values: (): FormValues => ({
        angebotsstatus: "entwurf",
        angebotsjahr: options.compute.angebotsjahr(forms),
      }),
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'angebot-erstellen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: AngebotErstellenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id)),
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: AngebotErstellenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'angebot-erstellen' as const,
    draftKey: 'angebot-erstellen' as const,
    entity: 'angebote' as const,
    form: angebote,
    forms, formList, picks, submit, steps,    reviewStep: ANGEBOTERSTELLEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
  };
}

export type AngebotErstellenFlow = ReturnType<typeof useAngebotErstellenFlow>;
