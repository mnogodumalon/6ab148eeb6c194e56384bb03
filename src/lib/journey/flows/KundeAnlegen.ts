/**
 * useKundeAnlegenFlow — the plumbing of the flow « Kunden anlegen », generated from the plan.
 *
 * Writes `kunden`: asks `kundenname`, `kundentyp`, `email`, `strasse`, `hausnummer`, `plz`, `ort`, `rechnungsadresse_gleich`, `rechnungsstrasse`, `rechnungshausnummer`, `rechnungsplz`, `rechnungsort`, `ansprechpartner_titel`, `ansprechpartner_vorname`, `ansprechpartner_nachname`, `ansprechpartner_email`, `bevorzugte_kontaktart`; sets `anlagedatum` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 2)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useKundeAnlegenFlow({
 *     steps: { kundenname: 1, kundentyp: 1, email: 1, strasse: 1, hausnummer: 1, plz: 1, ort: 1, rechnungsadresse_gleich: 1, rechnungsstrasse: 1, rechnungshausnummer: 1, rechnungsplz: 1, rechnungsort: 1, ansprechpartner_titel: 1, ansprechpartner_vorname: 1, ansprechpartner_nachname: 1, ansprechpartner_email: 1, bevorzugte_kontaktart: 1 },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <Bound form={flow.forms.kunden} name="kundenname" />
 *     <Bound form={flow.forms.kunden} name="kundentyp" />
 *     <Bound form={flow.forms.kunden} name="email" />
 *     <Bound form={flow.forms.kunden} name="strasse" />
 *     <Bound form={flow.forms.kunden} name="hausnummer" />
 *     <Bound form={flow.forms.kunden} name="plz" />
 *     <Bound form={flow.forms.kunden} name="ort" />
 *     <Bound form={flow.forms.kunden} name="rechnungsadresse_gleich" />
 *     <Bound form={flow.forms.kunden} name="rechnungsstrasse" />
 *     <Bound form={flow.forms.kunden} name="rechnungshausnummer" />
 *     <Bound form={flow.forms.kunden} name="rechnungsplz" />
 *     <Bound form={flow.forms.kunden} name="rechnungsort" />
 *     <Bound form={flow.forms.kunden} name="ansprechpartner_titel" />
 *     <Bound form={flow.forms.kunden} name="ansprechpartner_vorname" />
 *     <Bound form={flow.forms.kunden} name="ansprechpartner_nachname" />
 *     <Bound form={flow.forms.kunden} name="ansprechpartner_email" />
 *     <Bound form={flow.forms.kunden} name="bevorzugte_kontaktart" />
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

export type KundeAnlegenFieldKey = 'ansprechpartner_email' | 'ansprechpartner_nachname' | 'ansprechpartner_titel' | 'ansprechpartner_vorname' | 'bevorzugte_kontaktart' | 'email' | 'hausnummer' | 'kundenname' | 'kundentyp' | 'ort' | 'plz' | 'rechnungsadresse_gleich' | 'rechnungshausnummer' | 'rechnungsort' | 'rechnungsplz' | 'rechnungsstrasse' | 'strasse';

export interface KundeAnlegenForms {
  kunden: StepForm<'kunden'>;
}

// Alias so the option generics stay readable.
type Key = KundeAnlegenFieldKey;

export interface KundeAnlegenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
}

const DEFAULT_STEPS: Record<string, number> = {"ansprechpartner_email": 1, "ansprechpartner_nachname": 1, "ansprechpartner_titel": 1, "ansprechpartner_vorname": 1, "bevorzugte_kontaktart": 1, "email": 1, "hausnummer": 1, "kundenname": 1, "kundentyp": 1, "ort": 1, "plz": 1, "rechnungsadresse_gleich": 1, "rechnungshausnummer": 1, "rechnungsort": 1, "rechnungsplz": 1, "rechnungsstrasse": 1, "strasse": 1};
export const KUNDEANLEGEN_REVIEW_STEP = 2;

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

export function useKundeAnlegenFlow(options: KundeAnlegenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const kunden = useStepForm('kunden', {
    fields: ["kundenname", "kundentyp", "email", "strasse", "hausnummer", "plz", "ort", "rechnungsadresse_gleich", "rechnungsstrasse", "rechnungshausnummer", "rechnungsplz", "rechnungsort", "ansprechpartner_titel", "ansprechpartner_vorname", "ansprechpartner_nachname", "ansprechpartner_email", "bevorzugte_kontaktart"],
    steps: only(steps, ["kundenname", "kundentyp", "email", "strasse", "hausnummer", "plz", "ort", "rechnungsadresse_gleich", "rechnungsstrasse", "rechnungshausnummer", "rechnungsplz", "rechnungsort", "ansprechpartner_titel", "ansprechpartner_vorname", "ansprechpartner_nachname", "ansprechpartner_email", "bevorzugte_kontaktart"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["kundenname", "kundentyp", "email", "strasse", "hausnummer", "plz", "ort", "rechnungsadresse_gleich", "rechnungsstrasse", "rechnungshausnummer", "rechnungsplz", "rechnungsort", "ansprechpartner_titel", "ansprechpartner_vorname", "ansprechpartner_nachname", "ansprechpartner_email", "bevorzugte_kontaktart"]),
    messages: only(options.messages as Record<string, string> | undefined, ["kundenname", "kundentyp", "email", "strasse", "hausnummer", "plz", "ort", "rechnungsadresse_gleich", "rechnungsstrasse", "rechnungshausnummer", "rechnungsplz", "rechnungsort", "ansprechpartner_titel", "ansprechpartner_vorname", "ansprechpartner_nachname", "ansprechpartner_email", "bevorzugte_kontaktart"]),
  });
  const forms: KundeAnlegenForms = { kunden };
  const formList: StepForm[] = [kunden];

  const picks = {
  };

  const plan: PlanStep[] = [
    {
      key: 'kunden', entity: 'kunden', form: kunden, primary: true,      values: (): FormValues => ({
        anlagedatum: todayIso(),
      }),
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'kunde-anlegen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: KundeAnlegenFieldKey) => {
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
  const pickMany = (field: KundeAnlegenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'kunde-anlegen' as const,
    draftKey: 'kunde-anlegen' as const,
    entity: 'kunden' as const,
    form: kunden,
    forms, formList, picks, submit, steps,
    reviewStep: KUNDEANLEGEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
  };
}

export type KundeAnlegenFlow = ReturnType<typeof useKundeAnlegenFlow>;
