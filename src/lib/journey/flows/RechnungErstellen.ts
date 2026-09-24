/**
 * useRechnungErstellenFlow — the plumbing of the flow « Rechnung erstellen », generated from the plan.
 *
 * Writes `rechnungen`: asks `kunde`, `projekt`, `zeiterfassungseintraege`, `berater`, `faelligkeitsdatum`, `rechnungsmonat`, `rechnungsjahr`, `nettobetrag`, `mehrwertsteuer`, `notizen`, `gesamtbetrag`; sets `rechnungsdatum`, `rechnungsstatus` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 6)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useRechnungErstellenFlow({
 *     steps: { kunde: 1, projekt: 2, zeiterfassungseintraege: 3, berater: 4, faelligkeitsdatum: 5, rechnungsmonat: 5, rechnungsjahr: 5, nettobetrag: 5, mehrwertsteuer: 5, notizen: 5, gesamtbetrag: 5 },
 *     items: { kunde: r => ({ id: r.id, title: fieldText(r, 'kundenname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.kunde.select} {...flow.pick('kunde')} />
 *     <EntitySelectStep {...flow.picks.projekt.select} {...flow.pick('projekt')} />
 *     <EntitySelectStep {...flow.picks.zeiterfassungseintraege.select} {...flow.pickMany('zeiterfassungseintraege')} />
 *     <EntitySelectStep {...flow.picks.berater.select} {...flow.pickMany('berater')} />
 *     <Bound form={flow.forms.rechnungen} name="faelligkeitsdatum" />
 *     <Bound form={flow.forms.rechnungen} name="rechnungsmonat" />
 *     <Bound form={flow.forms.rechnungen} name="rechnungsjahr" />
 *     <Bound form={flow.forms.rechnungen} name="nettobetrag" />
 *     <Bound form={flow.forms.rechnungen} name="mehrwertsteuer" />
 *     <Bound form={flow.forms.rechnungen} name="notizen" />
 *     <Bound form={flow.forms.rechnungen} name="gesamtbetrag" />
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
export type RechnungErstellenFieldKey = 'berater' | 'faelligkeitsdatum' | 'gesamtbetrag' | 'kunde' | 'mehrwertsteuer' | 'nettobetrag' | 'notizen' | 'projekt' | 'rechnungsjahr' | 'rechnungsmonat' | 'zeiterfassungseintraege';

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
    kunde?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    projekt?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    zeiterfassungseintraege?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    berater?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"berater": 4, "faelligkeitsdatum": 5, "gesamtbetrag": 5, "kunde": 1, "mehrwertsteuer": 5, "nettobetrag": 5, "notizen": 5, "projekt": 2, "rechnungsjahr": 5, "rechnungsmonat": 5, "zeiterfassungseintraege": 3};
export const RECHNUNGERSTELLEN_REVIEW_STEP = 6;

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
    fields: ["kunde", "projekt", "zeiterfassungseintraege", "berater", "faelligkeitsdatum", "rechnungsmonat", "rechnungsjahr", "nettobetrag", "mehrwertsteuer", "notizen", "gesamtbetrag"],
    steps: only(steps, ["kunde", "projekt", "zeiterfassungseintraege", "berater", "faelligkeitsdatum", "rechnungsmonat", "rechnungsjahr", "nettobetrag", "mehrwertsteuer", "notizen", "gesamtbetrag"]) as Record<string, number>,
    // the plan builds a value from these — required here, whatever the app's base view says
    required: { berater: true, faelligkeitsdatum: true, gesamtbetrag: true, kunde: true, mehrwertsteuer: true, nettobetrag: true, projekt: true, zeiterfassungseintraege: true },
    initial: only(options.initial as FormValues | undefined, ["kunde", "projekt", "zeiterfassungseintraege", "berater", "faelligkeitsdatum", "rechnungsmonat", "rechnungsjahr", "nettobetrag", "mehrwertsteuer", "notizen", "gesamtbetrag"]),
    messages: only(options.messages as Record<string, string> | undefined, ["kunde", "projekt", "zeiterfassungseintraege", "berater", "faelligkeitsdatum", "rechnungsmonat", "rechnungsjahr", "nettobetrag", "mehrwertsteuer", "notizen", "gesamtbetrag"]),
  });
  const forms: RechnungErstellenForms = { rechnungen };
  const formList: StepForm[] = [rechnungen];

  const picks = {
    kunde: useRecordSearch(servicePort, 'kunden', {
      searchFields: ["kundenname", "email"] as never,
      toItem: options.items?.kunde as never,
    }),
    projekt: useRecordSearch(servicePort, 'projekte', {
      searchFields: ["projektkennung"] as never,
      toItem: options.items?.projekt as never,
    }),
    zeiterfassungseintraege: useRecordSearch(servicePort, 'zeiterfassung', {
      searchFields: ["taetigkeit"] as never,
      toItem: options.items?.zeiterfassungseintraege as never,
    }),
    berater: useRecordSearch(servicePort, 'berater', {
      searchFields: ["vorname", "nachname"] as never,
      toItem: options.items?.berater as never,
    }),
  };

  const plan: PlanStep[] = [
    {
      key: 'rechnungen', entity: 'rechnungen', form: rechnungen, primary: true,
      values: (): FormValues => ({
        rechnungsdatum: todayIso(),
        rechnungsstatus: "entwurf",
      }),
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
