import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupKey, formatCurrency } from '@/lib/formatters';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard } from '@/components/widgets/KanbanWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import type { ChartRow } from '@/components/widgets/ChartWidget';
import {
  IconAlertTriangle,
  IconBriefcase,
  IconClock,
  IconFileInvoice,
  IconUsers,
  IconSend,
  IconCircleCheck,
  IconCurrencyEuro,
} from '@tabler/icons-react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    kunden, berater, projekte, angebote, zeiterfassung, rechnungen,
    kundenMap, beraterMap, projekteMap,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'angebote') {
        const rec = top.record;
        const statusKey = lookupKey(rec.fields.angebotsstatus);
        if (statusKey === 'entwurf') {
          return {
            label: tx('Versenden'),
            onClick: async () => {
              const prev = rec.fields.angebotsstatus;
              await LivingAppsService.updateAngeboteEntry(rec.record_id, {
                angebotsstatus: 'versendet',
              });
              fetchAll();
              undoToast(tx`Angebot als versendet markiert`, async () => {
                await LivingAppsService.updateAngeboteEntry(rec.record_id, {
                  angebotsstatus: prev ? lookupKey(prev) : 'entwurf',
                });
                fetchAll();
              });
            },
          };
        }
        if (statusKey === 'versendet') {
          return {
            label: tx('Als angenommen markieren'),
            onClick: async () => {
              const prev = rec.fields.angebotsstatus;
              await LivingAppsService.updateAngeboteEntry(rec.record_id, {
                angebotsstatus: 'angenommen',
              });
              fetchAll();
              undoToast(tx`Angebot als angenommen markiert`, async () => {
                await LivingAppsService.updateAngeboteEntry(rec.record_id, {
                  angebotsstatus: prev ? lookupKey(prev) : 'versendet',
                });
                fetchAll();
              });
            },
          };
        }
      }
      if (top.type === 'rechnungen') {
        const rec = top.record;
        const statusKey = lookupKey(rec.fields.rechnungsstatus);
        if (statusKey === 'entwurf') {
          return {
            label: tx('Rechnung versenden'),
            onClick: async () => {
              const prev = rec.fields.rechnungsstatus;
              await LivingAppsService.updateRechnungenEntry(rec.record_id, {
                rechnungsstatus: 'versendet',
              });
              fetchAll();
              undoToast(tx`Rechnung als versendet markiert`, async () => {
                await LivingAppsService.updateRechnungenEntry(rec.record_id, {
                  rechnungsstatus: prev ? lookupKey(prev) : 'entwurf',
                });
                fetchAll();
              });
            },
          };
        }
        if (statusKey === 'versendet' || statusKey === 'ueberfaellig') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: async () => {
              const prev = rec.fields.rechnungsstatus;
              await LivingAppsService.updateRechnungenEntry(rec.record_id, {
                rechnungsstatus: 'bezahlt',
              });
              fetchAll();
              undoToast(tx`Rechnung als bezahlt markiert`, async () => {
                await LivingAppsService.updateRechnungenEntry(rec.record_id, {
                  rechnungsstatus: prev ? lookupKey(prev) : 'versendet',
                });
                fetchAll();
              });
            },
          };
        }
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte;
  const enrichedAngebote = crud.enriched.angebote;
  const enrichedRechnungen = crud.enriched.rechnungen;
  const enrichedBerater = crud.enriched.berater;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;

  const clock = useClock();
  const [projektFilter, setProjektFilter] = useState<string | null>(null);

  // --- Projekt-KPIs ---
  const projekteAkquise = useMemo(
    () => enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise'),
    [enrichedProjekte]
  );
  const projekteInBearbeitung = useMemo(
    () => enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung'),
    [enrichedProjekte]
  );

  // --- Rechnungen ---
  const ueberfaelligeRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'),
    [enrichedRechnungen]
  );
  const offeneRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => {
      const s = lookupKey(r.fields.rechnungsstatus);
      return s === 'entwurf' || s === 'versendet' || s === 'ueberfaellig';
    }),
    [enrichedRechnungen]
  );
  const offeneRechnungenSumme = useMemo(
    () => offeneRechnungen.reduce((sum, r) => sum + (r.fields.gesamtbetrag ?? 0), 0),
    [offeneRechnungen]
  );

  // --- Angebote laufendes Jahr ---
  const currentYear = clock.getFullYear();
  const angeboteLaufendesJahr = useMemo(
    () => enrichedAngebote.filter(a => a.fields.angebotsjahr === currentYear),
    [enrichedAngebote, currentYear]
  );
  const offeneAngebote = useMemo(
    () => angeboteLaufendesJahr.filter(a => {
      const s = lookupKey(a.fields.angebotsstatus);
      return s === 'entwurf' || s === 'versendet';
    }),
    [angeboteLaufendesJahr]
  );

  // --- Berater mit Sonderstatus ---
  const beraterSonderstatus = useMemo(
    () => enrichedBerater.filter(b => {
      const s = lookupKey(b.fields.status);
      return s === 'urlaub' || s === 'elternzeit';
    }),
    [enrichedBerater]
  );
  const aktiveBerater = useMemo(
    () => enrichedBerater.filter(b => lookupKey(b.fields.status) === 'aktiv'),
    [enrichedBerater]
  );

  // --- Zeiterfassung aktueller Monat ---
  const aktuellerMonat = clock.getMonth() + 1;
  const aktuellesJahr = clock.getFullYear();
  const zeitAktuellerMonat = useMemo(
    () => zeiterfassung.filter(z => z.fields.erfassungsjahr === aktuellesJahr && z.fields.stunden),
    [zeiterfassung, aktuellesJahr]
  );
  const stundenAktuellerMonat = useMemo(
    () => zeitAktuellerMonat.reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0),
    [zeitAktuellerMonat]
  );

  // --- Kanban Projekte ---
  const projektStatusSpalten = useMemo(
    () => (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? 'primary' as const
          : o.key === 'akquise' ? 'warning' as const
          : 'default' as const,
    })),
    []
  );

  const projektKarten = useMemo((): KanbanCard[] => {
    const filtered = projektFilter
      ? enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === projektFilter)
      : enrichedProjekte;
    return filtered.map(p => ({
      id: `projekt:${p.record_id}`,
      column: lookupKey(p.fields.projektstatus) ?? '',
      title: p.fields.projektkennung ?? p.fields.projektnummer?.toString() ?? tx('Ohne Kennung'),
      subtitle: (
        <span className="text-xs text-muted-foreground">
          {p.kundeName && <span>{p.kundeName}</span>}
          {p.kundeName && p.projektleitungName && <span className="mx-1">·</span>}
          {p.projektleitungName && <span>{p.projektleitungName}</span>}
        </span>
      ),
      tone: lookupKey(p.fields.projektstatus) === 'akquise' ? 'warning' as const : 'default' as const,
    }));
  }, [enrichedProjekte, projektFilter]);

  const handleKanbanMove = async (cardId: string, newColumn: string) => {
    const id = cardId.split(':')[1];
    const projekt = projekte.find(p => p.record_id === id);
    if (!projekt) return;
    const prevStatus = projekt.fields.projektstatus;
    const prevStatusKey = lookupKey(prevStatus);

    // Optimistisch
    data.setProjekte(prev => prev.map(p =>
      p.record_id === id
        ? { ...p, fields: { ...p.fields, projektstatus: lookupOption('projekte', 'projektstatus', newColumn) } }
        : p
    ));

    try {
      await LivingAppsService.updateProjekteEntry(id, { projektstatus: newColumn });
      const newLabel = projektStatusSpalten.find(s => s.key === newColumn)?.label ?? newColumn;
      undoToast(tx`Projekt nach ${newLabel} verschoben`, async () => {
        data.setProjekte(prev => prev.map(p =>
          p.record_id === id
            ? { ...p, fields: { ...p.fields, projektstatus: prevStatus ?? lookupOption('projekte', 'projektstatus', prevStatusKey ?? 'akquise') } }
            : p
        ));
        await LivingAppsService.updateProjekteEntry(id, { projektstatus: prevStatusKey ?? 'akquise' });
      });
    } catch {
      fetchAll();
    }
  };

  // --- Kontext-Zeile ---
  const kontextZeile = useMemo(() => {
    if (ueberfaelligeRechnungen.length > 0) {
      const namen_ = namen(ueberfaelligeRechnungen.map(r => r.kundeName ?? ''));
      return tx`${namen_} — überfällige Rechnung(en) erfordern sofortige Aufmerksamkeit.`;
    }
    if (projekteInBearbeitung.length > 0) {
      const pNamen = namen(projekteInBearbeitung.map(p => p.fields.projektkennung ?? p.kundeName ?? ''));
      return tx`Aktuell in Bearbeitung: ${pNamen}.`;
    }
    return tx('Willkommen im inclou. ERP — alle Projekte im Blick.');
  }, [ueberfaelligeRechnungen, projekteInBearbeitung]);

  // --- Angebote WorkList ---
  const angeboteWorkList = useMemo(
    () => offeneAngebote.slice(0, 8).map(a => {
      const statusKey = lookupKey(a.fields.angebotsstatus);
      const statusColor = statusKey === 'entwurf' ? 'text-amber-600' : 'text-blue-600';
      return {
        id: a.record_id,
        title: a.projektName || a.fields.angebotsnummer?.toString() || tx('Angebot'),
        secondLine: (
          <span>
            <span className={`font-medium ${statusColor}`}>
              {a.fields.angebotsstatus?.label}
            </span>
            {a.fields.kostenbetrag != null && (
              <span className="text-muted-foreground"> · {formatCurrency(a.fields.kostenbetrag)}</span>
            )}
          </span>
        ),
        action: statusKey === 'entwurf' ? {
          label: tx('Versenden'),
          onClick: async () => {
            const prev = a.fields.angebotsstatus;
            await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
            fetchAll();
            undoToast(tx`Angebot als versendet markiert`, async () => {
              await LivingAppsService.updateAngeboteEntry(a.record_id, {
                angebotsstatus: prev ? lookupKey(prev) : 'entwurf',
              });
              fetchAll();
            });
          },
        } : undefined,
      };
    }),
    [offeneAngebote, fetchAll]
  );

  // --- Berater WorkList ---
  const beraterWorkList = useMemo(
    () => enrichedBerater.slice(0, 8).map(b => {
      const statusKey = lookupKey(b.fields.status);
      const isSpecial = statusKey === 'urlaub' || statusKey === 'elternzeit';
      const statusColor = statusKey === 'urlaub' ? 'text-amber-600'
        : statusKey === 'elternzeit' ? 'text-blue-600'
        : 'text-emerald-600';
      return {
        id: b.record_id,
        title: [b.fields.titel, b.fields.vorname, b.fields.nachname].filter(Boolean).join(' ') || tx('Berater'),
        secondLine: (
          <span>
            <span className={`font-medium ${statusColor}`}>{b.fields.status?.label}</span>
            {isSpecial && b.fields.stunden_aktueller_monat != null && (
              <span className="text-muted-foreground"> · {b.fields.stunden_aktueller_monat} {tx('h/Monat')}</span>
            )}
          </span>
        ),
      };
    }),
    [enrichedBerater]
  );

  // --- Rechnungen ChartWidget rows ---
  const rechnungenChartRows = useMemo(
    (): ChartRow<typeof enrichedRechnungen[0]>[] =>
      enrichedRechnungen.map(r => ({ id: `rechnung:${r.record_id}`, data: r })),
    [enrichedRechnungen]
  );

  // --- Hero: Überfällige Rechnungen ---
  const heroBanner = ueberfaelligeRechnungen.length > 0 && (() => {
    const first = ueberfaelligeRechnungen[0];
    const kundeNamen = namen(ueberfaelligeRechnungen.map(r => r.kundeName ?? ''));
    return (
      <HeroBanner
        icon={<IconAlertTriangle size={18} />}
        action={{
          label: tx('Als bezahlt markieren'),
          onClick: async () => {
            const prev = first.fields.rechnungsstatus;
            await LivingAppsService.updateRechnungenEntry(first.record_id, { rechnungsstatus: 'bezahlt' });
            fetchAll();
            undoToast(tx`Rechnung als bezahlt markiert`, async () => {
              await LivingAppsService.updateRechnungenEntry(first.record_id, {
                rechnungsstatus: prev ? lookupKey(prev) : 'ueberfaellig',
              });
              fetchAll();
            });
          },
        }}
      >
        <b>{kundeNamen}</b>
        {' — '}
        {ueberfaelligeRechnungen.length === 1
          ? tx('1 überfällige Rechnung')
          : tx`${ueberfaelligeRechnungen.length} überfällige Rechnungen`}
        {first.fields.faelligkeitsdatum && (
          <> {tx('fällig seit')} <b>{format(new Date(first.fields.faelligkeitsdatum), 'dd.MM.yyyy')}</b></>
        )}
      </HeroBanner>
    );
  })();

  return (
    <div className="space-y-6">
      {/* Seitenkopf */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{kontextZeile}</p>
        </div>
        <button
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={() => crud.projekte.openCreate({})}
        >
          <IconBriefcase size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroBanner || undefined}
        kpis={
          <StatStrip>
            <StatStripItem
              title={appLabel('projekte')}
              value={projekteInBearbeitung.length}
              icon={<IconBriefcase size={16} />}
              tone={projekteInBearbeitung.length > 0 ? 'primary' : 'default'}
              onClick={() => setProjektFilter(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={projektFilter === 'in_bearbeitung'}
            />
            <StatStripItem
              title={tx('Akquise')}
              value={projekteAkquise.length}
              icon={<IconUsers size={16} />}
              tone={projekteAkquise.length > 0 ? 'warning' : 'default'}
              onClick={() => setProjektFilter(f => f === 'akquise' ? null : 'akquise')}
              active={projektFilter === 'akquise'}
            />
            <StatStripItem
              title={tx('Offene Angebote')}
              value={offeneAngebote.length}
              icon={<IconSend size={16} />}
              tone={offeneAngebote.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Aktive Berater')}
              value={aktiveBerater.length}
              icon={<IconUsers size={16} />}
              tone="default"
            />
            <StatStripItem
              title={tx('Stunden (Monat)')}
              value={stundenAktuellerMonat}
              icon={<IconClock size={16} />}
              tone="default"
            />
            <StatStripItem
              title={tx('Offene Forderungen')}
              value={formatCurrency(offeneRechnungenSumme)}
              icon={<IconCurrencyEuro size={16} />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungenSumme > 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            columns={projektStatusSpalten}
            cards={projektKarten}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={(card) => {
              const id = card.id.split(':')[1];
              const projekt = enrichedProjekte.find(p => p.record_id === id);
              if (projekt) crud.projekte.openDetail(projekt);
            }}
            onCardMove={handleKanbanMove}
            onAddCard={(column) => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene Angebote (laufendes Jahr)')}
              items={angeboteWorkList}
              onItemClick={(id) => {
                const a = enrichedAngebote.find(a => a.record_id === id);
                if (a) crud.angebote.openDetail(a);
              }}
              empty={{
                text: tx('Keine offenen Angebote — neues Angebot erstellen'),
                action: { label: tx('Angebot erstellen'), onClick: () => crud.angebote.openCreate({ angebotsjahr: currentYear }) },
              }}
            />
            <div className="space-y-4">
              <ChartWidget
                title={tx('Rechnungen nach Status')}
                rows={rechnungenChartRows}
                dimension={{
                  kind: 'category',
                  accessor: (row) => row.data.fields.rechnungsstatus,
                  label: tx('Status'),
                }}
                measure={{
                  aggregate: 'sum',
                  label: tx('Gesamtbetrag'),
                  value: (row) => row.data.fields.gesamtbetrag ?? null,
                  format: 'currency',
                }}
              />
            </div>
          </>
        }
      />

      {/* Berater-Übersicht */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">{tx('Berater-Status')}</h2>
            {beraterSonderstatus.length > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                {tx`${beraterSonderstatus.length} abwesend`}
              </span>
            )}
          </div>
          <div className="divide-y divide-border">
            {enrichedBerater.slice(0, 8).map(b => {
              const statusKey = lookupKey(b.fields.status);
              const isUrlaub = statusKey === 'urlaub';
              const isEltern = statusKey === 'elternzeit';
              const isAktiv = statusKey === 'aktiv';
              return (
                <button
                  key={b.record_id}
                  className="w-full flex items-center gap-3 py-2 text-left hover:bg-muted/50 rounded transition-colors px-1"
                  onClick={() => crud.berater.openDetail(b)}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    isAktiv ? 'bg-emerald-500' :
                    isUrlaub ? 'bg-amber-500' :
                    isEltern ? 'bg-blue-500' : 'bg-muted-foreground'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {[b.fields.titel, b.fields.vorname, b.fields.nachname].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {(isUrlaub || isEltern)
                        ? <span className={isUrlaub ? 'text-amber-600' : 'text-blue-600'}>{b.fields.status?.label}</span>
                        : b.fields.stunden_aktueller_monat != null
                          ? tx`${b.fields.stunden_aktueller_monat} h / Monat`
                          : b.fields.status?.label
                      }
                    </p>
                  </div>
                  {b.fields.stundensatz != null && (
                    <span className="text-xs text-muted-foreground shrink-0">{formatCurrency(b.fields.stundensatz)}/h</span>
                  )}
                </button>
              );
            })}
            {enrichedBerater.length === 0 && (
              <p className="text-sm text-muted-foreground py-3">{tx('Noch keine Berater erfasst.')}</p>
            )}
          </div>
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => crud.berater.openCreate({})}
          >
            + {tx('Berater hinzufügen')}
          </button>
        </div>

        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">{tx('Zeiterfassung — aktueller Monat')}</h2>
            <span className="text-xs text-muted-foreground">
              {tx`${stundenAktuellerMonat} h gesamt`}
            </span>
          </div>
          <div className="divide-y divide-border">
            {enrichedBerater
              .filter(b => lookupKey(b.fields.status) === 'aktiv')
              .slice(0, 8)
              .map(b => {
                const beraterStunden = zeitAktuellerMonat
                  .filter(z => {
                    const bid = z.fields.berater ? z.fields.berater.split('/').pop() : null;
                    return bid === b.record_id;
                  })
                  .reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0);
                const maxStunden = 200;
                const percent = Math.min(100, Math.round((beraterStunden / maxStunden) * 100));
                return (
                  <button
                    key={b.record_id}
                    className="w-full flex items-center gap-3 py-2 text-left hover:bg-muted/50 rounded transition-colors px-1"
                    onClick={() => crud.berater.openDetail(b)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="truncate font-medium">
                          {[b.fields.vorname, b.fields.nachname].filter(Boolean).join(' ')}
                        </span>
                        <span className="shrink-0 text-muted-foreground ml-2">{beraterStunden} h</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percent >= 90 ? 'bg-amber-500' : 'bg-primary'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            {aktiveBerater.length === 0 && (
              <p className="text-sm text-muted-foreground py-3">{tx('Keine aktiven Berater.')}</p>
            )}
          </div>
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => crud.zeiterfassung.openCreate({})}
          >
            + {tx('Stunden erfassen')}
          </button>
        </div>
      </div>

      {/* Rechnungen Überfällig-Liste */}
      {ueberfaelligeRechnungen.length > 0 && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <IconFileInvoice size={16} className="text-destructive shrink-0" />
            <h2 className="font-semibold text-sm text-destructive">{tx('Überfällige Rechnungen')}</h2>
          </div>
          <div className="divide-y divide-border">
            {ueberfaelligeRechnungen.map(r => (
              <div key={r.record_id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <button
                    className="text-sm font-medium hover:underline truncate block text-left"
                    onClick={() => crud.rechnungen.openDetail(r)}
                  >
                    {r.kundeName || r.fields.rechnungsnummer || tx('Rechnung')}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {r.projektName && <span>{r.projektName} · </span>}
                    {r.fields.faelligkeitsdatum && (
                      <span className="text-destructive">
                        {tx('Fällig:')} {format(new Date(r.fields.faelligkeitsdatum), 'dd.MM.yyyy')}
                      </span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {r.fields.gesamtbetrag != null && (
                    <span className="text-sm font-semibold text-destructive">
                      {formatCurrency(r.fields.gesamtbetrag)}
                    </span>
                  )}
                  <button
                    className="text-xs bg-primary text-primary-foreground rounded px-2 py-1 hover:bg-primary/90 transition-colors"
                    onClick={async () => {
                      const prev = r.fields.rechnungsstatus;
                      await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
                      fetchAll();
                      undoToast(tx`Rechnung als bezahlt markiert`, async () => {
                        await LivingAppsService.updateRechnungenEntry(r.record_id, {
                          rechnungsstatus: prev ? lookupKey(prev) : 'ueberfaellig',
                        });
                        fetchAll();
                      });
                    }}
                  >
                    <IconCircleCheck size={14} className="shrink-0" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {crud.surfaces}
    </div>
  );
}
