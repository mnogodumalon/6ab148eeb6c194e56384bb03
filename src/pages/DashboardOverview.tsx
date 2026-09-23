import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx, appLabel } from '@/i18n';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { format } from 'date-fns';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { StatCard, StatCardRow, StatStrip, StatStripItem } from '@/components/StatCard';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard, KanbanColumn } from '@/components/widgets/KanbanWidget';
import {
  IconAlertCircle,
  IconBriefcase,
  IconClock,
  IconFileInvoice,
  IconPlus,
  IconCheck,
} from '@tabler/icons-react';
import { useState, useMemo } from 'react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    kunden, berater, leistungskatalog, projekte, angebote, zeiterfassung, rechnungen,
    kundenMap, beraterMap, leistungskatalogMap, projekteMap, zeiterfassungMap,
    fetchAll, setProjekte, setRechnungen,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const r = top.record;
        const status = lookupKey(r.fields.rechnungsstatus);
        if (status === 'versendet' || status === 'ueberfaellig') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: async () => {
              const prev = r.fields.rechnungsstatus;
              setRechnungen(rs => rs.map(x => x.record_id === r.record_id
                ? { ...x, fields: { ...x.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt') } }
                : x));
              try {
                await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
                undoToast(tx`${r.fields.rechnungsnummer ?? ''} — als bezahlt markiert`, async () => {
                  setRechnungen(rs => rs.map(x => x.record_id === r.record_id
                    ? { ...x, fields: { ...x.fields, rechnungsstatus: prev } }
                    : x));
                  await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: lookupKey(prev) ?? 'versendet' });
                });
              } catch { fetchAll(); }
            },
          };
        }
        if (status === 'entwurf') {
          return {
            label: tx('Versenden'),
            onClick: async () => {
              const prev = r.fields.rechnungsstatus;
              setRechnungen(rs => rs.map(x => x.record_id === r.record_id
                ? { ...x, fields: { ...x.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'versendet') } }
                : x));
              try {
                await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'versendet' });
                undoToast(tx`${r.fields.rechnungsnummer ?? ''} — versendet`, async () => {
                  setRechnungen(rs => rs.map(x => x.record_id === r.record_id
                    ? { ...x, fields: { ...x.fields, rechnungsstatus: prev } }
                    : x));
                  await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: lookupKey(prev) ?? 'entwurf' });
                });
              } catch { fetchAll(); }
            },
          };
        }
      }
      if (top.type === 'projekte') {
        const p = top.record;
        const status = lookupKey(p.fields.projektstatus);
        if (status === 'akquise') {
          return {
            label: tx('In Bearbeitung setzen'),
            onClick: async () => advanceProjekt(p, 'in_bearbeitung'),
          };
        }
        if (status === 'in_bearbeitung') {
          return {
            label: tx('Abschließen'),
            onClick: async () => advanceProjekt(p, 'abgeschlossen'),
          };
        }
      }
      return undefined;
    },
  });

  const enrichedBerater = crud.enriched.berater;
  const enrichedProjekte = crud.enriched.projekte;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;
  const enrichedRechnungen = crud.enriched.rechnungen;

  const clock = useClock();
  const todayKey = format(clock, 'yyyy-MM-dd');
  const currentMonth = clock.getMonth() + 1;
  const currentYear = clock.getFullYear();

  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Kanban columns — derived inside component body (locale-aware getters)
  const kanbanColumns: KanbanColumn[] = useMemo(() => (
    (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? 'primary' as const
          : o.key === 'abgeschlossen' ? 'success' as const
          : 'default' as const,
    }))
  ), []);

  // Kanban cards
  const kanbanCards: KanbanCard[] = useMemo(() => {
    const filtered = statusFilter
      ? enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === statusFilter)
      : enrichedProjekte;
    return filtered.map(p => ({
      id: `projekt:${p.record_id}`,
      column: lookupKey(p.fields.projektstatus) ?? '',
      title: p.fields.projektkennung ?? p.fields.projektart?.label ?? tx('Ohne Kennung'),
      subtitle: p.kundeName ? p.kundeName : undefined,
      tone: lookupKey(p.fields.projektstatus) === 'abgeschlossen' ? 'success' as const : 'default' as const,
    }));
  }, [enrichedProjekte, statusFilter]);

  // Advance projekt status helper
  async function advanceProjekt(p: typeof projekte[0], newStatus: string) {
    const prev = p.fields.projektstatus;
    setProjekte(ps => ps.map(x => x.record_id === p.record_id
      ? { ...x, fields: { ...x.fields, projektstatus: lookupOption('projekte', 'projektstatus', newStatus) } }
      : x));
    try {
      await LivingAppsService.updateProjekteEntry(p.record_id, { projektstatus: newStatus });
      const col = kanbanColumns.find(c => c.key === newStatus);
      undoToast(tx`${p.fields.projektkennung ?? ''} — ${col?.label ?? newStatus}`, async () => {
        setProjekte(ps => ps.map(x => x.record_id === p.record_id
          ? { ...x, fields: { ...x.fields, projektstatus: prev } }
          : x));
        await LivingAppsService.updateProjekteEntry(p.record_id, { projektstatus: lookupKey(prev) ?? 'akquise' });
      });
    } catch { fetchAll(); }
  }

  // KPI: projects by status
  const projektAkquise = useMemo(() => projekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise'), [projekte]);
  const projektInArbeit = useMemo(() => projekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung'), [projekte]);
  const projektAbgeschlossen = useMemo(() => projekte.filter(p => lookupKey(p.fields.projektstatus) === 'abgeschlossen'), [projekte]);

  // KPI: invoices
  const offeneRechnungen = useMemo(() => enrichedRechnungen.filter(r => {
    const s = lookupKey(r.fields.rechnungsstatus);
    return s === 'versendet' || s === 'entwurf';
  }), [enrichedRechnungen]);
  const ueberfaelligeRechnungen = useMemo(() => enrichedRechnungen.filter(r =>
    lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'
  ), [enrichedRechnungen]);
  const offeneSumme = useMemo(() => offeneRechnungen.reduce((s, r) => s + (r.fields.gesamtbetrag ?? 0), 0), [offeneRechnungen]);

  // KPI: time tracking today & this month
  const heuteStunden = useMemo(() => zeiterfassung
    .filter(z => z.fields.datum?.slice(0, 10) === todayKey)
    .reduce((s, z) => s + (z.fields.stunden ?? 0), 0), [zeiterfassung, todayKey]);

  const monatsStunden = useMemo(() => zeiterfassung
    .filter(z => z.fields.erfassungsjahr === currentYear && z.fields.erfassungsmonat?.key !== undefined &&
      (() => {
        const monatKeys = ['januar','februar','maerz','april','mai','juni','juli','august','september','oktober','november','dezember'];
        return monatKeys.indexOf(z.fields.erfassungsmonat?.key ?? '') === currentMonth - 1;
      })())
    .reduce((s, z) => s + (z.fields.stunden ?? 0), 0), [zeiterfassung, currentYear, currentMonth]);

  // Context line: mention active projects and overdue invoices
  const contextLine = useMemo(() => {
    const aktiveNames = enrichedProjekte
      .filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung')
      .slice(0, 3)
      .map(p => p.kundeName || p.fields.projektkennung || '');
    if (ueberfaelligeRechnungen.length > 0 && aktiveNames.length > 0) {
      return tx`${namen(aktiveNames)} – ${ueberfaelligeRechnungen.length} Rechnung(en) überfällig.`;
    }
    if (ueberfaelligeRechnungen.length > 0) {
      return tx`${ueberfaelligeRechnungen.length} Rechnung(en) überfällig — bitte prüfen.`;
    }
    if (aktiveNames.length > 0) {
      return tx`Aktive Projekte: ${namen(aktiveNames)}.`;
    }
    return tx('Willkommen im inclou. ERP.');
  }, [enrichedProjekte, ueberfaelligeRechnungen]);

  // WorkList: overdue / open invoices
  const rechnungenWorkItems = useMemo(() => {
    const sorted = [...ueberfaelligeRechnungen, ...offeneRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'versendet')]
      .slice(0, 8)
      .map(r => {
        const status = lookupKey(r.fields.rechnungsstatus);
        const isUeberfaellig = status === 'ueberfaellig';
        return {
          id: r.record_id,
          title: r.fields.rechnungsnummer ?? r.kundeName ?? tx('Rechnung'),
          secondLine: (
            <span>
              <span className={isUeberfaellig ? 'font-medium text-destructive' : 'font-medium text-amber-600'}>
                {isUeberfaellig ? tx('Überfällig') : tx('Versendet')}
              </span>
              {r.fields.gesamtbetrag != null && (
                <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag)}</span>
              )}
              {r.fields.faelligkeitsdatum && (
                <span className="text-muted-foreground"> · {tx('fällig')} {formatDate(r.fields.faelligkeitsdatum)}</span>
              )}
            </span>
          ),
          action: {
            label: tx('Bezahlt'),
            onClick: async () => {
              const prev = r.fields.rechnungsstatus;
              setRechnungen(rs => rs.map(x => x.record_id === r.record_id
                ? { ...x, fields: { ...x.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt') } }
                : x));
              try {
                await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
                undoToast(tx`${r.fields.rechnungsnummer ?? ''} — bezahlt`, async () => {
                  setRechnungen(rs => rs.map(x => x.record_id === r.record_id
                    ? { ...x, fields: { ...x.fields, rechnungsstatus: prev } }
                    : x));
                  await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: lookupKey(prev) ?? 'versendet' });
                });
              } catch { fetchAll(); }
            },
          },
        };
      });
    return sorted;
  }, [ueberfaelligeRechnungen, offeneRechnungen, setRechnungen, fetchAll]);

  // WorkList: today's time entries
  const heuteZeitItems = useMemo(() => {
    return enrichedZeiterfassung
      .filter(z => z.fields.datum?.slice(0, 10) === todayKey)
      .slice(0, 6)
      .map(z => ({
        id: z.record_id,
        title: z.beraterName || z.projektName || tx('Eintrag'),
        secondLine: (
          <span>
            <span className="font-medium text-foreground">{z.fields.stunden ?? 0} h</span>
            {z.projektName && <span className="text-muted-foreground"> · {z.projektName}</span>}
            {z.leistungName && <span className="text-muted-foreground"> · {z.leistungName}</span>}
          </span>
        ),
      }));
  }, [enrichedZeiterfassung, todayKey]);

  // Hero: overdue invoices
  const firstUeberfaellig = ueberfaelligeRechnungen[0];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contextLine}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shrink-0"
          onClick={() => crud.projekte.openCreate({ projektstatus: 'akquise' })}
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={firstUeberfaellig ? (
          <HeroBanner
            icon={<IconAlertCircle size={18} />}
            action={{
              label: tx('Als bezahlt markieren'),
              onClick: async () => {
                const r = firstUeberfaellig;
                const prev = r.fields.rechnungsstatus;
                setRechnungen(rs => rs.map(x => x.record_id === r.record_id
                  ? { ...x, fields: { ...x.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt') } }
                  : x));
                try {
                  await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
                  undoToast(tx`${r.fields.rechnungsnummer ?? ''} — bezahlt`, async () => {
                    setRechnungen(rs => rs.map(x => x.record_id === r.record_id
                      ? { ...x, fields: { ...x.fields, rechnungsstatus: prev } }
                      : x));
                    await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: lookupKey(prev) ?? 'versendet' });
                  });
                } catch { fetchAll(); }
              },
            }}
          >
            <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName || r.fields.rechnungsnummer || ''))}</b>
            {' '}
            {ueberfaelligeRechnungen.length === 1 ? tx('— 1 Rechnung überfällig') : tx`— ${ueberfaelligeRechnungen.length} Rechnungen überfällig`}
            {firstUeberfaellig.fields.faelligkeitsdatum && (
              <span className="text-sm opacity-80"> · {tx('fällig seit')} {formatDate(firstUeberfaellig.fields.faelligkeitsdatum)}</span>
            )}
          </HeroBanner>
        ) : undefined}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Akquise')}
              value={projektAkquise.length}
              icon={<IconBriefcase size={14} />}
              tone="default"
              onClick={() => setStatusFilter(f => f === 'akquise' ? null : 'akquise')}
              active={statusFilter === 'akquise'}
            />
            <StatStripItem
              title={tx('In Bearbeitung')}
              value={projektInArbeit.length}
              icon={<IconBriefcase size={14} />}
              tone="primary"
              onClick={() => setStatusFilter(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={statusFilter === 'in_bearbeitung'}
            />
            <StatStripItem
              title={tx('Abgeschlossen')}
              value={projektAbgeschlossen.length}
              icon={<IconCheck size={14} />}
              tone="success"
              onClick={() => setStatusFilter(f => f === 'abgeschlossen' ? null : 'abgeschlossen')}
              active={statusFilter === 'abgeschlossen'}
            />
            <StatStripItem
              title={tx('Offen (€)')}
              value={offeneRechnungen.length > 0 ? formatCurrency(offeneSumme) : '—'}
              icon={<IconFileInvoice size={14} />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Stunden heute')}
              value={heuteStunden > 0 ? `${heuteStunden} h` : '—'}
              icon={<IconClock size={14} />}
              tone={heuteStunden > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Stunden Monat')}
              value={monatsStunden > 0 ? `${monatsStunden} h` : '—'}
              icon={<IconClock size={14} />}
              tone="default"
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            columns={kanbanColumns}
            cards={kanbanCards}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={(card) => {
              const id = card.id.split(':')[1];
              const p = projekte.find(x => x.record_id === id);
              if (p) crud.projekte.openDetail(p);
            }}
            onCardMove={async (cardId, newColumn) => {
              const id = cardId.split(':')[1];
              const p = projekte.find(x => x.record_id === id);
              if (!p) return;
              const prev = p.fields.projektstatus;
              setProjekte(ps => ps.map(x => x.record_id === id
                ? { ...x, fields: { ...x.fields, projektstatus: lookupOption('projekte', 'projektstatus', newColumn) } }
                : x));
              try {
                await LivingAppsService.updateProjekteEntry(id, { projektstatus: newColumn });
                const col = kanbanColumns.find(c => c.key === newColumn);
                undoToast(tx`${p.fields.projektkennung ?? ''} — ${col?.label ?? newColumn}`, async () => {
                  setProjekte(ps => ps.map(x => x.record_id === id
                    ? { ...x, fields: { ...x.fields, projektstatus: prev } }
                    : x));
                  await LivingAppsService.updateProjekteEntry(id, { projektstatus: lookupKey(prev) ?? 'akquise' });
                });
              } catch { fetchAll(); }
            }}
            onAddCard={(column) => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene & überfällige Rechnungen')}
              items={rechnungenWorkItems}
              onItemClick={(id) => {
                const r = rechnungen.find(x => x.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              max={6}
              empty={{
                text: tx('Keine offenen Rechnungen — alles bezahlt.'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />
            <WorkList
              title={tx('Zeiterfassung heute')}
              items={heuteZeitItems}
              onItemClick={(id) => {
                const z = zeiterfassung.find(x => x.record_id === id);
                if (z) crud.zeiterfassung.openDetail(z);
              }}
              max={5}
              empty={{
                text: tx('Noch keine Stunden heute erfasst.'),
                action: { label: tx('Stunden buchen'), onClick: () => crud.zeiterfassung.openCreate({ datum: todayKey }) },
              }}
            />
          </>
        }
      />

      {/* Berater capacity overview */}
      {enrichedBerater.filter(b => lookupKey(b.fields.status) === 'aktiv').length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">{tx('Berater — Kapazität aktueller Monat')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {enrichedBerater
              .filter(b => lookupKey(b.fields.status) === 'aktiv')
              .map(b => {
                const stunden = b.fields.stunden_aktueller_monat ?? 0;
                const name = `${b.fields.vorname ?? ''} ${b.fields.nachname ?? ''}`.trim() || tx('Berater');
                return (
                  <StatCard
                    key={b.record_id}
                    title={name}
                    value={`${stunden} h`}
                    description={b.fields.stundensatz != null ? formatCurrency(b.fields.stundensatz) + tx(' / Std.') : undefined}
                    icon={<IconClock size={18} className="text-muted-foreground" />}
                    tone={stunden > 0 ? 'primary' : 'default'}
                    onClick={() => crud.berater.openDetail(b)}
                  />
                );
              })}
          </div>
        </div>
      )}

      {crud.surfaces}
    </div>
  );
}
