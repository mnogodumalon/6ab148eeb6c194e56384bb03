import { useState, useMemo } from 'react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx, appLabel } from '@/i18n';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { HeroBanner } from '@/components/HeroBanner';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard, KanbanColumn } from '@/components/widgets/KanbanWidget';
import {
  IconAlertTriangle,
  IconClock,
  IconBriefcase,
  IconFileInvoice,
  IconClipboardList,
  IconUserCheck,
  IconPlus,
} from '@tabler/icons-react';
import { format } from 'date-fns';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    kunden,
    berater,
    projekte,
    angebote,
    zeiterfassung,
    rechnungen,
    kundenMap,
    beraterMap,
    projekteMap,
    fetchAll,
    setProjekte,
  } = data;

  const clock = useClock();

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const r = top.record;
        const status = lookupKey(r.fields.rechnungsstatus);
        if (status === 'entwurf') {
          return {
            label: tx('Als versendet markieren'),
            onClick: async () => {
              const prev = r.fields.rechnungsstatus;
              await LivingAppsService.updateRechnungenEntry(r.record_id, {
                rechnungsstatus: 'versendet',
              });
              undoToast(tx`Rechnung ${r.fields.rechnungsnummer ?? ''} — versendet`, async () => {
                await LivingAppsService.updateRechnungenEntry(r.record_id, {
                  rechnungsstatus: lookupKey(prev) ?? 'entwurf',
                });
                fetchAll();
              });
              fetchAll();
            },
          };
        }
        if (status === 'versendet') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: async () => {
              const prev = r.fields.rechnungsstatus;
              await LivingAppsService.updateRechnungenEntry(r.record_id, {
                rechnungsstatus: 'bezahlt',
              });
              undoToast(tx`Rechnung ${r.fields.rechnungsnummer ?? ''} — bezahlt`, async () => {
                await LivingAppsService.updateRechnungenEntry(r.record_id, {
                  rechnungsstatus: lookupKey(prev) ?? 'versendet',
                });
                fetchAll();
              });
              fetchAll();
            },
          };
        }
      }
      if (top.type === 'angebote') {
        const a = top.record;
        const status = lookupKey(a.fields.angebotsstatus);
        if (status === 'entwurf') {
          return {
            label: tx('Als versendet markieren'),
            onClick: async () => {
              const prev = a.fields.angebotsstatus;
              await LivingAppsService.updateAngeboteEntry(a.record_id, {
                angebotsstatus: 'versendet',
              });
              undoToast(tx`Angebot — versendet`, async () => {
                await LivingAppsService.updateAngeboteEntry(a.record_id, {
                  angebotsstatus: lookupKey(prev) ?? 'entwurf',
                });
                fetchAll();
              });
              fetchAll();
            },
          };
        }
        if (status === 'versendet') {
          return {
            label: tx('Als angenommen markieren'),
            onClick: async () => {
              const prev = a.fields.angebotsstatus;
              await LivingAppsService.updateAngeboteEntry(a.record_id, {
                angebotsstatus: 'angenommen',
              });
              undoToast(tx`Angebot — angenommen`, async () => {
                await LivingAppsService.updateAngeboteEntry(a.record_id, {
                  angebotsstatus: lookupKey(prev) ?? 'versendet',
                });
                fetchAll();
              });
              fetchAll();
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

  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // --- Projekte Kanban ---
  const projektColumns = useMemo((): KanbanColumn[] =>
    (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung'
        ? 'primary'
        : o.key === 'abgeschlossen'
        ? 'success'
        : 'default',
    })),
    []
  );

  const projektCards = useMemo((): KanbanCard[] =>
    enrichedProjekte
      .filter(p => !statusFilter || lookupKey(p.fields.projektstatus) === statusFilter)
      .map(p => ({
        id: `projekt:${p.record_id}`,
        column: lookupKey(p.fields.projektstatus) ?? '',
        title: p.fields.projektkennung ?? p.fields.projektart?.label ?? tx('Kein Titel'),
        subtitle: p.kundeName
          ? `${p.kundeName}${p.projektleitungName ? ' · ' + p.projektleitungName : ''}`
          : p.projektleitungName || undefined,
        tone: lookupKey(p.fields.projektstatus) === 'abgeschlossen' ? 'success'
          : lookupKey(p.fields.projektstatus) === 'in_bearbeitung' ? 'primary'
          : 'default',
      })),
    [enrichedProjekte, statusFilter]
  );

  const handleCardMove = async (cardId: string, newColumn: string) => {
    const id = cardId.split(':')[1];
    const projekt = projekte.find(p => p.record_id === id);
    if (!projekt) return;
    const prevStatus = projekt.fields.projektstatus;
    const newLookup = lookupOption('projekte', 'projektstatus', newColumn);
    setProjekte(prev => prev.map(p =>
      p.record_id === id
        ? { ...p, fields: { ...p.fields, projektstatus: newLookup } }
        : p
    ));
    try {
      await LivingAppsService.updateProjekteEntry(id, { projektstatus: newColumn });
      undoToast(
        tx`Projekt — ${newLookup.label}`,
        async () => {
          await LivingAppsService.updateProjekteEntry(id, {
            projektstatus: lookupKey(prevStatus) ?? newColumn,
          });
          fetchAll();
        }
      );
    } catch {
      fetchAll();
    }
  };

  // --- Überfällige Rechnungen ---
  const ueberfaelligeRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'),
    [enrichedRechnungen]
  );

  // --- KPI-Werte ---
  const aktiveProjekte = useMemo(
    () => projekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung').length,
    [projekte]
  );
  const akquiseProjekte = useMemo(
    () => projekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise').length,
    [projekte]
  );
  const offeneRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => {
      const s = lookupKey(r.fields.rechnungsstatus);
      return s === 'versendet' || s === 'ueberfaellig';
    }),
    [enrichedRechnungen]
  );
  const offeneRechnungenSumme = useMemo(
    () => offeneRechnungen.reduce((s, r) => s + (r.fields.gesamtbetrag ?? 0), 0),
    [offeneRechnungen]
  );
  const offeneAngebote = useMemo(
    () => enrichedAngebote.filter(a => {
      const s = lookupKey(a.fields.angebotsstatus);
      return s === 'entwurf' || s === 'versendet';
    }),
    [enrichedAngebote]
  );

  // --- Context line ---
  const contextLine = useMemo(() => {
    const aktiv = projekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung');
    if (aktiv.length === 0 && projekte.length === 0) {
      return tx('Noch keine Projekte – leg das erste an.');
    }
    const kundenNamen = aktiv
      .map(p => {
        const kId = p.fields.kunde ? p.fields.kunde.match(/([a-f0-9]{24})$/i)?.[1] : null;
        return kId ? kundenMap.get(kId)?.fields?.kundenname ?? '' : '';
      })
      .filter(Boolean);
    const ue = ueberfaelligeRechnungen.length;
    const kundenPart = kundenNamen.length > 0
      ? tx`${namen(kundenNamen)} in Bearbeitung`
      : tx`${aktiveProjekte} Projekte aktiv`;
    return ue > 0
      ? tx`${kundenPart} · ${ue} Rechnung${ue === 1 ? '' : 'en'} überfällig`
      : kundenPart;
  }, [projekte, kundenMap, ueberfaelligeRechnungen, aktiveProjekte]);

  // --- WorkList: Offene Rechnungen ---
  const offeneRechnungenItems = useMemo(() =>
    offeneRechnungen
      .sort((a, b) => {
        const fa = a.fields.faelligkeitsdatum ?? '';
        const fb = b.fields.faelligkeitsdatum ?? '';
        return fa.localeCompare(fb);
      })
      .slice(0, 8)
      .map(r => {
        const status = lookupKey(r.fields.rechnungsstatus);
        const isUeberfaellig = status === 'ueberfaellig';
        return {
          id: r.record_id,
          title: r.kundeName || r.fields.rechnungsnummer || tx('Rechnung'),
          secondLine: (
            <span className="flex gap-1 items-center flex-wrap min-w-0">
              <span className={`font-medium ${isUeberfaellig ? 'text-destructive' : 'text-amber-600'}`}>
                {isUeberfaellig ? tx('Überfällig') : tx('Versendet')}
              </span>
              {r.fields.faelligkeitsdatum && (
                <span className="text-muted-foreground truncate">
                  · {tx('fällig')} {formatDate(r.fields.faelligkeitsdatum)}
                </span>
              )}
              {r.fields.gesamtbetrag != null && (
                <span className="text-muted-foreground ml-auto shrink-0">
                  {formatCurrency(r.fields.gesamtbetrag)}
                </span>
              )}
            </span>
          ),
          action: status === 'versendet'
            ? {
                label: tx('✓ Bezahlt'),
                onClick: async () => {
                  await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
                  undoToast(tx`Rechnung ${r.fields.rechnungsnummer ?? ''} — bezahlt`, async () => {
                    await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'versendet' });
                    fetchAll();
                  });
                  fetchAll();
                },
              }
            : undefined,
        };
      }),
    [offeneRechnungen, fetchAll]
  );

  // --- WorkList: Berater Stunden ---
  const beraterStundenItems = useMemo(() =>
    enrichedBerater
      .filter(b => lookupKey(b.fields.status) === 'aktiv')
      .map(b => {
        const stunden = b.fields.stunden_aktueller_monat ?? 0;
        const satz = b.fields.stundensatz;
        return {
          id: b.record_id,
          _stunden: stunden,
          title: `${b.fields.vorname ?? ''} ${b.fields.nachname ?? ''}`.trim() || tx('Berater'),
          secondLine: (
            <span className="flex gap-2 items-center flex-wrap min-w-0">
              <span className="font-medium text-foreground">{stunden} {tx('h diesen Monat')}</span>
              {satz != null && (
                <span className="text-muted-foreground text-xs">
                  · {formatCurrency(stunden * satz)} {tx('errechnet')}
                </span>
              )}
            </span>
          ),
        };
      })
      .sort((a, b) => b._stunden - a._stunden)
      .slice(0, 8),
    [enrichedBerater]
  );

  // --- Empty state ---
  const isEmpty = projekte.length === 0 && rechnungen.length === 0 && angebote.length === 0;

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-1">{tx('Richte dein ERP ein — starte mit dem ersten Projekt.')}</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-12 flex flex-col items-center gap-4 text-center max-w-md mx-auto">
          <IconBriefcase size={48} className="text-muted-foreground" stroke={1.5} />
          <div>
            <p className="font-semibold text-lg">{tx('Noch keine Daten')}</p>
            <p className="text-muted-foreground text-sm mt-1">{tx('Lege dein erstes Projekt an, um loszulegen.')}</p>
          </div>
          <button
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            onClick={() => crud.projekte.openCreate({})}
          >
            <IconPlus size={16} className="shrink-0" />
            {tx('Erstes Projekt anlegen')}
          </button>
        </div>
        {crud.surfaces}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{contextLine}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
          onClick={() => crud.projekte.openCreate({})}
        >
          <IconPlus size={15} className="shrink-0" />
          <span className="hidden sm:inline">{tx('Neues Projekt')}</span>
          <span className="sm:hidden">{tx('Projekt')}</span>
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          ueberfaelligeRechnungen.length > 0 ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: tx('Rechnung öffnen'),
                onClick: () => crud.rechnungen.openDetail(ueberfaelligeRechnungen[0]),
              }}
            >
              <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName || r.fields.rechnungsnummer || ''))}</b>{' '}
              {ueberfaelligeRechnungen.length === 1
                ? tx('— Rechnung ist überfällig.')
                : tx`— ${ueberfaelligeRechnungen.length} Rechnungen sind überfällig.`}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Aktive Projekte')}
              value={aktiveProjekte}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone={aktiveProjekte > 0 ? 'primary' : 'default'}
              onClick={() => setStatusFilter(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={statusFilter === 'in_bearbeitung'}
            />
            <StatStripItem
              title={tx('In Akquise')}
              value={akquiseProjekte}
              icon={<IconClipboardList size={16} className="shrink-0" />}
              tone={akquiseProjekte > 0 ? 'warning' : 'default'}
              onClick={() => setStatusFilter(f => f === 'akquise' ? null : 'akquise')}
              active={statusFilter === 'akquise'}
            />
            <StatStripItem
              title={tx('Offen')}
              value={offeneRechnungen.length > 0 ? formatCurrency(offeneRechnungenSumme) : '0'}
              icon={<IconFileInvoice size={16} className="shrink-0" />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Angebote aktiv')}
              value={offeneAngebote.length}
              icon={<IconUserCheck size={16} className="shrink-0" />}
              tone={offeneAngebote.length > 0 ? 'primary' : 'default'}
              onClick={() => crud.angebote.openCreate({})}
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
              const projekt = projekte.find(p => p.record_id === id);
              if (projekt) crud.projekte.openDetail(projekt);
            }}
            onCardMove={handleCardMove}
            onAddCard={(column) => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene Rechnungen')}
              items={offeneRechnungenItems.map(item => ({
                id: item.id,
                title: item.title,
                secondLine: item.secondLine,
                action: item.action,
              }))}
              onItemClick={(id) => {
                const r = rechnungen.find(x => x.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Alle Rechnungen bezahlt — keine offenen Posten.'),
                action: {
                  label: tx('Neue Rechnung'),
                  onClick: () => crud.rechnungen.openCreate({}),
                },
              }}
            />
            <WorkList
              title={tx('Berater — laufender Monat')}
              items={beraterStundenItems.map(item => ({
                id: item.id,
                title: item.title,
                secondLine: item.secondLine,
              }))}
              onItemClick={(id) => {
                const b = berater.find(x => x.record_id === id);
                if (b) crud.berater.openDetail(b);
              }}
              empty={{
                text: tx('Noch keine aktiven Berater erfasst.'),
                action: {
                  label: tx('Berater anlegen'),
                  onClick: () => crud.berater.openCreate({}),
                },
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
