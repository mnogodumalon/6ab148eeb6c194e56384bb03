/**
 * useProjektAnlegenFlow — the plumbing of the flow « Projekt anlegen », generated from the plan.
 *
 * Writes `projekte`: asks `projektart`, `projektstart_jahr`, `projektstart_monat`, `kunde`, `ansprechpartner_kunde`, `projektleitung`; sets `projektstatus` itself.
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
 *
 *   const flow = useProjektAnlegenFlow({
 *     steps: { kunde: 1, projektleitung: 2, projektart: 3, projektstart_jahr: 3, projektstart_monat: 3, ansprechpartner_kunde: 3 },
 *     items: { kunde: r => ({ id: r.id, title: fieldText(r, 'kundenname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.kunde.select} {...flow.pick('kunde')} />
 *     <EntitySelectStep {...flow.picks.projektleitung.select} {...flow.pick('projektleitung')} />
 *     <Bound form={flow.forms.projekte} name="projektart" />
 *     <Bound form={flow.forms.projekte} name="projektstart_jahr" />
 *     <Bound form={flow.forms.projekte} name="projektstart_monat" />
 *     <Bound form={flow.forms.projekte} name="ansprechpartner_kunde" />
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

export type ProjektAnlegenFieldKey = 'ansprechpartner_kunde' | 'kunde' | 'projektart' | 'projektleitung' | 'projektstart_jahr' | 'projektstart_monat';

export interface ProjektAnlegenForms {
  projekte: StepForm<'projekte'>;
}

// Alias so the option generics stay readable.
type Key = ProjektAnlegenFieldKey;

export interface ProjektAnlegenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    kunde?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    projektleitung?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"ansprechpartner_kunde": 3, "kunde": 1, "projektart": 3, "projektleitung": 2, "projektstart_jahr": 3, "projektstart_monat": 3};
export const PROJEKTANLEGEN_REVIEW_STEP = 4;

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

export function useProjektAnlegenFlow(options: ProjektAnlegenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const projekte = useStepForm('projekte', {
    fields: ["projektart", "projektstart_jahr", "projektstart_monat", "kunde", "ansprechpartner_kunde", "projektleitung"],
    steps: only(steps, ["projektart", "projektstart_jahr", "projektstart_monat", "kunde", "ansprechpartner_kunde", "projektleitung"]) as Record<string, number>,
    // the plan builds a value from these — required here, whatever the app's base view says
    required: { projektart: true, projektstart_jahr: true },
    initial: only(options.initial as FormValues | undefined, ["projektart", "projektstart_jahr", "projektstart_monat", "kunde", "ansprechpartner_kunde", "projektleitung"]),
    messages: only(options.messages as Record<string, string> | undefined, ["projektart", "projektstart_jahr", "projektstart_monat", "kunde", "ansprechpartner_kunde", "projektleitung"]),
  });
  const forms: ProjektAnlegenForms = { projekte };
  const formList: StepForm[] = [projekte];

  const picks = {
    kunde: useRecordSearch(servicePort, 'kunden', {
      searchFields: ["kundenname"] as never,
      toItem: options.items?.kunde as never,
    }),
    projektleitung: useRecordSearch(servicePort, 'berater', {
      searchFields: ["vorname", "nachname"] as never,
      filter: "r.v_status == 'aktiv'",
      where: (r: JourneyRecord) => (fieldLookup(r, "status")?.key ?? null) === "aktiv",
      toItem: options.items?.projektleitung as never,
    }),
  };

  const plan: PlanStep[] = [
    {
      key: 'projekte', entity: 'projekte', form: projekte, primary: true,
      values: (): FormValues => ({
        projektstatus: "akquise",
      }),
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'projekt-anlegen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: ProjektAnlegenFieldKey) => {
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
  const pickMany = (field: ProjektAnlegenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'projekt-anlegen' as const,
    draftKey: 'projekt-anlegen' as const,
    entity: 'projekte' as const,
    form: projekte,
    forms, formList, picks, submit, steps,    reviewStep: PROJEKTANLEGEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
  };
}

export type ProjektAnlegenFlow = ReturnType<typeof useProjektAnlegenFlow>;
