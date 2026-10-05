/**
 * useRechnungErstellenFlow — the plumbing of the flow « Rechnung aus Zeiteinträgen erstellen », generated from the plan.
 *
 * Writes `rechnungen`: asks `berater`, `notizen`, `projekt`, `rechnungsjahr`, `mehrwertsteuer`, `rechnungsmonat`, `faelligkeitsdatum`, `zeiterfassungseintraege`; sets `kunde`, `rechnungsdatum`, `rechnungsstatus` itself.
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
 *
 *   const flow = useRechnungErstellenFlow({
 *     steps: { berater: 1, projekt: 2, zeiterfassungseintraege: 3, notizen: 4, rechnungsjahr: 4, mehrwertsteuer: 4, rechnungsmonat: 4, faelligkeitsdatum: 4 },
 *     items: { berater: r => ({ id: r.id, title: fieldText(r, 'vorname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.berater.select} {...flow.pickMany('berater')} />
 *     <EntitySelectStep {...flow.picks.projekt.select} {...flow.pick('projekt')} />
 *     <EntitySelectStep {...flow.picks.zeiterfassungseintraege.select} {...flow.pickMany('zeiterfassungseintraege')} />
 *     <Bound form={flow.forms.rechnungen} name="notizen" />
 *     <Bound form={flow.forms.rechnungen} name="rechnungsjahr" />
 *     <Bound form={flow.forms.rechnungen} name="mehrwertsteuer" />
 *     <Bound form={flow.forms.rechnungen} name="rechnungsmonat" />
 *     <Bound form={flow.forms.rechnungen} name="faelligkeitsdatum" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
export type RechnungErstellenFieldKey = 'berater' | 'faelligkeitsdatum' | 'mehrwertsteuer' | 'notizen' | 'projekt' | 'rechnungsjahr' | 'rechnungsmonat' | 'zeiterfassungseintraege';

export interface RechnungErstellenForms {
  rechnungen: StepForm<'rechnungen'>;
}

// Alias so the option generics stay readable.
type Key = RechnungErstellenFieldKey;

export interface RechnungErstellenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    berater?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    projekt?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    zeiterfassungseintraege?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"berater": 1, "faelligkeitsdatum": 4, "mehrwertsteuer": 4, "notizen": 4, "projekt": 2, "rechnungsjahr": 4, "rechnungsmonat": 4, "zeiterfassungseintraege": 3};
export const RECHNUNGERSTELLEN_REVIEW_STEP = 5;

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

export function useRechnungErstellenFlow(options: RechnungErstellenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const rechnungen = useStepForm('rechnungen', {
    fields: ["berater", "notizen", "projekt", "rechnungsjahr", "mehrwertsteuer", "rechnungsmonat", "faelligkeitsdatum", "zeiterfassungseintraege"],
    steps: only(steps, ["berater", "notizen", "projekt", "rechnungsjahr", "mehrwertsteuer", "rechnungsmonat", "faelligkeitsdatum", "zeiterfassungseintraege"]) as Record<string, number>,
    // the plan builds a value from these — required here, whatever the app's base view says
    required: { berater: true, mehrwertsteuer: true, zeiterfassungseintraege: true },
    initial: only(options.initial as FormValues | undefined, ["berater", "notizen", "projekt", "rechnungsjahr", "mehrwertsteuer", "rechnungsmonat", "faelligkeitsdatum", "zeiterfassungseintraege"]),
    messages: only(options.messages as Record<string, string> | undefined, ["berater", "notizen", "projekt", "rechnungsjahr", "mehrwertsteuer", "rechnungsmonat", "faelligkeitsdatum", "zeiterfassungseintraege"]),
  });
  const forms: RechnungErstellenForms = { rechnungen };
  const formList: StepForm[] = [rechnungen];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    berater: useRecordSearch(servicePort, 'berater', withPickPolicy('berater', {
      searchFields: ["vorname", "nachname"] as never,
      toItem: options.items?.berater as never,
    })),
    projekt: useRecordSearch(servicePort, 'projekte', withPickPolicy('projekt', {
      searchFields: ["projektkennung"] as never,
      toItem: options.items?.projekt as never,
    })),
    zeiterfassungseintraege: useRecordSearch(servicePort, 'zeiterfassung', withPickPolicy('zeiterfassungseintraege', {
      searchFields: ["taetigkeit"] as never,
      filter: "r.v_abrechenbar == True",
      where: (r: JourneyRecord) => r.fields["abrechenbar"] === true,
      toItem: options.items?.zeiterfassungseintraege as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:rechnung-erstellen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:rechnung-erstellen:write:${entity}.${field}`,
  });
  const picks = {
    berater: { ...searches.berater, select: { ...searches.berater.select, create: false as boolean, hint: hintFor('berater', 'berater', null as PickWhere | null) } },
    projekt: { ...searches.projekt, select: { ...searches.projekt.select, create: false as boolean, hint: hintFor('projekt', 'projekte', null as PickWhere | null) } },
    zeiterfassungseintraege: { ...searches.zeiterfassungseintraege, select: { ...searches.zeiterfassungseintraege.select, create: false as boolean, hint: hintFor('zeiterfassungseintraege', 'zeiterfassung', {"conditions": [{"field": "abrechenbar", "op": "eq", "value": "true"}], "mode": "all"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'rechnungen', entity: 'rechnungen', form: rechnungen, primary: true,
      values: (): FormValues => ({
        kunde: policyFixedValue('rechnungen', 'kunde') ?? fromPick(picks.projekt, forms.rechnungen, "projekt", r => fieldRef(r, "kunde")),
        rechnungsdatum: policyFixedValue('rechnungen', 'rechnungsdatum') ?? todayIso(),
        rechnungsstatus: policyFixedValue('rechnungen', 'rechnungsstatus') ?? "entwurf",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('rechnungen', 'rechnungsstatus', policyFixedValue('rechnungen', 'rechnungsstatus') ?? "entwurf")],

      // the planner's assumptions that first act here — shown once with „Passt“ / „ändern“
      notices: () => [{"assumed": "einfache laufende Nummer (1, 2, 3 \u2026)", "id": "rechnungsnummer-format", "question": "Wie soll die Rechnungsnummer aussehen?"}, {"assumed": "30 Tage", "id": "rechnung-zahlungsziel", "question": "Wie viele Tage Zahlungsziel gelten?"}],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'rechnung-erstellen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: RechnungErstellenFieldKey) => {
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
  const pickMany = (field: RechnungErstellenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'rechnung-erstellen' as const,
    draftKey: 'rechnung-erstellen' as const,
    entity: 'rechnungen' as const,
    form: rechnungen,
    forms, formList, picks, submit, steps,    reviewStep: RECHNUNGERSTELLEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
  };
}

export type RechnungErstellenFlow = ReturnType<typeof useRechnungErstellenFlow>;
