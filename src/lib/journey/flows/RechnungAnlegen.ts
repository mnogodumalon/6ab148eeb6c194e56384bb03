/**
 * useRechnungAnlegenFlow — the plumbing of the flow « Rechnung anlegen », generated from the plan.
 *
 * Writes `rechnungen`: asks `projekt`, `kunde`, `berater`, `zeiterfassungseintraege`, `rechnungsdatum`, `faelligkeitsdatum`, `nettobetrag`, `mehrwertsteuer`, `notizen`; sets `rechnungsstatus` itself.
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
 *   compute   REQUIRED — the plan says these values are computed in the flow
 *             but leaves the rule to you: `rechnungsmonat` (derived:computed:Monat aus dem Rechnungsdatum ableiten), `rechnungsjahr` (derived:computed:Jahr aus dem Rechnungsdatum ableiten) *
 *   const flow = useRechnungAnlegenFlow({
 *     steps: { projekt: 1, kunde: 2, berater: 3, zeiterfassungseintraege: 4, rechnungsdatum: 5, faelligkeitsdatum: 5, nettobetrag: 5, mehrwertsteuer: 5, notizen: 5 },
 *     items: { projekt: r => ({ id: r.id, title: fieldText(r, 'projektkennung') }) },
 *     compute: { rechnungsmonat: forms => null, rechnungsjahr: forms => null },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.projekt.select} {...flow.pick('projekt')} />
 *     <EntitySelectStep {...flow.picks.kunde.select} {...flow.pick('kunde')} />
 *     <EntitySelectStep {...flow.picks.berater.select} {...flow.pickMany('berater')} />
 *     <EntitySelectStep {...flow.picks.zeiterfassungseintraege.select} {...flow.pickMany('zeiterfassungseintraege')} />
 *     <Bound form={flow.forms.rechnungen} name="rechnungsdatum" />
 *     <Bound form={flow.forms.rechnungen} name="faelligkeitsdatum" />
 *     <Bound form={flow.forms.rechnungen} name="nettobetrag" />
 *     <Bound form={flow.forms.rechnungen} name="mehrwertsteuer" />
 *     <Bound form={flow.forms.rechnungen} name="notizen" />
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

export type RechnungAnlegenFieldKey = 'berater' | 'faelligkeitsdatum' | 'kunde' | 'mehrwertsteuer' | 'nettobetrag' | 'notizen' | 'projekt' | 'rechnungsdatum' | 'zeiterfassungseintraege';

export interface RechnungAnlegenForms {
  rechnungen: StepForm<'rechnungen'>;
}

// Alias so the option generics stay readable.
type Key = RechnungAnlegenFieldKey;

export interface RechnungAnlegenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    projekt?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    kunde?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    berater?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    zeiterfassungseintraege?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
  /** The plan computes these in the flow but leaves the rule to the page. */
  compute: {
    rechnungsmonat: (forms: RechnungAnlegenForms) => unknown;   // derived:computed:Monat aus dem Rechnungsdatum ableiten
    rechnungsjahr: (forms: RechnungAnlegenForms) => unknown;   // derived:computed:Jahr aus dem Rechnungsdatum ableiten
  };
}

const DEFAULT_STEPS: Record<string, number> = {"berater": 3, "faelligkeitsdatum": 5, "kunde": 2, "mehrwertsteuer": 5, "nettobetrag": 5, "notizen": 5, "projekt": 1, "rechnungsdatum": 5, "zeiterfassungseintraege": 4};
export const RECHNUNGANLEGEN_REVIEW_STEP = 6;

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

export function useRechnungAnlegenFlow(options: RechnungAnlegenFlowOptions) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const rechnungen = useStepForm('rechnungen', {
    fields: ["projekt", "kunde", "berater", "zeiterfassungseintraege", "rechnungsdatum", "faelligkeitsdatum", "nettobetrag", "mehrwertsteuer", "notizen"],
    steps: only(steps, ["projekt", "kunde", "berater", "zeiterfassungseintraege", "rechnungsdatum", "faelligkeitsdatum", "nettobetrag", "mehrwertsteuer", "notizen"]) as Record<string, number>,
    // the plan builds a value from these — required here, whatever the app's base view says
    required: { mehrwertsteuer: true, nettobetrag: true, rechnungsdatum: true },
    initial: only(options.initial as FormValues | undefined, ["projekt", "kunde", "berater", "zeiterfassungseintraege", "rechnungsdatum", "faelligkeitsdatum", "nettobetrag", "mehrwertsteuer", "notizen"]),
    messages: only(options.messages as Record<string, string> | undefined, ["projekt", "kunde", "berater", "zeiterfassungseintraege", "rechnungsdatum", "faelligkeitsdatum", "nettobetrag", "mehrwertsteuer", "notizen"]),
  });
  const forms: RechnungAnlegenForms = { rechnungen };
  const formList: StepForm[] = [rechnungen];

  const picks = {
    projekt: useRecordSearch(servicePort, 'projekte', {
      searchFields: ["projektkennung"] as never,
      toItem: options.items?.projekt as never,
    }),
    kunde: useRecordSearch(servicePort, 'kunden', {
      searchFields: ["kundenname", "email"] as never,
      toItem: options.items?.kunde as never,
    }),
    berater: useRecordSearch(servicePort, 'berater', {
      searchFields: ["vorname", "nachname"] as never,
      toItem: options.items?.berater as never,
    }),
    zeiterfassungseintraege: useRecordSearch(servicePort, 'zeiterfassung', {
      searchFields: ["taetigkeit"] as never,
      filter: "r.v_abrechenbar == True",
      where: (r: JourneyRecord) => r.fields["abrechenbar"] === true,
      toItem: options.items?.zeiterfassungseintraege as never,
    }),
  };

  const plan: PlanStep[] = [
    {
      key: 'rechnungen', entity: 'rechnungen', form: rechnungen, primary: true,      values: (): FormValues => ({
        rechnungsstatus: "entwurf",
        rechnungsmonat: options.compute.rechnungsmonat(forms),
        rechnungsjahr: options.compute.rechnungsjahr(forms),
      }),
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'rechnung-anlegen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: RechnungAnlegenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      onSelect: (id: string) => owner.set(field as never, id, search?.labelOf(id)),
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: RechnungAnlegenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'rechnung-anlegen' as const,
    draftKey: 'rechnung-anlegen' as const,
    entity: 'rechnungen' as const,
    form: rechnungen,
    forms, formList, picks, submit, steps,
    reviewStep: RECHNUNGANLEGEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
  };
}

export type RechnungAnlegenFlow = ReturnType<typeof useRechnungAnlegenFlow>;
