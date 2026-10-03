/**
 * useRechnungVersendenFlow — the plumbing of the flow « Rechnung versenden », generated from the plan.
 *
 * Changes `rechnungen`: the record to change is picked (`flow.pick('rechnungen')`), the form is prefilled with its values; asks `rechnungsstatus`.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 3)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useRechnungVersendenFlow({
 *     steps: { rechnungen: 1, rechnungsstatus: 2 },
 *     items: { rechnungen: r => ({ id: r.id, title: fieldText(r, 'rechnungsnummer') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.rechnungen.select} {...flow.pick('rechnungen')} />
 *     <Bound form={flow.forms.rechnungen} name="rechnungsstatus" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import { useState } from 'react';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';
export type RechnungVersendenFieldKey = 'rechnungen' | 'rechnungsstatus';

export interface RechnungVersendenForms {
  rechnungen: StepForm<'rechnungen'>;
}

// Alias so the option generics stay readable.
type Key = RechnungVersendenFieldKey;

export interface RechnungVersendenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    rechnungen?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"rechnungen": 1, "rechnungsstatus": 2};
export const RECHNUNGVERSENDEN_REVIEW_STEP = 3;

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

export function useRechnungVersendenFlow(options: RechnungVersendenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const [rechnungenTargetId, setRechnungenTargetId] = useState<string | null>(null);
  const rechnungen = useStepForm('rechnungen', {
    fields: ["rechnungsstatus"],
    steps: only(steps, ["rechnungsstatus"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["rechnungsstatus"]),
    messages: only(options.messages as Record<string, string> | undefined, ["rechnungsstatus"]),
  });
  const forms: RechnungVersendenForms = { rechnungen };
  const formList: StepForm[] = [rechnungen];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    rechnungen: useRecordSearch(servicePort, 'rechnungen', withPickPolicy('rechnungen', {
      searchFields: ["rechnungsnummer"] as never,
      filter: "r.v_rechnungsstatus == 'entwurf' or r.v_rechnungsstatus == 'versendet'",
      where: (r: JourneyRecord) => (fieldLookup(r, "rechnungsstatus")?.key ?? null) === "entwurf" || (fieldLookup(r, "rechnungsstatus")?.key ?? null) === "versendet",
      toItem: options.items?.rechnungen as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:rechnung-versenden:read:${entity}`);
  const picks = {
    rechnungen: { ...searches.rechnungen, select: { ...searches.rechnungen.select, create: false as boolean, hint: hintFor('rechnungen', 'rechnungen', {"conditions": [{"field": "rechnungsstatus", "op": "eq", "value": "entwurf"}, {"field": "rechnungsstatus", "op": "eq", "value": "versendet"}], "mode": "any"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'rechnungen', entity: 'rechnungen', form: rechnungen, primary: true,
      updates: () => rechnungenTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => rechnungenTargetId
        ? { key: 'target:rechnungen', label: entityLabel('rechnungen'), value: picks.rechnungen.labelOf(rechnungenTargetId) ?? rechnungenTargetId, step: steps.rechnungen }
        : undefined,    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'rechnung-versenden' });

  /** The record(s) this flow CHANGES: picked through {...flow.picks.<entity>.select} {...flow.pick('<entity>')};
   *  picking prefills the form with the record's current values, and the plan step updates that record. */
  const targets = {
    rechnungen: {
      selectedId: rechnungenTargetId,
      onSelect: (id: string) => {
        setRechnungenTargetId(id);
        const rec = picks.rechnungen.recordOf(id);
        if (rec) rechnungen.reset({ rechnungsstatus: fieldLookup(rec, "rechnungsstatus")?.key, });
      },
      get record(): JourneyRecord | undefined { return rechnungenTargetId ? picks.rechnungen.recordOf(rechnungenTargetId) : undefined; },
    },
  };
  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: RechnungVersendenFieldKey) => {
    if (field in targets) {
      const t = targets[field as keyof typeof targets];
      return { selectedId: t.selectedId, onSelect: t.onSelect };
    }
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
  const pickMany = (field: RechnungVersendenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    && Object.entries(targets).every(([k, t]) => steps[k] !== n || !!t.selectedId);
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); setRechnungenTargetId(null); };

  return {
    slug: 'rechnung-versenden' as const,
    draftKey: 'rechnung-versenden' as const,
    entity: 'rechnungen' as const,
    form: rechnungen,
    forms, formList, picks, submit, steps, targets,    reviewStep: RECHNUNGVERSENDEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
  };
}

export type RechnungVersendenFlow = ReturnType<typeof useRechnungVersendenFlow>;
