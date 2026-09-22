import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { APP_IDS, LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import type { KanbanCard, KanbanColumn } from '@/components/widgets/KanbanWidget';
import type { ChartRow } from '@/components/widgets/ChartWidget';
import {
  IconAlertCircle,
  IconBriefcase,
  IconUsers,
  IconFileText,
  IconClock,
  IconChartBar,
  IconPlus,
} from '@tabler/icons-react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    kunden, berater, projekte, angebote, zeiterfassung, rechnungen,
    setProjekte, fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'angebote') {
        const rec = top.record;
        const status = lookupKey(rec.fields.angebotsstatus);
        if (status === 'entwurf') {
          return {
            label: tx('Angebot versenden'),
            onClick: async () => {
              const prev = rec.fields.angebotsstatus;
              const next = lookupOption('angebote', 'angebotsstatus', 'versendet');
              crud.overlay.replace({ ...top, record: { ...rec, fields: { ...rec.fields, angebotsstatus: next } } } as typeof top);
              undoToast(tx`${rec.fields.angebotsnummer ?? ''} — als versendet markiert`, async () => {
                await LivingAppsService.updateAngeboteEntry(rec.record_id, { angebotsstatus: prev as any });
                fetchAll();
              });
              try {
                await LivingAppsService.updateAngeboteEntry(rec.record_id, { angebotsstatus: 'versendet' });
              } catch {
                fetchAll();
              }
            },
          };
        }
      }
      if (top.type === 'rechnungen') {
        const rec = top.record;
        const status = lookupKey(rec.fields.rechnungsstatus);
        if (status === 'versendet' || status === 'ueberfaellig') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: async () => {
              const prev = rec.fields.rechnungsstatus;
              const next = lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt');
              crud.overlay.replace({ ...top, record: { ...rec, fields: { ...rec.fields, rechnungsstatus: next } } } as typeof top);
              undoToast(tx`${rec.fields.rechnungsnummer ?? ''} — als bezahlt markiert`, async () => {
                await LivingAppsService.updateRechnungenEntry(rec.record_id, { rechnungsstatus: prev as any });
                fetchAll();
              });
              try {
                await LivingAppsService.updateRechnungenEntry(rec.record_id, { rechnungsstatus: 'bezahlt' });
              } catch {
                fetchAll();
              }
            },
          };
        }
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte;
  const enrichedAngebote = crud.enriched.angebote;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;
  const enrichedRechnungen = crud.enriched.rechnungen;

  const clock = useClock();
  const today = format(clock, 'yyyy-MM-dd');
  const currentMonth = clock.getMonth();
  const currentYear = clock.getFullYear();

  // --- KPIs ---
  const aktiveProjekte = projekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung');
  const akquiseProjekte = projekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise');

  const ueberfaelligeRechnungen = enrichedRechnungen.filter(
    r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'
  );
  const offeneAngebote = enrichedAngebote.filter(
    a => lookupKey(a.fields.angebotsstatus) === 'entwurf' || lookupKey(a.fields.angebotsstatus) === 'versendet'
  );

  const stundenDieserMonat = zeiterfassung.filter(
    z => z.fields.erfassungsjahr === currentYear && z.fields.erfassungsmonat != null
  );
  const gesamtStunden = stundenDieserMonat.reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0);

  const aktiveBerater = berater.filter(b => lookupKey(b.fields.status) === 'aktiv');

  // --- Kanban Projekte ---
  const projektColumns = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({ key: o.key, label: o.label })),
    []
  );

  const projektCards = useMemo<KanbanCard[]>(
    () => enrichedProjekte.map(p => {
      const status = lookupKey(p.fields.projektstatus) ?? 'akquise';
      return {
        id: `projekt:${p.record_id}`,
        column: status,
        title: p.fields.projektkennung ?? tx('Ohne Kennung'),
        subtitle: p.kundeName || undefined,
        tone: status === 'in_bearbeitung' ? 'primary' : status === 'abgeschlossen' ? 'success' : 'warning',
      };
    }),
    [enrichedProjekte]
  );

  const moveProjektCard = async (cardId: string, newColumn: string) => {
    const rid = cardId.split(':')[1];
    if (!rid) return;
    const projekt = projekte.find(p => p.record_id === rid);
    if (!projekt) return;
    const prev = projekt.fields.projektstatus;
    setProjekte(ps => ps.map(p =>
      p.record_id === rid
        ? { ...p, fields: { ...p.fields, projektstatus: lookupOption('projekte', 'projektstatus', newColumn) } }
        : p
    ));
    undoToast(tx`${projekt.fields.projektkennung ?? ''} — Status geändert`, async () => {
      await LivingAppsService.updateProjekteEntry(rid, { projektstatus: prev as any });
      fetchAll();
    });
    try {
      await LivingAppsService.updateProjekteEntry(rid, { projektstatus: newColumn });
    } catch {
      fetchAll();
    }
  };

  // --- Aside 1: Offene Angebote ---
  const offeneAngeboteSorted = [...offeneAngebote].sort((a, b) => {
    const da = a.fields.zeitrahmen_anfang ?? '';
    const db = b.fields.zeitrahmen_anfang ?? '';
    return da < db ? -1 : da > db ? 1 : 0;
  });

  // --- Aside 2: Zeiterfassung diese Woche ---
  const zeitDieseWoche = enrichedZeiterfassung.filter(z => {
    const d = z.fields.datum;
    if (!d) return false;
    const diff = Math.abs(new Date(today).getTime() - new Date(d).getTime());
    return diff <= 7 * 24 * 60 * 60 * 1000;
  }).sort((a, b) => (b.fields.datum ?? '') < (a.fields.datum ?? '') ? -1 : 1).slice(0, 8);

  // --- Context line ---
  const contextLine = useMemo(() => {
    const aktiveNamen = aktiveProjekte
      .slice(0, 3)
      .map(p => p.fields.projektkennung ?? '')
      .filter(Boolean);
    if (aktiveProjekte.length === 0 && akquiseProjekte.length === 0) {
      return tx('Noch keine Projekte erfasst — leg jetzt los!');
    }
    if (ueberfaelligeRechnungen.length > 0) {
      return tx`${ueberfaelligeRechnungen.length} Rechnung(en) überfällig — sofort handeln.`;
    }
    if (aktiveNamen.length > 0) {
      const n = namen(aktiveNamen);
      return tx`Aktive Projekte: ${n}.`;
    }
    return tx`${aktiveProjekte.length} Projekte in Bearbeitung, ${akquiseProjekte.length} in Akquise.`;
  }, [aktiveProjekte, akquiseProjekte, ueberfaelligeRechnungen]);

  // --- ChartWidget rows für Umsatz ---
  const revenueRows = useMemo<ChartRow<{ monat: string; betrag: number | null }>[]>(
    () => enrichedRechnungen
      .filter(r => lookupKey(r.fields.rechnungsstatus) === 'bezahlt')
      .map(r => ({
        id: `rechnung:${r.record_id}`,
        data: {
          monat: r.fields.rechnungsjahr
            ? `${r.fields.rechnungsjahr}-${String(r.fields.rechnungsmonat ? monthIndex(lookupKey(r.fields.rechnungsmonat) ?? '') : 1).padStart(2, '0')}-01`
            : today,
          betrag: r.fields.gesamtbetrag ?? null,
        },
      })),
    [enrichedRechnungen, today]
  );

  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredProjektCards = statusFilter
    ? projektCards.filter(c => c.column === statusFilter)
    : projektCards;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{contextLine}</p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          onClick={() => crud.projekte.openCreate({ projektstatus: 'akquise' })}
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          ueberfaelligeRechnungen.length > 0
            ? (
              <HeroBanner
                icon={<IconAlertCircle size={18} />}
                action={{
                  label: tx('Rechnung öffnen'),
                  onClick: () => crud.rechnungen.openDetail(ueberfaelligeRechnungen[0]),
                }}
              >
                <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName || r.fields.rechnungsnummer || ''))}</b>
                {' '}{tx('— Rechnung(en) überfällig.')}
                {' '}{ueberfaelligeRechnungen.length > 1 && tx`${ueberfaelligeRechnungen.length} offene Posten.`}
              </HeroBanner>
            )
            : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Aktive Projekte')}
              value={aktiveProjekte.length}
              icon={<IconBriefcase size={16} />}
              tone={aktiveProjekte.length > 0 ? 'primary' : 'default'}
              onClick={() => setStatusFilter(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={statusFilter === 'in_bearbeitung'}
            />
            <StatStripItem
              title={tx('In Akquise')}
              value={akquiseProjekte.length}
              icon={<IconChartBar size={16} />}
              tone={akquiseProjekte.length > 0 ? 'warning' : 'default'}
              onClick={() => setStatusFilter(f => f === 'akquise' ? null : 'akquise')}
              active={statusFilter === 'akquise'}
            />
            <StatStripItem
              title={tx('Aktive Berater')}
              value={aktiveBerater.length}
              icon={<IconUsers size={16} />}
              tone="default"
              onClick={() => crud.berater.openCreate({ status: 'aktiv' })}
            />
            <StatStripItem
              title={tx('Stunden (Monat)')}
              value={gesamtStunden % 1 === 0 ? gesamtStunden : gesamtStunden.toFixed(1)}
              icon={<IconClock size={16} />}
              tone={gesamtStunden > 0 ? 'success' : 'default'}
            />
            <StatStripItem
              title={tx('Offene Angebote')}
              value={offeneAngebote.length}
              icon={<IconFileText size={16} />}
              tone={offeneAngebote.length > 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            cards={statusFilter ? filteredProjektCards : projektCards}
            columns={projektColumns}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={card => {
              const rid = card.id.split(':')[1];
              const p = projekte.find(x => x.record_id === rid);
              if (p) crud.projekte.openDetail(p);
            }}
            onCardMove={moveProjektCard}
            onAddCard={column => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene Angebote')}
              items={offeneAngeboteSorted.slice(0, 8).map(a => ({
                id: a.record_id,
                title: a.projektName || a.fields.angebotsnummer?.toString() || tx('Angebot'),
                secondLine: (
                  <>
                    <span className={
                      lookupKey(a.fields.angebotsstatus) === 'versendet'
                        ? 'font-medium text-amber-600'
                        : 'font-medium text-muted-foreground'
                    }>
                      {a.fields.angebotsstatus?.label ?? '—'}
                    </span>
                    {a.fields.kostenbetrag != null && (
                      <span className="text-muted-foreground"> · {formatCurrency(a.fields.kostenbetrag)}</span>
                    )}
                    {a.fields.zeitrahmen_anfang && (
                      <span className="text-muted-foreground"> · {formatDate(a.fields.zeitrahmen_anfang)}</span>
                    )}
                  </>
                ),
                action: lookupKey(a.fields.angebotsstatus) === 'entwurf'
                  ? {
                    label: tx('Versenden'),
                    onClick: async () => {
                      const prev = a.fields.angebotsstatus;
                      undoToast(tx`Angebot ${a.fields.angebotsnummer ?? ''} — versendet`, async () => {
                        await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: prev as any });
                        fetchAll();
                      });
                      try {
                        await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
                        fetchAll();
                      } catch {
                        fetchAll();
                      }
                    },
                  }
                  : undefined,
              }))}
              onItemClick={id => {
                const a = angebote.find(x => x.record_id === id);
                if (a) crud.angebote.openDetail(a);
              }}
              empty={{
                text: tx('Keine offenen Angebote — alles bearbeitet!'),
                action: { label: tx('Neues Angebot'), onClick: () => crud.angebote.openCreate({}) },
              }}
            />

            <WorkList
              title={tx('Zeiterfassung diese Woche')}
              items={zeitDieseWoche.map(z => ({
                id: z.record_id,
                title: z.beraterName || tx('Berater'),
                secondLine: (
                  <>
                    <span className="font-medium text-foreground">
                      {z.fields.stunden ?? 0}{tx(' h')}
                    </span>
                    {z.projektName && (
                      <span className="text-muted-foreground"> · {z.projektName}</span>
                    )}
                    {z.fields.datum && (
                      <span className="text-muted-foreground"> · {formatDate(z.fields.datum)}</span>
                    )}
                  </>
                ),
                action: {
                  label: tx('Detail'),
                  onClick: () => crud.zeiterfassung.openDetail(z),
                },
              }))}
              onItemClick={id => {
                const z = zeiterfassung.find(x => x.record_id === id);
                if (z) crud.zeiterfassung.openDetail(z);
              }}
              empty={{
                text: tx('Noch keine Stunden diese Woche erfasst.'),
                action: { label: tx('Zeit erfassen'), onClick: () => crud.zeiterfassung.openCreate({ datum: today }) },
              }}
            />
          </>
        }
      />

      {/* Revenue chart — separate axis from the kanban status */}
      {revenueRows.length > 0 && (
        <ChartWidget
          title={tx('Umsatz (bezahlte Rechnungen)')}
          rows={revenueRows}
          dimension={{ kind: 'time', accessor: r => r.data.monat }}
          measure={{ aggregate: 'sum', label: tx('Umsatz'), value: r => r.data.betrag, format: 'currency' }}
        />
      )}

      {crud.surfaces}
    </div>
  );
}

// Helper: Monat-Key → Monatsnummer (1-12)
function monthIndex(key: string): number {
  const map: Record<string, number> = {
    januar: 1, februar: 2, maerz: 3, april: 4, mai: 5, juni: 6,
    juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
  };
  return map[key] ?? 1;
}
