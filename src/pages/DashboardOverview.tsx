import { useMemo, useState } from 'react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx, appLabel } from '@/i18n';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget, type KanbanCard, type KanbanColumn } from '@/components/widgets/KanbanWidget';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupOption, LOOKUP_OPTIONS } from '@/types/app';
import type { EnrichedProjekte, EnrichedRechnungen, EnrichedAngebote } from '@/types/enriched';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import {
  IconAlertTriangle,
  IconBriefcase,
  IconClock,
  IconFileInvoice,
  IconPlus,
  IconCheck,
} from '@tabler/icons-react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    berater,
    projekte, setProjekte,
    angebote, setAngebote,
    rechnungen, setRechnungen,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const rec = top.record as EnrichedRechnungen;
        const status = lookupKey(rec.fields.rechnungsstatus);
        if (status === 'versendet') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: () => void markRechnungBezahlt(rec),
          };
        }
      }
      if (top.type === 'angebote') {
        const rec = top.record as EnrichedAngebote;
        const status = lookupKey(rec.fields.angebotsstatus);
        if (status === 'entwurf') {
          return {
            label: tx('Als versendet markieren'),
            onClick: () => void markAngebotVersendet(rec),
          };
        }
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte as EnrichedProjekte[];
  const enrichedRechnungen = crud.enriched.rechnungen as EnrichedRechnungen[];
  const enrichedAngebote = crud.enriched.angebote as EnrichedAngebote[];

  const clock = useClock();
  const today = clock;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Derived data
  const ueberfaelligeRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => {
      const status = lookupKey(r.fields.rechnungsstatus);
      if (status === 'bezahlt' || status === 'storniert') return false;
      if (!r.fields.faelligkeitsdatum) return false;
      return r.fields.faelligkeitsdatum < todayStr;
    }),
    [enrichedRechnungen, todayStr],
  );

  const offeneRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => {
      const status = lookupKey(r.fields.rechnungsstatus);
      return status === 'versendet' || status === 'ueberfaellig';
    }),
    [enrichedRechnungen],
  );

  const offeneAngebote = useMemo(
    () => enrichedAngebote.filter(a => {
      const status = lookupKey(a.fields.angebotsstatus);
      return status === 'entwurf' || status === 'versendet';
    }),
    [enrichedAngebote],
  );

  const stundenAktuellerMonat = useMemo(() => {
    return berater.reduce((sum, b) => sum + (b.fields.stunden_aktueller_monat ?? 0), 0);
  }, [berater]);

  const umsatzOffen = useMemo(() => {
    return offeneRechnungen.reduce((sum, r) => sum + (r.fields.nettobetrag ?? 0), 0);
  }, [offeneRechnungen]);

  const aktiveProjekte = useMemo(
    () => enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung'),
    [enrichedProjekte],
  );

  // Context line
  const contextLine = useMemo(() => {
    if (aktiveProjekte.length === 0 && ueberfaelligeRechnungen.length === 0) {
      return tx('Noch keine Projekte angelegt — leg gleich los.');
    }
    const parts: string[] = [];
    if (aktiveProjekte.length > 0) {
      const names = aktiveProjekte.slice(0, 3).map(p => p.fields.projektkennung ?? p.kundeName ?? '').filter(Boolean);
      parts.push(namen(names));
    }
    if (ueberfaelligeRechnungen.length > 0) {
      const rNames = ueberfaelligeRechnungen.slice(0, 2).map(r => r.kundeName ?? '').filter(Boolean);
      parts.push(namen(rNames));
    }
    return parts.length > 0
      ? tx`${parts.join(' · ')} — aktuelle Übersicht`
      : tx('Alles im Griff — kein dringender Handlungsbedarf.');
  }, [aktiveProjekte, ueberfaelligeRechnungen]);

  // Kanban columns (inside body — locale-aware getters)
  const projektStatusColumns = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? 'primary' : o.key === 'akquise' ? 'warning' : 'default',
    })) as KanbanColumn[],
    [],
  );

  const projektCards = useMemo<KanbanCard[]>(
    () => enrichedProjekte.map(p => {
      const status = lookupKey(p.fields.projektstatus) ?? projektStatusColumns[0]?.key ?? '';
      return {
        id: `projekt:${p.record_id}`,
        column: status,
        title: p.fields.projektkennung ?? p.kundeName ?? tx('Kein Projekt'),
        subtitle: p.kundeName ? p.kundeName : undefined,
        tone: status === 'in_bearbeitung' ? 'primary' : status === 'akquise' ? 'warning' : 'default',
      } as KanbanCard;
    }),
    [enrichedProjekte, projektStatusColumns],
  );

  // Rechnungen chart rows
  const rechnungChartRows = useMemo<ChartRow<EnrichedRechnungen>[]>(
    () => enrichedRechnungen.map(r => ({ id: `rechnung:${r.record_id}`, data: r })),
    [enrichedRechnungen],
  );

  // Workflow helpers
  const markRechnungBezahlt = async (rec: EnrichedRechnungen) => {
    const snapshot = rec.fields.rechnungsstatus;
    const optimistic = lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt');
    setRechnungen(prev =>
      prev.map(r => r.record_id === rec.record_id
        ? { ...r, fields: { ...r.fields, rechnungsstatus: optimistic } }
        : r,
      ),
    );
    undoToast(tx`${rec.kundeName || rec.fields.rechnungsnummer || ''} — als bezahlt markiert`, async () => {
      setRechnungen(prev =>
        prev.map(r => r.record_id === rec.record_id
          ? { ...r, fields: { ...r.fields, rechnungsstatus: snapshot } }
          : r,
        ),
      );
      await LivingAppsService.updateRechnungenEntry(rec.record_id, { rechnungsstatus: lookupKey(snapshot) });
    });
    try {
      await LivingAppsService.updateRechnungenEntry(rec.record_id, { rechnungsstatus: 'bezahlt' });
    } catch {
      fetchAll();
    }
  };

  const markAngebotVersendet = async (rec: EnrichedAngebote) => {
    const snapshot = rec.fields.angebotsstatus;
    const optimistic = lookupOption('angebote', 'angebotsstatus', 'versendet');
    setAngebote(prev =>
      prev.map(a => a.record_id === rec.record_id
        ? { ...a, fields: { ...a.fields, angebotsstatus: optimistic } }
        : a,
      ),
    );
    undoToast(tx`${rec.projektName || ''} — Angebot als versendet markiert`, async () => {
      setAngebote(prev =>
        prev.map(a => a.record_id === rec.record_id
          ? { ...a, fields: { ...a.fields, angebotsstatus: snapshot } }
          : a,
        ),
      );
      await LivingAppsService.updateAngeboteEntry(rec.record_id, { angebotsstatus: lookupKey(snapshot) });
    });
    try {
      await LivingAppsService.updateAngeboteEntry(rec.record_id, { angebotsstatus: 'versendet' });
    } catch {
      fetchAll();
    }
  };

  const moveCard = async (cardId: string, newColumn: string) => {
    const rid = cardId.split(':')[1];
    if (!rid) return;
    const projekt = projekte.find(p => p.record_id === rid);
    if (!projekt) return;
    const optimistic = lookupOption('projekte', 'projektstatus', newColumn);
    setProjekte(prev =>
      prev.map(p => p.record_id === rid
        ? { ...p, fields: { ...p.fields, projektstatus: optimistic } }
        : p,
      ),
    );
    const kennung = projekt.fields.projektkennung ?? '';
    undoToast(tx`${kennung} — Status geändert`, async () => {
      const prev = projekt.fields.projektstatus;
      setProjekte(ps => ps.map(p => p.record_id === rid
        ? { ...p, fields: { ...p.fields, projektstatus: prev } }
        : p,
      ));
      await LivingAppsService.updateProjekteEntry(rid, { projektstatus: lookupKey(prev) });
    });
    try {
      await LivingAppsService.updateProjekteEntry(rid, { projektstatus: newColumn });
    } catch {
      fetchAll();
    }
  };

  // Filter state for rechnungen worklist
  const [rechnungFilter, setRechnungFilter] = useState<'all' | 'ueberfaellig'>('all');

  const visibleRechnungen = useMemo(
    () => rechnungFilter === 'ueberfaellig' ? ueberfaelligeRechnungen : offeneRechnungen,
    [rechnungFilter, ueberfaelligeRechnungen, offeneRechnungen],
  );

  const hasUeberfaellig = ueberfaelligeRechnungen.length > 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-1 truncate max-w-xl">{contextLine}</p>
        </div>
        <button
          onClick={() => crud.projekte.openCreate({ projektstatus: 'akquise' })}
          className="flex items-center gap-2 shrink-0 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={hasUeberfaellig && (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={{
              label: tx('Als bezahlt markieren'),
              onClick: () => void markRechnungBezahlt(ueberfaelligeRechnungen[0]),
            }}
          >
            <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName ?? '').filter(Boolean))}</b>
            {' '}{tx('— Rechnung überfällig')}{'. '}
            {ueberfaelligeRechnungen[0]?.fields.faelligkeitsdatum
              ? tx`Fällig war ${formatDate(ueberfaelligeRechnungen[0].fields.faelligkeitsdatum)}.`
              : null}
          </HeroBanner>
        )}
        kpis={
          <StatStrip>
            <StatStripItem
              title={appLabel('projekte')}
              value={aktiveProjekte.length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone={aktiveProjekte.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={formatCurrency(umsatzOffen)}
              icon={<IconFileInvoice size={16} className="shrink-0" />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
              onClick={() => setRechnungFilter(f => f === 'ueberfaellig' ? 'all' : 'ueberfaellig')}
              active={rechnungFilter === 'ueberfaellig'}
            />
            <StatStripItem
              title={tx('Stunden aktueller Monat')}
              value={`${stundenAktuellerMonat.toFixed(1)} h`}
              icon={<IconClock size={16} className="shrink-0" />}
              tone={stundenAktuellerMonat > 0 ? 'success' : 'default'}
            />
            <StatStripItem
              title={tx('Offene Angebote')}
              value={offeneAngebote.length}
              icon={<IconFileInvoice size={16} className="shrink-0" />}
              tone={offeneAngebote.length > 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            columns={projektStatusColumns}
            cards={projektCards}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={(card) => {
              const rid = card.id.split(':')[1];
              const projekt = enrichedProjekte.find(p => p.record_id === rid);
              if (projekt) crud.projekte.openDetail(projekt);
            }}
            onCardMove={moveCard}
            onAddCard={(column) => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={rechnungFilter === 'ueberfaellig' ? tx('Überfällige Rechnungen') : tx('Offene Rechnungen')}
              max={6}
              items={visibleRechnungen.map(r => ({
                id: r.record_id,
                title: r.kundeName || r.fields.rechnungsnummer || tx('Ohne Kunde'),
                secondLine: (
                  <>
                    <span className={
                      lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'
                        ? 'font-medium text-destructive'
                        : 'font-medium text-amber-600'
                    }>
                      {r.fields.rechnungsstatus?.label ?? '—'}
                    </span>
                    {r.fields.faelligkeitsdatum && (
                      <span className="text-muted-foreground"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
                    )}
                    {r.fields.nettobetrag != null && (
                      <span className="text-muted-foreground"> · {formatCurrency(r.fields.nettobetrag)}</span>
                    )}
                  </>
                ),
                action: lookupKey(r.fields.rechnungsstatus) === 'versendet'
                  ? { label: tx('Bezahlt'), onClick: () => void markRechnungBezahlt(r) }
                  : undefined,
              }))}
              onItemClick={(id) => {
                const r = enrichedRechnungen.find(x => x.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Keine offenen Rechnungen — alles beglichen.'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />
            <WorkList
              title={tx('Offene Angebote')}
              max={5}
              items={offeneAngebote.map(a => ({
                id: a.record_id,
                title: a.projektName || a.fields.angebotsnummer?.toString() || tx('Ohne Projekt'),
                secondLine: (
                  <>
                    <span className={
                      lookupKey(a.fields.angebotsstatus) === 'entwurf'
                        ? 'font-medium text-amber-600'
                        : 'font-medium text-primary'
                    }>
                      {a.fields.angebotsstatus?.label ?? '—'}
                    </span>
                    {a.fields.kostenbetrag != null && (
                      <span className="text-muted-foreground"> · {formatCurrency(a.fields.kostenbetrag)}</span>
                    )}
                  </>
                ),
                action: lookupKey(a.fields.angebotsstatus) === 'entwurf'
                  ? { label: tx('Versenden'), onClick: () => void markAngebotVersendet(a) }
                  : undefined,
              }))}
              onItemClick={(id) => {
                const a = enrichedAngebote.find(x => x.record_id === id);
                if (a) crud.angebote.openDetail(a);
              }}
              empty={{
                text: tx('Keine offenen Angebote.'),
                action: { label: tx('Neues Angebot'), onClick: () => crud.angebote.openCreate({}) },
              }}
            />
          </>
        }
      />

      {/* Stunden-Chart aktueller Monat */}
      {berater.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartWidget
            title={tx('Stunden nach Berater (aktueller Monat)')}
            rows={berater.map(b => ({ id: `berater:${b.record_id}`, data: b }))}
            dimension={{
              kind: 'category',
              accessor: (row) => `${row.data.fields.vorname ?? ''} ${row.data.fields.nachname ?? ''}`.trim() || tx('Unbekannt'),
            }}
            measure={{
              aggregate: 'sum',
              label: tx('Stunden'),
              value: (row) => row.data.fields.stunden_aktueller_monat ?? null,
              format: 'number',
            }}
          />
          <ChartWidget
            title={tx('Rechnungsstatus — Verteilung')}
            rows={rechnungChartRows}
            dimension={{
              kind: 'category',
              accessor: (row) => row.data.fields.rechnungsstatus ?? null,
            }}
          />
        </div>
      )}

      {crud.surfaces}
    </div>
  );
}
