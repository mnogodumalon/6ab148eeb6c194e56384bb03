import { format } from 'date-fns';
import { extractRecordId } from '@/services/livingAppsService';

export interface FieldOrderEntry {
  row: string[];
  cols?: string;
}

export type FieldOrderItem = string | FieldOrderEntry;

export interface DefaultConfig {
  kind: 'today' | 'todayOffset' | 'literal' | 'lookup';
  days?: number;
  value?: unknown;
  key?: string;
  label?: string;
  withTime?: boolean;
}

export interface NumberFieldConfig {
  allowNegative?: boolean;
  max?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComputedValue = string | ((_fields: Record<string, unknown>, _ctx: ComputeContext) => number | null) | Record<string, any>;

// ComputedContext is an alias for ComputeContext (dialogs import both spellings)
export type ComputedContext = ComputeContext;

export interface ComputeContext {
  num?(key: string): number;
  field?(key: string): unknown;
  applookup?(ownKey: string, lookupKey: string): number | null;
  applookupAny?(ownKey: string, lookupKey: string): unknown;
  lookupKey?(key: string): string | null;
  dateDiff?(fromKey: string, toKey: string, unit?: 'days' | 'hours'): number | null;
  sumOver?(multilookupKey: string, perItem: (item: any) => number): number;
  /** Internal: the lookup lists available for applookup resolution. */
  lookupLists?: Record<string, any[]>;
}

export interface FormEnhancements {
  fieldOrder: FieldOrderItem[];
  defaults?: Record<string, DefaultConfig>;
  /** Computed fields. Always an object (never undefined at runtime — dialogs call Object.entries on it). */
  computed: Record<string, ComputedValue>;
  numberFields?: Record<string, NumberFieldConfig>;
}

// ─── Runtime Utilities ───────────────────────────────────────────────────────

/**
 * Apply fieldOrder to a set of available field keys, returning an ordered
 * array of FieldOrderItem (strings or row-groups).
 */
export function applyFieldOrder(
  availableKeys: string[],
  fieldOrder: FieldOrderItem[]
): FieldOrderItem[] {
  const available = new Set(availableKeys);
  const seen = new Set<string>();
  const result: FieldOrderItem[] = [];
  for (const item of fieldOrder) {
    if (typeof item === 'string') {
      if (available.has(item) && !seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    } else {
      const rowKeys = item.row.filter(k => available.has(k) && !seen.has(k));
      if (rowKeys.length > 0) {
        rowKeys.forEach(k => seen.add(k));
        result.push(rowKeys.length === 1 ? rowKeys[0] : { row: rowKeys, cols: item.cols });
      }
    }
  }
  // Append any available keys not in fieldOrder
  for (const k of availableKeys) {
    if (!seen.has(k)) result.push(k);
  }
  return result;
}

/**
 * Flatten an ordered list of FieldOrderItems to a flat array of field keys.
 */
export function flattenFieldOrder(ordered: FieldOrderItem[]): string[] {
  const out: string[] = [];
  for (const item of ordered) {
    if (typeof item === 'string') out.push(item);
    else out.push(...item.row);
  }
  return out;
}

/**
 * Apply defaults to an initial set of fields. If the field is already set
 * in initialFields, the default is NOT applied.
 */
export function applyDefaults(
  initialFields: Record<string, unknown>,
  defaults?: Record<string, DefaultConfig>
): Record<string, unknown> {
  if (!defaults) return { ...initialFields };
  const out: Record<string, unknown> = { ...initialFields };
  const today = new Date();
  for (const [key, cfg] of Object.entries(defaults)) {
    if (out[key] !== undefined && out[key] !== null && out[key] !== '') continue;
    switch (cfg.kind) {
      case 'today':
        out[key] = cfg.withTime
          ? format(today, "yyyy-MM-dd'T'HH:mm")
          : format(today, 'yyyy-MM-dd');
        break;
      case 'todayOffset': {
        const d = new Date(today);
        d.setDate(d.getDate() + (cfg.days ?? 0));
        out[key] = cfg.withTime
          ? format(d, "yyyy-MM-dd'T'HH:mm")
          : format(d, 'yyyy-MM-dd');
        break;
      }
      case 'literal':
        out[key] = cfg.value;
        break;
      case 'lookup':
        if (cfg.key) out[key] = { key: cfg.key, label: cfg.label ?? cfg.key };
        break;
    }
  }
  return out;
}

/**
 * Build a ComputeContext from fields + lookupLists.
 * The context is used by evalComputed to resolve field values and applookup targets.
 */
// (internal helper placeholder)


/** Spec-tree node produced by parse-formulas.mjs */
interface SpecNode {
  op?: 'mul' | 'add' | 'sub' | 'div';
  left?: SpecNode;
  right?: SpecNode;
  kind?: 'field' | 'applookup' | 'literal';
  key?: string;
  ownKey?: string;
  lookupKey?: string;
  value?: number;
}

function evalSpec(node: SpecNode, fields: Record<string, unknown>, ctx: ComputeContext): number | null {
  if (node.op) {
    const l = node.left ? evalSpec(node.left, fields, ctx) : null;
    const r = node.right ? evalSpec(node.right, fields, ctx) : null;
    if (l === null || r === null) return null;
    if (node.op === 'mul') return l * r;
    if (node.op === 'add') return l + r;
    if (node.op === 'sub') return l - r;
    if (node.op === 'div') return r === 0 ? null : l / r;
    return null;
  }
  if (node.kind === 'field') {
    const v = fields[node.key ?? ''];
    if (v === undefined || v === null || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (node.kind === 'applookup') {
    const v = ctx.applookup ? ctx.applookup(node.ownKey ?? '', node.lookupKey ?? '') : null;
    return v;
  }
  if (node.kind === 'literal') {
    return typeof node.value === 'number' ? node.value : null;
  }
  return null;
}

/**
 * Evaluate a computed field value given the spec, fields and context.
 * Supports both function-form (Modus 2) and spec-tree-form (Modus 1).
 */
export function evalComputed(
  spec: ComputedValue,
  fields: Record<string, unknown>,
  ctx: ComputeContext
): number | null {
  if (typeof spec === 'function') {
    try { return (spec as (_f: Record<string, unknown>, _c: ComputeContext) => number | null)(fields, ctx); } catch { return null; }
  }
  // String form: should have been parsed by parse-formulas.mjs.
  // Treat as unparsed — return null.
  if (typeof spec === 'string') return null;
  // Spec-tree object (produced by parse-formulas.mjs)
  try { return evalSpec(spec as unknown as SpecNode, fields, ctx); } catch { return null; }
}

/**
 * Return HTML input props for a number field based on the enhancement config.
 */
export function numberInputProps(
  enhancements: FormEnhancements,
  fieldKey: string
): Record<string, unknown> {
  const cfg = enhancements.numberFields?.[fieldKey];
  const props: Record<string, unknown> = { type: 'number', step: 'any' };
  if (cfg?.max !== undefined) props['max'] = cfg.max;
  if (!(cfg?.allowNegative)) props['min'] = 0;
  return props;
}

/**
 * Clamp and parse a number input value according to the enhancement config.
 * Returns a number or undefined (empty input).
 */
export function clampNumberValue(
  enhancements: FormEnhancements,
  fieldKey: string,
  raw: string
): number | undefined {
  if (raw === '' || raw === undefined) return undefined;
  let n = parseFloat(raw);
  if (!Number.isFinite(n)) return undefined;
  const cfg = enhancements.numberFields?.[fieldKey];
  if (!(cfg?.allowNegative) && n < 0) n = 0;
  if (cfg?.max !== undefined && n > cfg.max) n = cfg.max;
  return n;
}

export interface ComputedLayout {
  /** For each input field key, the computed keys that should show as inline hints below it. */
  anchors: Record<string, string[]>;
  /** Computed keys that aggregate into subtotal rows above the final total. */
  aggregates: string[];
  /** The single final total key (e.g. gesamtbetrag), or null. */
  finalTotal: string | null;
}

/**
 * Classify computed keys into layout positions: inline anchors, aggregates,
 * and the final total.
 */
export function classifyComputed(
  enhancements: FormEnhancements,
  inputFields: string[],
  computedDeps: Record<string, string[]>
): ComputedLayout {
  const computed = enhancements.computed ?? {};
  const computedKeys = Object.keys(computed);
  if (computedKeys.length === 0) return { anchors: {}, aggregates: [], finalTotal: null };

  const inputSet = new Set(inputFields);
  const anchors: Record<string, string[]> = {};
  const aggregates: string[] = [];
  let finalTotal: string | null = null;

  // Heuristic: a computed key that depends on exactly one input field → anchor to that field.
  // Others go to aggregates. The "most downstream" key is finalTotal.
  const depSets: Record<string, Set<string>> = {};
  for (const [k, deps] of Object.entries(computedDeps)) {
    depSets[k] = new Set(deps);
  }

  // For computed keys without explicit deps, infer from the spec
  for (const k of computedKeys) {
    if (!depSets[k]) {
      // Assign as aggregate (fallback)
      aggregates.push(k);
      continue;
    }
    const inputDeps = [...depSets[k]].filter(d => inputSet.has(d));
    if (inputDeps.length === 1) {
      const anchor = inputDeps[0];
      if (!anchors[anchor]) anchors[anchor] = [];
      anchors[anchor].push(k);
    } else {
      aggregates.push(k);
    }
  }

  // The final total is the last aggregate, OR the one with the most deps
  if (aggregates.length > 0) {
    finalTotal = aggregates[aggregates.length - 1];
    aggregates.splice(aggregates.length - 1, 1);
  }

  return { anchors, aggregates, finalTotal };
}

/**
 * Extract applookup references from a computed spec tree.
 * Returns: ownKey → [{ lookupKey }]
 */
export function extractApplookupRefs(
  computed?: Record<string, ComputedValue>
): Record<string, { lookupKey: string }[]> {
  if (!computed) return {};
  const result: Record<string, { lookupKey: string }[]> = {};
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const n = node as SpecNode;
    if (n.kind === 'applookup' && n.ownKey && n.lookupKey) {
      if (!result[n.ownKey]) result[n.ownKey] = [];
      if (!result[n.ownKey].some(r => r.lookupKey === n.lookupKey)) {
        result[n.ownKey].push({ lookupKey: n.lookupKey! });
      }
    }
    if (n.left) walk(n.left);
    if (n.right) walk(n.right);
  }
  for (const spec of Object.values(computed)) {
    walk(spec);
  }
  return result;
}

/**
 * Merge two applookup-ref maps, deduplicating by (ownKey, lookupKey).
 */
export function mergeApplookupRefs(
  a: Record<string, { lookupKey: string }[]>,
  b: Record<string, { lookupKey: string }[]>
): Record<string, { lookupKey: string }[]> {
  const result: Record<string, { lookupKey: string }[]> = { ...a };
  for (const [ownKey, refs] of Object.entries(b)) {
    if (!result[ownKey]) result[ownKey] = [];
    for (const ref of refs) {
      if (!result[ownKey].some(r => r.lookupKey === ref.lookupKey)) {
        result[ownKey].push(ref);
      }
    }
  }
  return result;
}

/**
 * Resolve an applookup reference to a numeric value for inline display.
 * Returns null when no record is selected or the field is not numeric.
 */
export function resolveApplookupRef(
  ownKey: string,
  lookupKey: string,
  _fields: Record<string, unknown>,
  ctx: ComputeContext
): number | null {
  try {
    return ctx.applookup ? ctx.applookup(ownKey, lookupKey) : null;
  } catch {
    return null;
  }
}
