import { useState } from 'react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx, appLabel } from '@/i18n';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard, KanbanColumn } from '@/components/widgets/KanbanWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import type { ChartRow } from '@/components/widgets/ChartWidget';
import type { EnrichedRechnungen, EnrichedBerater, EnrichedProjekte } from '@/types/enriched';
import {
  IconAlertTriangle,
  IconClock,
  IconFileInvoice,
  IconUsers,
  IconBriefcase,
  IconPlus,
} from '@tabler/icons-react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    projekte, setProjekte, rechnungen, setRechnungen, berater,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const r = top.record as EnrichedRechnungen;
        const status = lookupKey(r.fields.rechnungsstatus);
        if (status === 'entwurf') {
          return {
            label: tx('Rechnung versenden'),
            onClick: () => {
              const prev = rechnungen.slice();
              setRechnungen(rechnungen.map(x =>
                x.record_id === r.record_id
                  ? { ...x, fields: { ...x.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'versendet') } }
                  : x
              ));
              LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'versendet' })
                .catch(() => { setRechnungen(prev); fetchAll(); });
              undoToast(tx`${r.fields.rechnungsnummer ?? ''} — als versendet markiert`, () => {
                setRechnungen(prev);
                LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'entwurf' }).catch(() => fetchAll());
              });
              crud.overlay.close();
            },
          };
        }
        if (status === 'versendet') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: () => {
              const prev = rechnungen.slice();
              setRechnungen(rechnungen.map(x =>
                x.record_id === r.record_id
                  ? { ...x, fields: { ...x.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt') } }
                  : x
              ));
              LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' })
                .catch(() => { setRechnungen(prev); fetchAll(); });
              undoToast(tx`${r.fields.rechnungsnummer ?? ''} — als bezahlt markiert`, () => {
                setRechnungen(prev);
                LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'versendet' }).catch(() => fetchAll());
              });
              crud.overlay.close();
            },
          };
        }
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte as EnrichedProjekte[];
  const enrichedRechnungen = crud.enriched.rechnungen as EnrichedRechnungen[];
  const enrichedBerater = crud.enriched.berater as EnrichedBerater[];

  const clock = useClock();
  const today = clock;

  // ── Derived data ──────────────────────────────────────────────────────────
  const aktiveProjekte = enrichedProjekte.filter(
    p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung'
  );

  const offeneRechnungen = enrichedRechnungen.filter(r => {
    const st = lookupKey(r.fields.rechnungsstatus);
    return st === 'entwurf' || st === 'versendet' || st === 'ueberfaellig';
  });

  const ueberfaelligeRechnungen = enrichedRechnungen.filter(r => {
    const st = lookupKey(r.fields.rechnungsstatus);
    if (st === 'bezahlt' || st === 'storniert') return false;
    if (st === 'ueberfaellig') return true;
    const faellig = r.fields.faelligkeitsdatum;
    if (!faellig) return false;
    return new Date(faellig) < today;
  });

  const offeneAngebote = data.angebote.filter(a => {
    const st = lookupKey(a.fields.angebotsstatus);
    return st === 'entwurf' || st === 'versendet';
  });

  const aktiveBerater = berater.filter(b => lookupKey(b.fields.status) === 'aktiv');

  const gesamtOffenBetrag = offeneRechnungen.reduce((s, r) => s + (r.fields.gesamtbetrag ?? r.fields.nettobetrag ?? 0), 0);

  // ── Advance helpers ────────────────────────────────────────────────────────
  function advanceRechnungStatus(r: EnrichedRechnungen) {
    const status = lookupKey(r.fields.rechnungsstatus);
    const nextStatus = status === 'entwurf' ? 'versendet' : status === 'versendet' ? 'bezahlt' : null;
    if (!nextStatus) return;
    const nextLabel = nextStatus === 'versendet' ? tx('Versendet') : tx('Bezahlt');
    const prev = rechnungen.slice();
    setRechnungen(rechnungen.map(x =>
      x.record_id === r.record_id
        ? { ...x, fields: { ...x.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', nextStatus) } }
        : x
    ));
    LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: nextStatus })
      .catch(() => { setRechnungen(prev); fetchAll(); });
    undoToast(tx`${r.fields.rechnungsnummer ?? r.kundeName} — ${nextLabel}`, () => {
      setRechnungen(prev);
      LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: status ?? 'entwurf' }).catch(() => fetchAll());
    });
  }

  // ── Projekte Kanban ───────────────────────────────────────────────────────
  const [projektFilter, setProjektFilter] = useState<string | null>(null);

  const projektColumns: KanbanColumn[] = (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
    key: o.key,
    label: o.label,
    tone: o.key === 'in_bearbeitung' ? 'primary' : o.key === 'abgeschlossen' ? 'success' : 'default',
  }));

  const projektCards: KanbanCard[] = enrichedProjekte
    .filter(p => !projektFilter || lookupKey(p.fields.projektstatus) === projektFilter)
    .map(p => ({
      id: `projekt:${p.record_id}`,
      column: lookupKey(p.fields.projektstatus) ?? '',
      title: p.fields.projektkennung ?? p.kundeName ?? tx('Ohne Kennung'),
      subtitle: p.kundeName
        ? <span className="text-xs text-muted-foreground truncate">{p.kundeName}{p.projektleitungName ? ` · ${p.projektleitungName}` : ''}</span>
        : undefined,
      tone: lookupKey(p.fields.projektstatus) === 'abgeschlossen' ? 'success' : 'default',
    }));

  async function handleProjektCardMove(cardId: string, newColumn: string) {
    const id = cardId.split(':')[1];
    const projekt = projekte.find(p => p.record_id === id);
    if (!projekt) return;
    const prevStatus = lookupKey(projekt.fields.projektstatus) ?? '';
    setProjekte(projekte.map(p =>
      p.record_id === id
        ? { ...p, fields: { ...p.fields, projektstatus: lookupOption('projekte', 'projektstatus', newColumn) } }
        : p
    ));
    const col = projektColumns.find(c => c.key === newColumn);
    LivingAppsService.updateProjekteEntry(id, { projektstatus: newColumn })
      .catch(() => { setProjekte(projekte); fetchAll(); });
    undoToast(tx`${projekt.fields.projektkennung ?? ''} — ${col?.label ?? newColumn}`, () => {
      setProjekte(projekte.map(p =>
        p.record_id === id
          ? { ...p, fields: { ...p.fields, projektstatus: lookupOption('projekte', 'projektstatus', prevStatus) } }
          : p
      ));
      LivingAppsService.updateProjekteEntry(id, { projektstatus: prevStatus }).catch(() => fetchAll());
    });
  }

  // ── Stunden-Chart je Berater ───────────────────────────────────────────────
  const beraterStundenRows: ChartRow<EnrichedBerater>[] = enrichedBerater
    .filter(b => (b.fields.stunden_aktueller_monat ?? 0) > 0 || lookupKey(b.fields.status) === 'aktiv')
    .map(b => ({
      id: `berater:${b.record_id}`,
      data: b,
    }));

  // ── Hero: überfällige Rechnungen ──────────────────────────────────────────
  const erstUeberfaellige = ueberfaelligeRechnungen[0];

  // ── Kontext-Zeile ─────────────────────────────────────────────────────────
  const kontextTeile: string[] = [];
  if (aktiveProjekte.length > 0) {
    const names = aktiveProjekte.slice(0, 2).map(p => p.fields.projektkennung ?? p.kundeName ?? '').filter(Boolean);
    if (names.length > 0) kontextTeile.push(namen(names));
  }
  const kontextZeile = aktiveProjekte.length === 0
    ? tx('Keine aktiven Projekte — starte mit einem neuen Projekt.')
    : kontextTeile.length > 0
      ? tx`${kontextTeile[0]} und ${aktiveProjekte.length} aktive Projekte im Blick.`
      : tx`${aktiveProjekte.length} aktive Projekte.`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{kontextZeile}</p>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          onClick={() => crud.projekte.openCreate({})}
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          ueberfaelligeRechnungen.length > 0 && erstUeberfaellige ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: tx('Status aktualisieren'),
                onClick: () => advanceRechnungStatus(erstUeberfaellige),
              }}
            >
              <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName || r.fields.rechnungsnummer || ''))}</b>
              {ueberfaelligeRechnungen.length === 1
                ? tx` — Rechnung überfällig seit ${formatDate(erstUeberfaellige.fields.faelligkeitsdatum)}.`
                : tx` — ${ueberfaelligeRechnungen.length} Rechnungen überfällig.`}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Aktive Projekte')}
              value={aktiveProjekte.length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone="primary"
            />
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length === 0 ? tx('Keine') : `${offeneRechnungen.length} · ${formatCurrency(gesamtOffenBetrag)}`}
              icon={<IconFileInvoice size={16} className="shrink-0" />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Offene Angebote')}
              value={offeneAngebote.length}
              icon={<IconClock size={16} className="shrink-0" />}
              tone={offeneAngebote.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Aktive Berater:innen')}
              value={aktiveBerater.length}
              icon={<IconUsers size={16} className="shrink-0" />}
              tone="default"
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            columns={projektColumns}
            cards={projektCards}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={(card) => {
              const id = card.id.split(':')[1];
              const p = enrichedProjekte.find(x => x.record_id === id);
              if (p) crud.projekte.openDetail(p);
            }}
            onCardMove={handleProjektCardMove}
            onAddCard={(column) => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Rechnungen — offen & überfällig')}
              items={offeneRechnungen
                .sort((a, b) => {
                  const aOver = ueberfaelligeRechnungen.some(x => x.record_id === a.record_id);
                  const bOver = ueberfaelligeRechnungen.some(x => x.record_id === b.record_id);
                  if (aOver && !bOver) return -1;
                  if (!aOver && bOver) return 1;
                  return (a.fields.faelligkeitsdatum ?? '').localeCompare(b.fields.faelligkeitsdatum ?? '');
                })
                .slice(0, 8)
                .map(r => {
                  const isOverdue = ueberfaelligeRechnungen.some(x => x.record_id === r.record_id);
                  const status = lookupKey(r.fields.rechnungsstatus);
                  const nextLabel = status === 'entwurf' ? tx('Versenden') : tx('Bezahlt');
                  return {
                    id: r.record_id,
                    title: r.kundeName || r.fields.rechnungsnummer || tx('Rechnung'),
                    secondLine: (
                      <>
                        <span className={isOverdue ? 'font-medium text-destructive' : 'font-medium text-amber-600'}>
                          {isOverdue ? tx('Überfällig') : r.fields.rechnungsstatus?.label ?? ''}
                        </span>
                        {r.fields.faelligkeitsdatum && (
                          <span className="text-muted-foreground"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
                        )}
                        {(r.fields.gesamtbetrag ?? r.fields.nettobetrag) != null && (
                          <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag ?? r.fields.nettobetrag)}</span>
                        )}
                      </>
                    ),
                    action: (status === 'entwurf' || status === 'versendet') ? {
                      label: nextLabel,
                      onClick: () => advanceRechnungStatus(r),
                    } : undefined,
                  };
                })}
              onItemClick={(id) => {
                const r = enrichedRechnungen.find(x => x.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Keine offenen Rechnungen — alles beglichen.'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />

            <ChartWidget
              title={tx('Stunden aktueller Monat')}
              rows={beraterStundenRows}
              dimension={{
                kind: 'category',
                accessor: (row) => {
                  const b = row.data;
                  return `${b.fields.vorname ?? ''} ${b.fields.nachname ?? ''}`.trim() || tx('Unbekannt');
                },
                label: tx('Berater:in'),
              }}
              measure={{
                aggregate: 'sum',
                label: tx('Stunden'),
                value: (row) => row.data.fields.stunden_aktueller_monat ?? null,
                format: 'number',
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
