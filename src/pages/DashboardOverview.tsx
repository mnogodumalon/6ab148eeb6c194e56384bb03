import { useMemo, useState } from 'react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx, appLabel } from '@/i18n';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { gruss, namen, useClock, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { HeroBanner } from '@/components/HeroBanner';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupOption } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconBriefcase,
  IconCash,
  IconClock,
  IconFileText,
  IconUserCheck,
  IconPlus,
} from '@tabler/icons-react';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import type { EnrichedProjekte, EnrichedRechnungen, EnrichedAngebote, EnrichedZeiterfassung } from '@/types/enriched';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    kunden, berater, leistungskatalog, projekte, angebote, zeiterfassung, rechnungen,
    kundenMap, beraterMap, leistungskatalogMap, projekteMap, zeiterfassungMap,
    fetchAll, setProjekte,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const r = top.record as EnrichedRechnungen;
        const statusKey = lookupKey(r.fields.rechnungsstatus);
        if (statusKey === 'versendet' || statusKey === 'ueberfaellig') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: async () => {
              const prev = r.fields.rechnungsstatus;
              const next = lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt');
              const snapshot = [...rechnungen];
              // optimistic: already handled by crud internals for overlay edits
              try {
                await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
                undoToast(tx`${r.kundeName || r.fields.rechnungsnummer || ''} — als bezahlt markiert`, async () => {
                  await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: prev?.key ?? 'versendet' });
                  fetchAll();
                });
                fetchAll();
              } catch {
                fetchAll();
              }
            },
          };
        }
      }
      if (top.type === 'angebote') {
        const a = top.record as EnrichedAngebote;
        const statusKey = lookupKey(a.fields.angebotsstatus);
        if (statusKey === 'entwurf') {
          return {
            label: tx('Als versendet markieren'),
            onClick: async () => {
              const prev = a.fields.angebotsstatus;
              try {
                await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
                undoToast(tx`Angebot ${String(a.fields.angebotsnummer ?? '')} — versendet`, async () => {
                  await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: prev?.key ?? 'entwurf' });
                  fetchAll();
                });
                fetchAll();
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

  const enrichedProjekte = crud.enriched.projekte as EnrichedProjekte[];
  const enrichedAngebote = crud.enriched.angebote as EnrichedAngebote[];
  const enrichedRechnungen = crud.enriched.rechnungen as EnrichedRechnungen[];
  const enrichedZeiterfassung = crud.enriched.zeiterfassung as EnrichedZeiterfassung[];

  const clock = useClock();

  // Datum-Keys für "aktueller Monat"
  const currentMonth = format(clock, 'yyyy-MM');

  // Projekte-Status
  const projektStatusMap = useMemo(() => {
    const m: Record<string, EnrichedProjekte[]> = {};
    enrichedProjekte.forEach(p => {
      const key = lookupKey(p.fields.projektstatus) ?? '';
      if (!m[key]) m[key] = [];
      m[key].push(p);
    });
    return m;
  }, [enrichedProjekte]);

  // Offene Angebote (entwurf oder versendet)
  const offeneAngebote = useMemo(() =>
    enrichedAngebote.filter(a => {
      const key = lookupKey(a.fields.angebotsstatus);
      return key === 'entwurf' || key === 'versendet';
    }),
    [enrichedAngebote]
  );

  // Angebote älter als 30 Tage im Status Entwurf
  const alteEntwuerfe = useMemo(() =>
    enrichedAngebote.filter(a => {
      if (lookupKey(a.fields.angebotsstatus) !== 'entwurf') return false;
      const created = a.createdat;
      if (!created) return false;
      try {
        const d = parseISO(created);
        return isValid(d) && differenceInDays(clock, d) > 30;
      } catch { return false; }
    }),
    [enrichedAngebote, clock]
  );

  // Offene Rechnungen (versendet oder überfällig)
  const offeneRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => {
      const key = lookupKey(r.fields.rechnungsstatus);
      return key === 'versendet' || key === 'ueberfaellig';
    }),
    [enrichedRechnungen]
  );

  // Überfällige Rechnungen
  const ueberfaelligeRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'),
    [enrichedRechnungen]
  );

  // Rechnungen ohne Fälligkeitsdatum
  const rechnungenOhneFaelligkeit = useMemo(() =>
    offeneRechnungen.filter(r => !r.fields.faelligkeitsdatum),
    [offeneRechnungen]
  );

  // Gebuchte Stunden im laufenden Monat
  const stundenAktuellerMonat = useMemo(() => {
    return zeiterfassung.reduce((sum, z) => {
      const monat = z.fields.erfassungsmonat ? lookupKey(z.fields.erfassungsmonat) : null;
      const jahr = z.fields.erfassungsjahr;
      const currentYear = clock.getFullYear();
      const currentMonthNum = clock.getMonth() + 1;
      // Map month keys to numbers
      const monthNames: Record<string, number> = {
        januar: 1, februar: 2, maerz: 3, april: 4, mai: 5, juni: 6,
        juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
      };
      const monthNum = monat ? monthNames[monat] : null;
      if (monthNum === currentMonthNum && jahr === currentYear) {
        return sum + (z.fields.stunden ?? 0);
      }
      return sum;
    }, 0);
  }, [zeiterfassung, clock]);

  // Berater mit besonderem Status
  const beraterMitSonderStatus = useMemo(() =>
    berater.filter(b => {
      const key = lookupKey(b.fields.status);
      return key === 'urlaub' || key === 'elternzeit';
    }),
    [berater]
  );

  // KanbanWidget: Projekte nach Status
  const projektColumns = useMemo((): KanbanColumn[] => {
    return (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: (o.key === 'in_bearbeitung' ? 'primary' : o.key === 'abgeschlossen' ? 'success' : 'warning') as KanbanTone,
    }));
  }, []);

  const projektCards = useMemo((): KanbanCard[] => {
    return enrichedProjekte.map(p => {
      const statusKey = lookupKey(p.fields.projektstatus) ?? '';
      const projektleiterName = p.projektleitungName;
      const kundenname = p.kundeName;
      // Highlight Berater mit Urlaub/Elternzeit
      const plId = p.fields.projektleitung ? p.fields.projektleitung.split('/').pop() ?? '' : '';
      const pl = berater.find(b => b.record_id === plId);
      const plSonderStatus = pl ? lookupKey(pl.fields.status) : null;
      const hasWarning = plSonderStatus === 'urlaub' || plSonderStatus === 'elternzeit';

      return {
        id: `projekt:${p.record_id}`,
        column: statusKey,
        title: p.fields.projektkennung ?? p.fields.projektnummer?.toString() ?? tx('Unbekannt'),
        subtitle: (
          <span className="flex flex-col gap-0.5">
            <span className="truncate text-muted-foreground text-xs">{kundenname || '—'}</span>
            {projektleiterName && (
              <span className={`truncate text-xs ${hasWarning ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                {projektleiterName}{hasWarning ? ` (${pl?.fields.status?.label})` : ''}
              </span>
            )}
            {p.fields.letzter_schritt && (
              <span className="truncate text-xs text-muted-foreground italic">{p.fields.letzter_schritt}</span>
            )}
          </span>
        ),
        tone: (hasWarning && statusKey === 'in_bearbeitung' ? 'warning' : 'default') as KanbanTone,
      };
    });
  }, [enrichedProjekte, berater]);

  const handleCardMove = async (cardId: string, newColumn: string) => {
    const projektId = cardId.split(':')[1] ?? '';
    const projekt = enrichedProjekte.find(p => p.record_id === projektId);
    if (!projekt) return;

    const prevStatus = projekt.fields.projektstatus;
    const nextLookup = lookupOption('projekte', 'projektstatus', newColumn);

    // Optimistic update
    setProjekte(prev => prev.map(p =>
      p.record_id === projektId
        ? { ...p, fields: { ...p.fields, projektstatus: nextLookup } }
        : p
    ));

    try {
      await LivingAppsService.updateProjekteEntry(projektId, { projektstatus: newColumn });
      undoToast(
        tx`${projekt.fields.projektkennung || ''} — ${nextLookup.label}`,
        async () => {
          await LivingAppsService.updateProjekteEntry(projektId, { projektstatus: prevStatus?.key ?? newColumn });
          fetchAll();
        }
      );
    } catch {
      fetchAll();
    }
  };

  // ChartWidget: Stunden pro Berater im aktuellen Monat
  const stundenProBeraterRows = useMemo((): ChartRow<EnrichedZeiterfassung>[] => {
    const currentYear = clock.getFullYear();
    const currentMonthNum = clock.getMonth() + 1;
    const monthNames: Record<string, number> = {
      januar: 1, februar: 2, maerz: 3, april: 4, mai: 5, juni: 6,
      juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
    };
    return enrichedZeiterfassung
      .filter(z => {
        const monat = z.fields.erfassungsmonat ? lookupKey(z.fields.erfassungsmonat) : null;
        const jahr = z.fields.erfassungsjahr;
        const monthNum = monat ? monthNames[monat] : null;
        return monthNum === currentMonthNum && jahr === currentYear;
      })
      .map(z => ({ id: `zeiterfassung:${z.record_id}`, data: z }));
  }, [enrichedZeiterfassung, clock]);

  // Context line
  const contextLine = useMemo(() => {
    const aktiv = projekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung');
    const offeneR = offeneRechnungen.length;
    const beraterNamen = beraterMitSonderStatus.map(b =>
      [b.fields.vorname, b.fields.nachname].filter(Boolean).join(' ')
    );

    if (beraterMitSonderStatus.length > 0 && ueberfaelligeRechnungen.length > 0) {
      return tx`${String(aktiv.length)} Projekte aktiv — ${namen(beraterNamen)} abwesend, ${String(ueberfaelligeRechnungen.length)} Rechnungen überfällig.`;
    }
    if (beraterMitSonderStatus.length > 0) {
      return tx`${String(aktiv.length)} Projekte aktiv — ${namen(beraterNamen)} derzeit abwesend.`;
    }
    if (ueberfaelligeRechnungen.length > 0) {
      return tx`${String(aktiv.length)} Projekte aktiv — ${String(ueberfaelligeRechnungen.length)} Rechnungen überfällig.`;
    }
    if (offeneR > 0) {
      return tx`${String(aktiv.length)} Projekte aktiv, ${String(offeneR)} Rechnungen offen.`;
    }
    return tx`${String(aktiv.length)} Projekte aktiv — alles im grünen Bereich.`;
  }, [projekte, offeneRechnungen, ueberfaelligeRechnungen, beraterMitSonderStatus]);

  // Hero: überfällige Rechnungen
  const heroBanner = ueberfaelligeRechnungen.length > 0 ? (
    <HeroBanner
      icon={<IconAlertTriangle size={18} />}
      action={{
        label: tx('Rechnung öffnen'),
        onClick: () => crud.rechnungen.openDetail(ueberfaelligeRechnungen[0]),
      }}
    >
      <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName || r.fields.rechnungsnummer || ''))}</b>
      {' '}{tx('— Rechnung überfällig')}{ueberfaelligeRechnungen[0].fields.faelligkeitsdatum ? `, ${tx('fällig seit')} ${formatDate(ueberfaelligeRechnungen[0].fields.faelligkeitsdatum)}` : ''}.
    </HeroBanner>
  ) : undefined;

  // KPIs
  const kpis = (
    <StatStrip>
      <StatStripItem
        title={tx('Aktive Projekte')}
        value={enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung').length}
        icon={<IconBriefcase size={16} className="shrink-0" />}
        tone="primary"
      />
      <StatStripItem
        title={tx('Offene Angebote')}
        value={offeneAngebote.length}
        icon={<IconFileText size={16} className="shrink-0" />}
        tone={alteEntwuerfe.length > 0 ? 'warning' : 'default'}
      />
      <StatStripItem
        title={tx('Offene Rechnungen')}
        value={offeneRechnungen.length}
        icon={<IconCash size={16} className="shrink-0" />}
        tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
      />
      <StatStripItem
        title={tx('Stunden (Monat)')}
        value={stundenAktuellerMonat.toFixed(1)}
        icon={<IconClock size={16} className="shrink-0" />}
        tone="default"
      />
      {beraterMitSonderStatus.length > 0 && (
        <StatStripItem
          title={tx('Berater abwesend')}
          value={beraterMitSonderStatus.length}
          icon={<IconUserCheck size={16} className="shrink-0" />}
          tone="warning"
        />
      )}
    </StatStrip>
  );

  // Aside: WorkList Offene Rechnungen + WorkList Angebote-Aufmerksamkeit
  const rechnungenItems = useMemo(() => {
    const sorted = [...offeneRechnungen].sort((a, b) => {
      const aKey = lookupKey(a.fields.rechnungsstatus) ?? '';
      const bKey = lookupKey(b.fields.rechnungsstatus) ?? '';
      // überfällig first
      if (aKey === 'ueberfaellig' && bKey !== 'ueberfaellig') return -1;
      if (bKey === 'ueberfaellig' && aKey !== 'ueberfaellig') return 1;
      // then by date
      return (a.fields.faelligkeitsdatum ?? '').localeCompare(b.fields.faelligkeitsdatum ?? '');
    });
    return sorted.map(r => {
      const statusKey = lookupKey(r.fields.rechnungsstatus);
      const isUeberfaellig = statusKey === 'ueberfaellig';
      const keinFaelligkeitsdatum = !r.fields.faelligkeitsdatum;
      return {
        id: r.record_id,
        title: r.kundeName || r.fields.rechnungsnummer || tx('Rechnung'),
        secondLine: (
          <span className="flex items-center gap-1 flex-wrap">
            <span className={`font-medium text-xs ${isUeberfaellig ? 'text-destructive' : 'text-amber-600'}`}>
              {r.fields.rechnungsstatus?.label ?? statusKey}
            </span>
            {keinFaelligkeitsdatum && (
              <span className="text-xs text-muted-foreground">
                {' · '}{tx('Kein Fälligkeitsdatum')}
              </span>
            )}
            {r.fields.faelligkeitsdatum && (
              <span className="text-xs text-muted-foreground">
                {' · '}{tx('fällig')}: {formatDate(r.fields.faelligkeitsdatum)}
              </span>
            )}
            {r.fields.nettobetrag != null && (
              <span className="text-xs text-muted-foreground">
                {' · '}{formatCurrency(r.fields.nettobetrag)}
              </span>
            )}
          </span>
        ),
        action: isUeberfaellig
          ? {
              label: tx('Bezahlt'),
              onClick: async () => {
                const prev = r.fields.rechnungsstatus;
                try {
                  await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
                  undoToast(
                    tx`${r.kundeName || ''} — als bezahlt markiert`,
                    async () => {
                      await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: prev?.key ?? 'versendet' });
                      fetchAll();
                    }
                  );
                  fetchAll();
                } catch {
                  fetchAll();
                }
              },
            }
          : undefined,
      };
    });
  }, [offeneRechnungen, fetchAll]);

  const angeboteItems = useMemo(() => {
    // Alte Entwürfe + offene Angebote (versendet)
    const items = [
      ...alteEntwuerfe,
      ...offeneAngebote.filter(a => lookupKey(a.fields.angebotsstatus) === 'versendet'),
    ];
    // Deduplicate by record_id
    const seen = new Set<string>();
    const unique = items.filter(a => {
      if (seen.has(a.record_id)) return false;
      seen.add(a.record_id);
      return true;
    });
    return unique.map(a => {
      const statusKey = lookupKey(a.fields.angebotsstatus);
      const isAlterEntwurf = alteEntwuerfe.some(e => e.record_id === a.record_id);
      return {
        id: a.record_id,
        title: [a.fields.angebotsnummer ? `#${a.fields.angebotsnummer}` : null, a.projektName || null].filter(Boolean).join(' — ') || tx('Angebot'),
        secondLine: (
          <span className="flex items-center gap-1 flex-wrap">
            <span className={`font-medium text-xs ${isAlterEntwurf ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {a.fields.angebotsstatus?.label ?? statusKey}
            </span>
            {isAlterEntwurf && (
              <span className="text-xs text-amber-600">
                {' · '}{tx('über 30 Tage alt')}
              </span>
            )}
            {a.fields.kostenbetrag != null && (
              <span className="text-xs text-muted-foreground">
                {' · '}{formatCurrency(a.fields.kostenbetrag)}
              </span>
            )}
          </span>
        ),
        action: statusKey === 'entwurf'
          ? {
              label: tx('Versenden'),
              onClick: async () => {
                const prev = a.fields.angebotsstatus;
                try {
                  await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
                  undoToast(
                    tx`Angebot ${String(a.fields.angebotsnummer ?? '')} — versendet`,
                    async () => {
                      await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: prev?.key ?? 'entwurf' });
                      fetchAll();
                    }
                  );
                  fetchAll();
                } catch {
                  fetchAll();
                }
              },
            }
          : undefined,
      };
    });
  }, [alteEntwuerfe, offeneAngebote, fetchAll]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contextLine}</p>
        </div>
        <button
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          onClick={() => crud.projekte.openCreate({})}
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroBanner}
        kpis={kpis}
        primary={
          <KanbanWidget
            columns={projektColumns}
            cards={projektCards}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={(card) => {
              const projektId = card.id.split(':')[1] ?? '';
              const p = enrichedProjekte.find(p => p.record_id === projektId);
              if (p) crud.projekte.openDetail(p);
            }}
            onCardMove={handleCardMove}
            onAddCard={(column) => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene Rechnungen')}
              items={rechnungenItems}
              max={6}
              onItemClick={(id) => {
                const r = enrichedRechnungen.find(r => r.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Keine offenen Rechnungen — alles bezahlt.'),
                action: {
                  label: tx('Rechnung erstellen'),
                  onClick: () => crud.rechnungen.openCreate({}),
                },
              }}
            />
            <WorkList
              title={tx('Offene Angebote')}
              items={angeboteItems}
              max={5}
              onItemClick={(id) => {
                const a = enrichedAngebote.find(a => a.record_id === id);
                if (a) crud.angebote.openDetail(a);
              }}
              empty={{
                text: tx('Keine offenen Angebote.'),
                action: {
                  label: tx('Angebot erstellen'),
                  onClick: () => crud.angebote.openCreate({}),
                },
              }}
            />
            <ChartWidget
              title={tx('Stunden pro Berater (Monat)')}
              rows={stundenProBeraterRows}
              dimension={{
                kind: 'category',
                accessor: (row) => row.data.beraterName || tx('Unbekannt'),
                label: tx('Berater'),
              }}
              measure={{
                aggregate: 'sum',
                label: tx('Stunden'),
                value: (row) => row.data.fields.stunden ?? null,
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
