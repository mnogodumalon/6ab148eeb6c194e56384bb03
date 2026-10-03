import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { IconAlertTriangle, IconPlus } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { EnrichedRechnungen, EnrichedAngebote } from '@/types/enriched';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { Button } from '@/components/ui/button';
import { KanbanWidget, type KanbanCard } from '@/components/widgets/KanbanWidget';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';
import type { Zeiterfassung } from '@/types/app';

type Period = 'month' | 'quarter' | 'year';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { projekte, setProjekte, setAngebote, setRechnungen, fetchAll } = data;
  const clock = useClock();
  const [period, setPeriod] = useState<Period>('month');
  const [angebotFilter, setAngebotFilter] = useState<'all' | 'versendet'>('all');

  // ---- shared write helpers: optimistic first, PATCH in background, Undo ----
  const setRechnungStatus = (id: string, key: string, msg: string) => {
    const prev = data.rechnungen.find(r => r.record_id === id)?.fields.rechnungsstatus;
    setRechnungen(list => list.map(r => r.record_id === id
      ? { ...r, fields: { ...r.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', key) } } : r));
    LivingAppsService.updateRechnungenEntry(id, { rechnungsstatus: key }).catch(() => fetchAll());
    undoToast(msg, () => {
      setRechnungen(list => list.map(r => r.record_id === id ? { ...r, fields: { ...r.fields, rechnungsstatus: prev } } : r));
      LivingAppsService.updateRechnungenEntry(id, { rechnungsstatus: prev?.key }).catch(() => fetchAll());
    });
  };
  const setAngebotStatus = (id: string, key: string, msg: string) => {
    const prev = data.angebote.find(r => r.record_id === id)?.fields.angebotsstatus;
    setAngebote(list => list.map(r => r.record_id === id
      ? { ...r, fields: { ...r.fields, angebotsstatus: lookupOption('angebote', 'angebotsstatus', key) } } : r));
    LivingAppsService.updateAngeboteEntry(id, { angebotsstatus: key }).catch(() => fetchAll());
    undoToast(msg, () => {
      setAngebote(list => list.map(r => r.record_id === id ? { ...r, fields: { ...r.fields, angebotsstatus: prev } } : r));
      LivingAppsService.updateAngeboteEntry(id, { angebotsstatus: prev?.key }).catch(() => fetchAll());
    });
  };
  const setProjektStatus = (id: string, key: string, msg: string) => {
    const prev = projekte.find(r => r.record_id === id)?.fields.projektstatus;
    setProjekte(list => list.map(r => r.record_id === id
      ? { ...r, fields: { ...r.fields, projektstatus: lookupOption('projekte', 'projektstatus', key) } } : r));
    LivingAppsService.updateProjekteEntry(id, { projektstatus: key }).catch(() => fetchAll());
    undoToast(msg, () => {
      setProjekte(list => list.map(r => r.record_id === id ? { ...r, fields: { ...r.fields, projektstatus: prev } } : r));
      LivingAppsService.updateProjekteEntry(id, { projektstatus: prev?.key }).catch(() => fetchAll());
    });
  };

  const nextAngebot: Record<string, { key: string; label: string } | undefined> = {
    entwurf: { key: 'versendet', label: tx('Als versendet markieren') },
    versendet: { key: 'angenommen', label: tx('Als angenommen markieren') },
  };
  const nextProjekt: Record<string, { key: string; label: string } | undefined> = {
    akquise: { key: 'in_bearbeitung', label: tx('Projekt starten') },
    in_bearbeitung: { key: 'abgeschlossen', label: tx('Projekt abschließen') },
  };

  const payRechnung = (r: EnrichedRechnungen) =>
    setRechnungStatus(r.record_id, 'bezahlt', tx`${r.fields.rechnungsnummer ?? ''} — als bezahlt gebucht`);
  const advanceAngebot = (a: EnrichedAngebote) => {
    const n = nextAngebot[lookupKey(a.fields.angebotsstatus) ?? ''];
    if (n) setAngebotStatus(a.record_id, n.key, tx`Angebot ${a.fields.angebotsnummer ?? ''} — ${n.label}`);
  };

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const k = lookupKey(top.record.fields.rechnungsstatus);
        return k === 'versendet' || k === 'ueberfaellig'
          ? { label: tx('Als bezahlt buchen'), onClick: () => payRechnung(top.record) } : undefined;
      }
      if (top.type === 'angebote') {
        const n = nextAngebot[lookupKey(top.record.fields.angebotsstatus) ?? ''];
        return n ? { label: n.label, onClick: () => advanceAngebot(top.record) } : undefined;
      }
      if (top.type === 'projekte') {
        const n = nextProjekt[lookupKey(top.record.fields.projektstatus) ?? ''];
        return n ? { label: n.label, onClick: () => setProjektStatus(top.record.record_id, n.key, tx`Projekt — ${n.label}`) } : undefined;
      }
      return undefined;
    },
  });
  const enrichedProjekte = crud.enriched.projekte;
  const enrichedAngebote = crud.enriched.angebote;
  const enrichedRechnungen = crud.enriched.rechnungen;
  const enrichedZeit = crud.enriched.zeiterfassung;

  const today = format(clock, 'yyyy-MM-dd');
  const curYear = clock.getFullYear();
  const curMonth = clock.getMonth() + 1;
  const curQuarter = Math.floor((curMonth - 1) / 3);

  // ---- hours per period ----
  const inPeriod = (z: Zeiterfassung, p: Period) => {
    const d = z.fields.datum;
    if (!d) return false;
    const y = Number(d.slice(0, 4));
    const m = Number(d.slice(5, 7));
    if (y !== curYear) return false;
    if (p === 'year') return true;
    if (p === 'quarter') return Math.floor((m - 1) / 3) === curQuarter;
    return m === curMonth;
  };
  const hours = useMemo(() => {
    const sum = (p: Period) => zeitSum(enrichedZeit.filter(z => inPeriod(z, p)));
    return { month: sum('month'), quarter: sum('quarter'), year: sum('year') };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichedZeit, curYear, curMonth]);
  const chartRows: ChartRow<(typeof enrichedZeit)[number]>[] = useMemo(
    () => enrichedZeit.filter(z => inPeriod(z, period)).map(z => ({ id: `zeit:${z.record_id}`, data: z })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enrichedZeit, period, curYear, curMonth],
  );

  // ---- invoices ----
  const isOpen = (r: EnrichedRechnungen) => ['versendet', 'ueberfaellig'].includes(lookupKey(r.fields.rechnungsstatus) ?? '');
  const isOverdue = (r: EnrichedRechnungen) =>
    lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig' ||
    (lookupKey(r.fields.rechnungsstatus) === 'versendet' && !!r.fields.faelligkeitsdatum && r.fields.faelligkeitsdatum.slice(0, 10) < today);
  const dueKey = (r: EnrichedRechnungen) => r.fields.faelligkeitsdatum?.slice(0, 10) ?? '9999';
  const openInv = enrichedRechnungen.filter(isOpen);
  const overdue = openInv.filter(isOverdue).sort((a, b) => dueKey(a).localeCompare(dueKey(b)));
  const upcoming = openInv.filter(r => !isOverdue(r)).sort((a, b) => dueKey(a).localeCompare(dueKey(b)));
  const openSum = openInv.reduce((s, r) => s + (r.fields.gesamtbetrag ?? 0), 0);
  const overdueSum = overdue.reduce((s, r) => s + (r.fields.gesamtbetrag ?? 0), 0);

  // ---- offers ----
  const openOffers = enrichedAngebote.filter(a => ['entwurf', 'versendet'].includes(lookupKey(a.fields.angebotsstatus) ?? ''));
  const sentOffers = openOffers.filter(a => lookupKey(a.fields.angebotsstatus) === 'versendet');
  const shownOffers = (angebotFilter === 'versendet' ? sentOffers : openOffers)
    .slice().sort((a, b) => (a.fields.angebotsjahr ?? 0) - (b.fields.angebotsjahr ?? 0) || (a.fields.angebotsnummer ?? 0) - (b.fields.angebotsnummer ?? 0));

  const running = enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung');

  // ---- kanban ----
  const columns = (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
    key: o.key,
    label: o.label,
    tone: (o.key === 'in_bearbeitung' ? 'primary' : o.key === 'abgeschlossen' ? 'success' : 'warning') as 'primary' | 'success' | 'warning',
  }));
  const cards: KanbanCard[] = enrichedProjekte
    .slice()
    .sort((a, b) => (a.fields.projektkennung ?? '').localeCompare(b.fields.projektkennung ?? ''))
    .map(p => ({
      id: p.record_id,
      column: lookupKey(p.fields.projektstatus) ?? '',
      title: p.fields.projektkennung ?? p.kundeName,
      subtitle: [p.kundeName, p.projektleitungName].filter(Boolean).join(' · '),
    }));

  const onCardMove = (cardId: string, col: string) => {
    const label = columns.find(c => c.key === col)?.label ?? col;
    setProjektStatus(cardId, col, tx`Projekt verschoben — ${label}`);
  };

  // ---- header context line ----
  const monthName = format(clock, 'LLLL', { locale: dateFnsLocale() });
  let context: string;
  if (overdue.length > 0) {
    const who = namen(overdue.map(r => r.kundeName || ''));
    context = tx`${who} ${overdue.length === 1 ? tx('hat eine überfällige Rechnung') : tx('haben überfällige Rechnungen')}.`;
  } else if (running.length > 0) {
    const proj = namen(running.map(p => p.fields.projektkennung || p.kundeName || ''));
    context = tx`Aktuell laufen ${proj} — im ${monthName} sind ${formatH(hours.month)} Stunden gebucht.`;
  } else if (sentOffers.length > 0) {
    const kunden = namen(sentOffers.map(a => a.projektName || ''));
    context = tx`Angebote warten auf Antwort: ${kunden}.`;
  } else {
    context = tx`Alles im grünen Bereich — im ${monthName} sind ${formatH(hours.month)} Stunden gebucht.`;
  }

  const periodLabel = period === 'month' ? tx('diesen Monat') : period === 'quarter' ? tx('dieses Quartal') : tx('dieses Jahr');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        <Button onClick={() => crud.projekte.openCreate({ projektstatus: 'akquise' })}>
          <IconPlus size={16} className="shrink-0" />
          <span>{tx('Neues Projekt')}</span>
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={overdue.length > 0 && (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={{ label: tx('Älteste als bezahlt buchen'), onClick: () => payRechnung(overdue[0]) }}
          >
            <b>{namen(overdue.map(r => r.kundeName || r.fields.rechnungsnummer || ''))}</b>{' '}
            {tx`— ${overdue.length} überfällig, zusammen ${formatCurrency(overdueSum)}. Älteste: ${overdue[0].fields.rechnungsnummer ?? ''}, fällig seit ${formatDate(overdue[0].fields.faelligkeitsdatum)}.`}
          </HeroBanner>
        )}
        kpis={(
          <StatStrip>
            <StatStripItem
              title={tx('Stunden Monat')} value={formatH(hours.month)}
              tone={period === 'month' ? 'primary' : 'default'}
              onClick={() => setPeriod('month')} active={period === 'month'}
            />
            <StatStripItem
              title={tx('Stunden Quartal')} value={formatH(hours.quarter)}
              tone={period === 'quarter' ? 'primary' : 'default'}
              onClick={() => setPeriod('quarter')} active={period === 'quarter'}
            />
            <StatStripItem
              title={tx('Stunden Jahr')} value={formatH(hours.year)}
              tone={period === 'year' ? 'primary' : 'default'}
              onClick={() => setPeriod('year')} active={period === 'year'}
            />
            <StatStripItem
              title={tx('Beim Kunden')} value={sentOffers.length}
              onClick={() => setAngebotFilter(f => f === 'versendet' ? 'all' : 'versendet')}
              active={angebotFilter === 'versendet'}
            />
            <StatStripItem title={tx('Offene Posten')} value={formatCurrency(openSum)} />
          </StatStrip>
        )}
        primary={(
          <KanbanWidget
            cards={cards}
            columns={columns}
            onCardClick={c => {
              const rec = projekte.find(p => p.record_id === c.id);
              if (rec) crud.projekte.openDetail(rec);
            }}
            onCardMove={onCardMove}
            onAddCard={col => crud.projekte.openCreate({ projektstatus: col })}
          />
        )}
        aside={(
          <>
            <ChartWidget<(typeof enrichedZeit)[number]>
              title={tx`Berater-Stunden ${periodLabel}`}
              rows={chartRows}
              dimension={{ kind: 'category', accessor: r => r.data.beraterName || null, label: appLabel('berater') }}
              measure={{ aggregate: 'sum', label: tx('Stunden'), value: r => r.data.fields.stunden ?? null, format: 'number' }}
              interaction={{
                mode: 'drill',
                onSegmentClick: seg => {
                  const id = seg.rowIds[0]?.split(':')[1];
                  const rec = data.zeiterfassung.find(z => z.record_id === id);
                  if (rec) crud.zeiterfassung.openDetail(rec);
                },
              }}
            />
            <WorkList
              title={tx('Rechnungen — Zahlung offen')}
              items={upcoming.map(r => ({
                id: r.record_id,
                title: r.kundeName || r.fields.rechnungsnummer || '',
                secondLine: (
                  <>
                    <span className="font-medium text-amber-600">{r.fields.rechnungsstatus?.label}</span>
                    <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag)} · {tx('fällig')} {formatDate(r.fields.faelligkeitsdatum)}</span>
                  </>
                ),
                action: { label: tx('✓ Bezahlt'), onClick: () => payRechnung(r) },
              }))}
              onItemClick={id => {
                const rec = data.rechnungen.find(r => r.record_id === id);
                if (rec) crud.rechnungen.openDetail(rec);
              }}
              empty={{ text: tx('Keine offenen Rechnungen — Zeit für die nächste Abrechnung.'), action: { label: tx('Rechnung anlegen'), onClick: () => crud.rechnungen.openCreate({ rechnungsstatus: 'entwurf' }) } }}
            />
            <WorkList
              title={angebotFilter === 'versendet' ? tx('Angebote — warten auf Antwort') : tx('Offene Angebote')}
              items={shownOffers.map(a => {
                const n = nextAngebot[lookupKey(a.fields.angebotsstatus) ?? ''];
                return {
                  id: a.record_id,
                  title: `${a.fields.angebotsjahr ?? ''}-${a.fields.angebotsnummer ?? ''} ${a.projektName ?? ''}`.trim(),
                  secondLine: (
                    <>
                      <span className="font-medium text-primary">{a.fields.angebotsstatus?.label}</span>
                      <span className="text-muted-foreground"> · {formatCurrency(a.fields.kostenbetrag)}</span>
                    </>
                  ),
                  action: n ? { label: tx('✓ Weiter'), onClick: () => advanceAngebot(a) } : undefined,
                };
              })}
              onItemClick={id => {
                const rec = data.angebote.find(a => a.record_id === id);
                if (rec) crud.angebote.openDetail(rec);
              }}
              empty={{ text: tx('Keine offenen Angebote.'), action: { label: tx('Angebot anlegen'), onClick: () => crud.angebote.openCreate({ angebotsstatus: 'entwurf', angebotsjahr: curYear }) } }}
            />
          </>
        )}
      />
      {crud.surfaces}
    </div>
  );
}

function zeitSum(list: { fields: { stunden?: number } }[]) {
  return list.reduce((s, z) => s + (z.fields.stunden ?? 0), 0);
}

function formatH(h: number) {
  return `${(Math.round(h * 10) / 10).toLocaleString('de-DE')} h`;
}
