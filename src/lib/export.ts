/**
 * export.ts — the download helper. Records in, file out.
 *
 * The plan's `exports` sort lands here: a wish like "die Rechnungen in einer
 * zeitlich strukturierten Exceltabelle" is not a Werkzeug (a Werkzeug writes
 * fields of one record; a table over all invoices writes nothing), so it
 * arrives as a button on the overview that calls `downloadCsv`.
 *
 * Anatomy it owns, so it cannot degrade between builds:
 *   · BOM + CRLF — without the leading BOM Excel reads UTF-8 as Latin-1 and
 *     every umlaut is broken
 *   · locale-paired separator and decimals: de/cs write `;` with comma
 *     decimals, en writes `,` with dot decimals (both open by double-click)
 *   · quoting and escaping of anything containing the separator, a quote or
 *     a newline
 *   · scalars out of LA field values: a lookup writes its LABEL, a boolean
 *     writes Ja/Nein in the reader's language, an empty value writes nothing
 *   · `groupBy` becomes a leading COLUMN and the sort key, never a section
 *     header — a flat table is what Excel can filter, sort and pivot; a file
 *     cut into sections looks structured and cannot be worked with
 *   · a dated filename (`rechnungen-2026-09-22.csv`)
 *   · the object URL is revoked after the click
 *
 * What the consumer supplies: the rows, and per column a label plus how to
 * read the value. A reference field has no readable value on the record (it
 * is a URL) — resolve it through the entity map in `value`.
 *
 *   import { downloadCsv } from '@/lib/export';
 *
 *   downloadCsv(rechnungen, [
 *     { key: 'rechnungsnummer', label: tx('Rechnungsnummer') },
 *     { key: 'rechnungsdatum',  label: tx('Datum') },
 *     { key: 'kunde',           label: tx('Kunde'),
 *       value: r => kundenMap.get(extractRecordId(r.fields.kunde) ?? '')?.fields.kundenname },
 *     { key: 'gesamtbetrag',    label: tx('Gesamtbetrag') },
 *   ], {
 *     filename: 'rechnungen',
 *     groupBy: { label: tx('Jahr'), value: r => r.fields.rechnungsjahr },
 *   });
 */
import { coreLocale } from '@/i18n';

/** One column of the file. `value` defaults to the record's own field. */
export interface ExportColumn<T> {
  /** The LA field key — also the default way to read the value. */
  key: string;
  /** The column heading, exactly as a person should read it. */
  label: string;
  /** Read the value yourself when it does not sit in `fields[key]` (a
   *  reference to another record, a computed sum, a joined name). */
  value?: (row: T) => unknown;
}

export interface ExportOptions<T> {
  /** Base of the file name; the date and `.csv` are appended. Default `export`. */
  filename?: string;
  /** Becomes the FIRST column and the sort key — the plan's `group_by`. */
  groupBy?: { label: string; value: (row: T) => unknown };
}

type Scalar = string | number | boolean | null | undefined;

/** LA field values are not all scalars: a lookup is an object, a multi-lookup
 *  an array of them, an attachment a record. Reduce to what belongs in a cell. */
function scalarOf(raw: unknown): Scalar {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return raw;
  if (Array.isArray(raw)) return raw.map(v => String(scalarOf(v) ?? '')).filter(Boolean).join(' | ');
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (typeof o.label === 'string') return o.label;     // LookupValue
    if (typeof o.key === 'string') return o.key;
    return '';
  }
  return String(raw);
}

function cell(raw: unknown, sep: string): string {
  const s = scalarOf(raw);
  if (s === null || s === undefined) return '';
  let text: string;
  if (typeof s === 'boolean') text = s ? (coreLocale === 'en' ? 'Yes' : 'Ja') : (coreLocale === 'en' ? 'No' : 'Nein');
  else if (typeof s === 'number' && coreLocale !== 'en') text = String(s).replace('.', ',');
  else text = String(s);
  return text.includes(sep) || text.includes('"') || text.includes('\n')
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

/**
 * The file's TEXT, without the browser. Separate from `downloadCsv` so the
 * semantics (separator, escaping, grouping order) can be tested without a DOM;
 * a page normally calls `downloadCsv`.
 */
export function csvText<T>(rows: T[], columns: ExportColumn<T>[], options: ExportOptions<T> = {}): string {
  const sep = coreLocale === 'en' ? ',' : ';';
  const { groupBy } = options;
  const read = (col: ExportColumn<T>, row: T): unknown =>
    col.value ? col.value(row) : (row as unknown as { fields?: Record<string, unknown> })?.fields?.[col.key];

  const ordered = groupBy
    ? [...rows].sort((a, b) =>
        String(scalarOf(groupBy.value(a)) ?? '').localeCompare(String(scalarOf(groupBy.value(b)) ?? ''),
                                                               undefined, { numeric: true }))
    : rows;

  const head = (groupBy ? [groupBy.label] : []).concat(columns.map(c => c.label));
  const lines = [head.map(h => cell(h, sep)).join(sep)];
  for (const row of ordered) {
    const cells = groupBy ? [cell(groupBy.value(row), sep)] : [];
    for (const col of columns) cells.push(cell(read(col, row), sep));
    lines.push(cells.join(sep));
  }

  return lines.join('\r\n');
}

/**
 * Write `rows` to a CSV the reader downloads. Returns the number of data rows
 * written, so a caller can report "142 Rechnungen exportiert".
 */
export function downloadCsv<T>(rows: T[], columns: ExportColumn<T>[], options: ExportOptions<T> = {}): number {
  const { filename = 'export' } = options;
  const stamp = new Date().toISOString().slice(0, 10);
  // The BOM is not decoration: without it Excel reads the file as Latin-1.
  const blob = new Blob(['\ufeff' + csvText(rows, columns, options)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return rows.length;
}
