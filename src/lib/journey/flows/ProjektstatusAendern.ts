/**
 * useProjektstatusAendernFlow — the plumbing of the flow « Projektstatus ändern », generated from the plan.
 *
 * Changes `projekte`: the record to change is picked (`flow.pick('projekte')`), the form is prefilled with its values; asks `projektstatus`, `letzter_schritt`.
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
 *   const flow = useProjektstatusAendernFlow({
 *     steps: { projekte: 1, projektstatus: 2, letzter_schritt: 2 },
 *     items: { projekte: r => ({ id: r.id, title: fieldText(r, 'projektkennung') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.projekte.select} {...flow.pick('projekte')} />
 *     <Bound form={flow.forms.projekte} name="projektstatus" />
 *     <Bound form={flow.forms.projekte} name="letzter_schritt" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import { useState } from 'react';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';

export type ProjektstatusAendernFieldKey = 'letzter_schritt' | 'projekte' | 'projektstatus';

export interface ProjektstatusAendernForms {
  projekte: StepForm<'projekte'>;
}

// Alias so the option generics stay readable.
type Key = ProjektstatusAendernFieldKey;

export interface ProjektstatusAendernFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    projekte?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"letzter_schritt": 2, "projekte": 1, "projektstatus": 2};
export const PROJEKTSTATUSAENDERN_REVIEW_STEP = 3;

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

export function useProjektstatusAendernFlow(options: ProjektstatusAendernFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const [projekteTargetId, setProjekteTargetId] = useState<string | null>(null);
  const projekte = useStepForm('projekte', {
    fields: ["projektstatus", "letzter_schritt"],
    steps: only(steps, ["projektstatus", "letzter_schritt"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["projektstatus", "letzter_schritt"]),
    messages: only(options.messages as Record<string, string> | undefined, ["projektstatus", "letzter_schritt"]),
  });
  const forms: ProjektstatusAendernForms = { projekte };
  const formList: StepForm[] = [projekte];

  const picks = {
    projekte: useRecordSearch(servicePort, 'projekte', {
      searchFields: ["projektkennung", "letzter_schritt"] as never,
      toItem: options.items?.projekte as never,
    }),
  };

  const plan: PlanStep[] = [
    {
      key: 'projekte', entity: 'projekte', form: projekte, primary: true,
      updates: () => projekteTargetId ?? undefined,    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'projektstatus-aendern' });

  /** The record(s) this flow CHANGES: picked through {...flow.picks.<entity>.select} {...flow.pick('<entity>')};
   *  picking prefills the form with the record's current values, and the plan step updates that record. */
  const targets = {
    projekte: {
      selectedId: projekteTargetId,
      onSelect: (id: string) => {
        setProjekteTargetId(id);
        const rec = picks.projekte.recordOf(id);
        if (rec) projekte.reset({ projektstatus: fieldLookup(rec, "projektstatus")?.key, letzter_schritt: fieldText(rec, "letzter_schritt"), });
      },
      get record(): JourneyRecord | undefined { return projekteTargetId ? picks.projekte.recordOf(projekteTargetId) : undefined; },
    },
  };
  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: ProjektstatusAendernFieldKey) => {
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
  const pickMany = (field: ProjektstatusAendernFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    && Object.entries(targets).every(([k, t]) => steps[k] !== n || !!t.selectedId);
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); setProjekteTargetId(null); };

  return {
    slug: 'projektstatus-aendern' as const,
    draftKey: 'projektstatus-aendern' as const,
    entity: 'projekte' as const,
    form: projekte,
    forms, formList, picks, submit, steps, targets,    reviewStep: PROJEKTSTATUSAENDERN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
  };
}

export type ProjektstatusAendernFlow = ReturnType<typeof useProjektstatusAendernFlow>;
