/**
 * useAngebotsstatusAendernFlow — the plumbing of the flow « Angebotsstatus aktualisieren », generated from the plan.
 *
 * Changes `angebote`: the record to change is picked (`flow.pick('angebote')`), the form is prefilled with its values; asks `angebotsstatus`.
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
 *   const flow = useAngebotsstatusAendernFlow({
 *     steps: { angebote: 1, angebotsstatus: 2 },
 *     items: { angebote: r => ({ id: r.id, title: fieldText(r, 'dauer') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.angebote.select} {...flow.pick('angebote')} />
 *     <Bound form={flow.forms.angebote} name="angebotsstatus" />
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
export type AngebotsstatusAendernFieldKey = 'angebote' | 'angebotsstatus';

export interface AngebotsstatusAendernForms {
  angebote: StepForm<'angebote'>;
}

// Alias so the option generics stay readable.
type Key = AngebotsstatusAendernFieldKey;

export interface AngebotsstatusAendernFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    angebote?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"angebote": 1, "angebotsstatus": 2};
export const ANGEBOTSSTATUSAENDERN_REVIEW_STEP = 3;

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

export function useAngebotsstatusAendernFlow(options: AngebotsstatusAendernFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const [angeboteTargetId, setAngeboteTargetId] = useState<string | null>(null);
  const angebote = useStepForm('angebote', {
    fields: ["angebotsstatus"],
    steps: only(steps, ["angebotsstatus"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["angebotsstatus"]),
    messages: only(options.messages as Record<string, string> | undefined, ["angebotsstatus"]),
  });
  const forms: AngebotsstatusAendernForms = { angebote };
  const formList: StepForm[] = [angebote];

  const searches = {
    angebote: useRecordSearch(servicePort, 'angebote', {
      searchFields: ["dauer"] as never,
      toItem: options.items?.angebote as never,
    }),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  const picks = {
    angebote: { ...searches.angebote, select: { ...searches.angebote.select, create: false as boolean } },
  };

  const plan: PlanStep[] = [
    {
      key: 'angebote', entity: 'angebote', form: angebote, primary: true,
      updates: () => angeboteTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => angeboteTargetId
        ? { key: 'target:angebote', label: entityLabel('angebote'), value: picks.angebote.labelOf(angeboteTargetId) ?? angeboteTargetId, step: steps.angebote }
        : undefined,    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'angebotsstatus-aendern' });

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
  };
  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: AngebotsstatusAendernFieldKey) => {
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
  const pickMany = (field: AngebotsstatusAendernFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    && Object.entries(targets).every(([k, t]) => steps[k] !== n || !!t.selectedId);
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); setAngeboteTargetId(null); };

  return {
    slug: 'angebotsstatus-aendern' as const,
    draftKey: 'angebotsstatus-aendern' as const,
    entity: 'angebote' as const,
    form: angebote,
    forms, formList, picks, submit, steps, targets,    reviewStep: ANGEBOTSSTATUSAENDERN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
  };
}

export type AngebotsstatusAendernFlow = ReturnType<typeof useAngebotsstatusAendernFlow>;
