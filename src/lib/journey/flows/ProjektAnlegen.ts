/**
 * useProjektAnlegenFlow — the plumbing of the flow « Projekt anlegen », generated from the plan.
 *
 * Writes `projekte`: asks `kunde`, `projektart`, `kostenstelle`, `projektleitung`, `letzter_schritt`, `projektstart_jahr`, `projektstart_monat`, `ansprechpartner_kunde`; sets `projektstatus` itself.
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
 *             but leaves the rule to you: `projektkennung` (derived:computed:Startjahr, Kürzel der Projektart und laufende Projektnummer, z. B. 2026-IT-0104) *
 *   const flow = useProjektAnlegenFlow({
 *     steps: { kunde: 1, projektleitung: 2, projektart: 3, kostenstelle: 3, letzter_schritt: 3, projektstart_jahr: 3, projektstart_monat: 3, ansprechpartner_kunde: 3 },
 *     items: { kunde: r => ({ id: r.id, title: fieldText(r, 'kundenname') }) },
 *     compute: { projektkennung: forms => null },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.kunde.select} {...flow.pick('kunde')} />
 *     <EntitySelectStep {...flow.picks.projektleitung.select} {...flow.pick('projektleitung')} />
 *     <Bound form={flow.forms.projekte} name="projektart" />
 *     <Bound form={flow.forms.projekte} name="kostenstelle" />
 *     <Bound form={flow.forms.projekte} name="letzter_schritt" />
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
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
export type ProjektAnlegenFieldKey = 'ansprechpartner_kunde' | 'kostenstelle' | 'kunde' | 'letzter_schritt' | 'projektart' | 'projektleitung' | 'projektstart_jahr' | 'projektstart_monat';

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
  /** The plan computes these in the flow but leaves the rule to the page. */
  compute: {
    projektkennung: (forms: ProjektAnlegenForms) => unknown;   // derived:computed:Startjahr, Kürzel der Projektart und laufende Projektnummer, z. B. 2026-IT-0104
  };
}

const DEFAULT_STEPS: Record<string, number> = {"ansprechpartner_kunde": 3, "kostenstelle": 3, "kunde": 1, "letzter_schritt": 3, "projektart": 3, "projektleitung": 2, "projektstart_jahr": 3, "projektstart_monat": 3};
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

export function useProjektAnlegenFlow(options: ProjektAnlegenFlowOptions) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const projekte = useStepForm('projekte', {
    fields: ["kunde", "projektart", "kostenstelle", "projektleitung", "letzter_schritt", "projektstart_jahr", "projektstart_monat", "ansprechpartner_kunde"],
    steps: only(steps, ["kunde", "projektart", "kostenstelle", "projektleitung", "letzter_schritt", "projektstart_jahr", "projektstart_monat", "ansprechpartner_kunde"]) as Record<string, number>,
    // the plan builds a value from these — required here, whatever the app's base view says
    required: { projektart: true, projektstart_jahr: true },
    initial: only(options.initial as FormValues | undefined, ["kunde", "projektart", "kostenstelle", "projektleitung", "letzter_schritt", "projektstart_jahr", "projektstart_monat", "ansprechpartner_kunde"]),
    messages: only(options.messages as Record<string, string> | undefined, ["kunde", "projektart", "kostenstelle", "projektleitung", "letzter_schritt", "projektstart_jahr", "projektstart_monat", "ansprechpartner_kunde"]),
  });
  const forms: ProjektAnlegenForms = { projekte };
  const formList: StepForm[] = [projekte];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    kunde: useRecordSearch(servicePort, 'kunden', withPickPolicy('kunde', {
      searchFields: ["kundenname", "ort"] as never,
      toItem: options.items?.kunde as never,
    })),
    projektleitung: useRecordSearch(servicePort, 'berater', withPickPolicy('projektleitung', {
      searchFields: ["vorname", "nachname"] as never,
      filter: "r.v_status == 'aktiv'",
      where: (r: JourneyRecord) => (fieldLookup(r, "status")?.key ?? null) === "aktiv",
      toItem: options.items?.projektleitung as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:projekt-anlegen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:projekt-anlegen:write:${entity}.${field}`,
  });
  const picks = {
    kunde: { ...searches.kunde, select: { ...searches.kunde.select, create: true as boolean, hint: hintFor('kunde', 'kunden', null as PickWhere | null) } },
    projektleitung: { ...searches.projektleitung, select: { ...searches.projektleitung.select, create: true as boolean, hint: hintFor('projektleitung', 'berater', {"conditions": [{"field": "status", "op": "eq", "value": "aktiv"}], "mode": "all"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'projekte', entity: 'projekte', form: projekte, primary: true,
      values: (): FormValues => ({
        projektstatus: policyFixedValue('projekte', 'projektstatus') ?? "akquise",
        projektkennung: options.compute.projektkennung(forms),
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('projekte', 'projektstatus', policyFixedValue('projekte', 'projektstatus') ?? "akquise")],

      // the planner's assumptions that first act here — shown once with „Passt“ / „ändern“
      notices: () => [{"assumed": "Jahr-Artk\u00fcrzel-Nummer, z. B. 2026-IT-0104", "id": "projektkennung-format", "question": "Wie soll die Projektkennung aufgebaut sein?"}],
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
