/**
 * useAngebotStatusAendernFlow — the plumbing of the flow « Angebotsstatus ändern », generated from the plan.
 *
 * Changes `angebote`: the record to change is picked (`flow.pick('angebote')`), the form is prefilled with its values; asks `angebotsstatus`.
Changes `projekte` (only when the person fills it): the record to change is picked (`flow.pick('projekte')`), the form is prefilled with its values; asks `projektstatus`.
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
 *   const flow = useAngebotStatusAendernFlow({
 *     steps: { angebote: 1, projekte: 2, angebotsstatus: 3, projektstatus: 3 },
 *     items: { angebote: r => ({ id: r.id, title: fieldText(r, 'dauer') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.angebote.select} {...flow.pick('angebote')} />
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.projekte.select} {...flow.pick('projekte')} />
 *     <Bound form={flow.forms.angebote} name="angebotsstatus" />
 *     <Bound form={flow.forms.projekte} name="projektstatus" />
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
import { entityLabel } from '@/lib/journey/rules';
export type AngebotStatusAendernFieldKey = 'angebote' | 'angebotsstatus' | 'projekte' | 'projektstatus';

export interface AngebotStatusAendernForms {
  angebote: StepForm<'angebote'>;
  projekte: StepForm<'projekte'>;
}

// Alias so the option generics stay readable.
type Key = AngebotStatusAendernFieldKey;

export interface AngebotStatusAendernFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    angebote?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    projekte?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"angebote": 1, "angebotsstatus": 3, "projekte": 2, "projektstatus": 3};
export const ANGEBOTSTATUSAENDERN_REVIEW_STEP = 4;

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

export function useAngebotStatusAendernFlow(options: AngebotStatusAendernFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const [angeboteTargetId, setAngeboteTargetId] = useState<string | null>(null);
  const [projekteTargetId, setProjekteTargetId] = useState<string | null>(null);
  const angebote = useStepForm('angebote', {
    fields: ["angebotsstatus"],
    steps: only(steps, ["angebotsstatus"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["angebotsstatus"]),
    messages: only(options.messages as Record<string, string> | undefined, ["angebotsstatus"]),
  });
  const projekte = useStepForm('projekte', {
    fields: ["projektstatus"],
    steps: only(steps, ["projektstatus"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["projektstatus"]),
    messages: only(options.messages as Record<string, string> | undefined, ["projektstatus"]),
  });
  const forms: AngebotStatusAendernForms = { angebote, projekte };
  const formList: StepForm[] = [angebote, projekte];

  const picks = {
    angebote: useRecordSearch(servicePort, 'angebote', {
      searchFields: ["dauer"] as never,
      toItem: options.items?.angebote as never,
    }),
    projekte: useRecordSearch(servicePort, 'projekte', {
      searchFields: ["projektkennung"] as never,
      toItem: options.items?.projekte as never,
    }),
  };

  const projekteFilled = hasValues(projekte);
  const plan: PlanStep[] = [
    {
      key: 'angebote', entity: 'angebote', form: angebote,
      updates: () => angeboteTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => angeboteTargetId
        ? { key: 'target:angebote', label: entityLabel('angebote'), value: picks.angebote.labelOf(angeboteTargetId) ?? angeboteTargetId, step: steps.angebote }
        : undefined,    },
    ...(projekteFilled ? [{
      key: 'projekte', entity: 'projekte', form: projekte, primary: true,
      updates: () => projekteTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => projekteTargetId
        ? { key: 'target:projekte', label: entityLabel('projekte'), value: picks.projekte.labelOf(projekteTargetId) ?? projekteTargetId, step: steps.projekte }
        : undefined,    } as PlanStep] : []),
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'angebot-status-aendern' });

  /** The record(s) this flow CHANGES: picked through {...flow.picks.<entity>.select} {...flow.pick('<entity>')};
   *  picking prefills the form with the record's current values, and the plan step updates that record. */
  const targets = {
    angebote: {
      selectedId: angeboteTargetId,
      onSelect: (id: string) => {
        setAngeboteTargetId(id);
        const rec = picks.angebote.recordOf(id);
        if (rec) angebote.reset({ angebotsstatus: fieldLookup(rec, "angebotsstatus")?.key, });
      },
      get record(): JourneyRecord | undefined { return angeboteTargetId ? picks.angebote.recordOf(angeboteTargetId) : undefined; },
    },
    projekte: {
      selectedId: projekteTargetId,
      onSelect: (id: string) => {
        setProjekteTargetId(id);
        const rec = picks.projekte.recordOf(id);
        if (rec) projekte.reset({ projektstatus: fieldLookup(rec, "projektstatus")?.key, });
      },
      get record(): JourneyRecord | undefined { return projekteTargetId ? picks.projekte.recordOf(projekteTargetId) : undefined; },
    },
  };
  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: AngebotStatusAendernFieldKey) => {
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
  const pickMany = (field: AngebotStatusAendernFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    && Object.entries(targets).every(([k, t]) => steps[k] !== n || !!t.selectedId);
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); setAngeboteTargetId(null); setProjekteTargetId(null); };

  return {
    slug: 'angebot-status-aendern' as const,
    draftKey: 'angebot-status-aendern' as const,
    entity: 'projekte' as const,
    form: projekte,
    forms, formList, picks, submit, steps, targets,    reviewStep: ANGEBOTSTATUSAENDERN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
  };
}

export type AngebotStatusAendernFlow = ReturnType<typeof useAngebotStatusAendernFlow>;
