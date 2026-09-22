import { useMemo, useState } from 'react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupKey, formatCurrency, formatDate } from '@/lib/formatters';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import {
  KanbanWidget,
  type KanbanCard,
  type KanbanColumn,
  type KanbanTone,
} from '@/components/widgets/KanbanWidget';
import { ChartWidget, ChartSkeleton, ChartError } from '@/components/widgets/ChartWidget';
import {
  IconAlertCircle,
  IconBriefcase,
  IconClock,
  IconReceipt,
  IconFileText,
  IconPlus,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

function projektTone(status: string | undefined): KanbanTone {
  if (status === 'in_bearbeitung') return 'primary';
  if (status === 'akquise') return 'warning';
  return 'default';
}

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    kunden, berater, projekte, angebote, zeiterfassung, rechnungen,
    kundenMap, beraterMap, setProjekte, fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const r = crud.enriched.rechnungen.find(x => x.record_id === top.record.record_id);
        const statusKey = lookupKey(r?.fields.rechnungsstatus);
        if (statusKey === 'entwurf') {
          return {
            label: tx('Rechnung versenden'),
            onClick: () => {
              const prev = r!.fields.rechnungsstatus;
              const next = lookupOption('rechnungen', 'rechnungsstatus', 'versendet');
              const snapshot = rechnungen.map(x =>
                x.record_id === r!.record_id
                  ? { ...x, fields: { ...x.fields, rechnungsstatus: next } }
                  : x
              );
              data.setRechnungen(snapshot);
              LivingAppsService.updateRechnungenEntry(r!.record_id, { rechnungsstatus: 'versendet' })
                .catch(() => fetchAll());
              undoToast(tx`${r!.kundeName || r!.fields.rechnungsnummer || ''} — als Entwurf zurückgesetzt`, () => {
                data.setRechnungen(rechnungen.map(x =>
                  x.record_id === r!.record_id
                    ? { ...x, fields: { ...x.fields, rechnungsstatus: prev } }
                    : x
                ));
                LivingAppsService.updateRechnungenEntry(r!.record_id, { rechnungsstatus: 'entwurf' }).catch(() => fetchAll());
              });
            },
          };
        }
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte;
  const enrichedRechnungen = crud.enriched.rechnungen;
  const enrichedBerater = crud.enriched.berater;
  const enrichedAngebote = crud.enriched.angebote;

  const clock = useClock();
  const currentMonth = format(clock, 'yyyy-MM');

  // Kanban columns from schema
  const PROJEKT_COLUMNS = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({ key: o.key, label: o.label })),
    []
  );

  const projektCards = useMemo<KanbanCard[]>(
    () => enrichedProjekte.map(p => {
      const status = lookupKey(p.fields.projektstatus) ?? PROJEKT_COLUMNS[0]?.key ?? '';
      return {
        id: `projekte:${p.record_id}`,
        column: status,
        title: p.fields.projektkennung ?? p.kundeName ?? tx('Ohne Kennung'),
        subtitle: p.kundeName || undefined,
        tone: projektTone(status),
        meta: p.projektleitungName || undefined,
      };
    }),
    [enrichedProjekte, PROJEKT_COLUMNS]
  );

  // Rechnungen
  const ueberfaelligeRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'),
    [enrichedRechnungen]
  );
  const offeneRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => {
      const s = lookupKey(r.fields.rechnungsstatus);
      return s === 'entwurf' || s === 'versendet';
    }),
    [enrichedRechnungen]
  );

  // Stunden aktueller Monat
  const stundenAktuellerMonat = useMemo(
    () => zeiterfassung
      .filter(z => {
        if (!z.fields.datum) return false;
        return z.fields.datum.slice(0, 7) === currentMonth;
      })
      .reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0),
    [zeiterfassung, currentMonth]
  );

  // Offene Angebote
  const offeneAngebote = useMemo(
    () => angebote.filter(a => {
      const s = lookupKey(a.fields.angebotsstatus);
      return s === 'entwurf' || s === 'versendet';
    }),
    [angebote]
  );

  // Aktive Projekte
  const aktiveProjekte = useMemo(
    () => projekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung'),
    [projekte]
  );

  // Filter state
  const [rechnungsFilter, setRechnungsFilter] = useState<'alle' | 'ueberfaellig' | 'offen'>('alle');

  // Status-Advance: Projekt vorwärts
  const advanceProjektStatus = (projectId: string, currentStatus: string | undefined) => {
    const nextStatus = currentStatus === 'akquise' ? 'in_bearbeitung'
      : currentStatus === 'in_bearbeitung' ? 'abgeschlossen'
      : null;
    if (!nextStatus) return;
    const nextVal = lookupOption('projekte', 'projektstatus', nextStatus);
    const prev = projekte.find(p => p.record_id === projectId)?.fields.projektstatus;
    setProjekte(prev2 => prev2.map(p =>
      p.record_id === projectId
        ? { ...p, fields: { ...p.fields, projektstatus: nextVal } }
        : p
    ));
    LivingAppsService.updateProjekteEntry(projectId, { projektstatus: nextStatus })
      .catch(() => fetchAll());
    undoToast(tx`Projektstatus aktualisiert`, () => {
      setProjekte(prev2 => prev2.map(p =>
        p.record_id === projectId
          ? { ...p, fields: { ...p.fields, projektstatus: prev } }
          : p
      ));
      LivingAppsService.updateProjekteEntry(projectId, { projektstatus: lookupKey(prev) ?? currentStatus ?? '' })
        .catch(() => fetchAll());
    });
  };

  // Kanban card move
  const moveCard = async (cardId: string, newColumn: string) => {
    const rid = cardId.split(':')[1];
    if (!rid) return;
    const prevProjekt = projekte.find(p => p.record_id === rid);
    const prevStatus = prevProjekt?.fields.projektstatus;
    const next = lookupOption('projekte', 'projektstatus', newColumn);
    setProjekte(prev => prev.map(p =>
      p.record_id === rid
        ? { ...p, fields: { ...p.fields, projektstatus: next } }
        : p
    ));
    try {
      await LivingAppsService.updateProjekteEntry(rid, { projektstatus: newColumn });
      undoToast(tx`Projektstatus aktualisiert`, () => {
        setProjekte(prev => prev.map(p =>
          p.record_id === rid
            ? { ...p, fields: { ...p.fields, projektstatus: prevStatus } }
            : p
        ));
        LivingAppsService.updateProjekteEntry(rid, { projektstatus: lookupKey(prevStatus) ?? newColumn })
          .catch(() => fetchAll());
      });
    } catch {
      fetchAll();
    }
  };

  // Worklist items
  const rechnungsListItems = useMemo(() => {
    const base = rechnungsFilter === 'ueberfaellig' ? ueberfaelligeRechnungen
      : rechnungsFilter === 'offen' ? offeneRechnungen
      : [...ueberfaelligeRechnungen, ...offeneRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) !== 'ueberfaellig')];
    return base.map(r => {
      const statusKey = lookupKey(r.fields.rechnungsstatus);
      const isOverdue = statusKey === 'ueberfaellig';
      return {
        id: r.record_id,
        title: r.kundeName || r.fields.rechnungsnummer || tx('Unbekannt'),
        secondLine: (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className={`font-medium ${isOverdue ? 'text-destructive' : 'text-amber-600'} shrink-0`}>
              {isOverdue ? tx('Überfällig') : tx('Offen')}
            </span>
            {r.fields.nettobetrag != null && (
              <span className="text-muted-foreground truncate"> · {formatCurrency(r.fields.nettobetrag)}</span>
            )}
            {r.fields.faelligkeitsdatum && (
              <span className="text-muted-foreground truncate"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
            )}
          </span>
        ),
        action: statusKey === 'entwurf' ? {
          label: tx('Versenden'),
          onClick: () => {
            const prev = r.fields.rechnungsstatus;
            const next = lookupOption('rechnungen', 'rechnungsstatus', 'versendet');
            data.setRechnungen(rechnungen.map(x =>
              x.record_id === r.record_id
                ? { ...x, fields: { ...x.fields, rechnungsstatus: next } }
                : x
            ));
            LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'versendet' })
              .catch(() => fetchAll());
            undoToast(tx`${r.kundeName || r.fields.rechnungsnummer || ''} — versendet`, () => {
              data.setRechnungen(rechnungen.map(x =>
                x.record_id === r.record_id
                  ? { ...x, fields: { ...x.fields, rechnungsstatus: prev } }
                  : x
              ));
              LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'entwurf' }).catch(() => fetchAll());
            });
          },
        } : undefined,
      };
    });
  }, [ueberfaelligeRechnungen, offeneRechnungen, rechnungsFilter, rechnungen]);

  // Berater Stunden Chart rows
  const beraterStundenRows = useMemo(
    () => berater.map(b => ({
      id: `berater:${b.record_id}`,
      data: {
        name: [b.fields.vorname, b.fields.nachname].filter(Boolean).join(' ') || tx('Unbekannt'),
        stunden: b.fields.stunden_aktueller_monat ?? 0,
        statusKey: lookupKey(b.fields.status),
      },
    })),
    [berater]
  );

  // Hero: überfällige Rechnungen
  const firstOverdue = ueberfaelligeRechnungen[0];
  const overdueNames = ueberfaelligeRechnungen.map(r => r.kundeName || r.fields.rechnungsnummer || '').filter(Boolean);

  // Context line
  const aktiveProjekteNames = aktiveProjekte
    .slice(0, 3)
    .map(p => {
      const ep = enrichedProjekte.find(x => x.record_id === p.record_id);
      return ep?.fields.projektkennung || ep?.kundeName || '';
    })
    .filter(Boolean);

  const contextLine = aktiveProjekte.length === 0
    ? tx('Noch keine aktiven Projekte — lege das erste an.')
    : aktiveProjekteNames.length > 0
    ? tx`${namen(aktiveProjekteNames)} — aktive Projekte in Bearbeitung.`
    : tx`${aktiveProjekte.length} Projekte in Bearbeitung.`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contextLine}</p>
        </div>
        <Button
          onClick={() => crud.projekte.openCreate({ projektstatus: 'akquise' })}
          size="sm"
          className="shrink-0"
        >
          <IconPlus size={16} className="shrink-0 mr-1.5" />
          {tx('Neues Projekt')}
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          ueberfaelligeRechnungen.length > 0 && firstOverdue ? (
            <HeroBanner
              icon={<IconAlertCircle size={18} />}
              action={{
                label: tx('Rechnung öffnen'),
                onClick: () => crud.rechnungen.openDetail(firstOverdue),
              }}
            >
              <b>{namen(overdueNames)}</b>
              {' '}
              {ueberfaelligeRechnungen.length === 1
                ? tx('— Rechnung ist überfällig')
                : tx`— ${ueberfaelligeRechnungen.length} Rechnungen sind überfällig`}
              {firstOverdue.fields.faelligkeitsdatum && (
                <>, {tx('fällig seit')} <b>{formatDate(firstOverdue.fields.faelligkeitsdatum)}</b></>
              )}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Aktive Projekte')}
              value={aktiveProjekte.length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone={aktiveProjekte.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length}
              icon={<IconReceipt size={16} className="shrink-0" />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
              onClick={() => setRechnungsFilter(f => f === 'offen' ? 'alle' : 'offen')}
              active={rechnungsFilter === 'offen'}
            />
            <StatStripItem
              title={tx('Stunden (Monat)')}
              value={stundenAktuellerMonat}
              icon={<IconClock size={16} className="shrink-0" />}
              tone="default"
            />
            <StatStripItem
              title={tx('Angebote offen')}
              value={offeneAngebote.length}
              icon={<IconFileText size={16} className="shrink-0" />}
              tone={offeneAngebote.length > 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            cards={projektCards}
            columns={PROJEKT_COLUMNS}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={card => {
              const rid = card.id.split(':')[1];
              const p = enrichedProjekte.find(x => x.record_id === rid);
              if (p) crud.projekte.openDetail(p);
            }}
            onCardMove={moveCard}
            onAddCard={column => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={
                rechnungsFilter === 'ueberfaellig' ? tx('Überfällige Rechnungen')
                : rechnungsFilter === 'offen' ? tx('Offene Rechnungen')
                : tx('Offene & überfällige Rechnungen')
              }
              items={rechnungsListItems}
              onItemClick={id => {
                const r = enrichedRechnungen.find(x => x.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              max={6}
              empty={{
                text: tx('Alle Rechnungen beglichen — keine offenen Posten.'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />
            <div>
              <ChartWidget
                title={tx('Stunden aktueller Monat')}
                rows={beraterStundenRows}
                dimension={{
                  kind: 'category',
                  accessor: r => r.data.name,
                }}
                measure={{
                  aggregate: 'sum',
                  label: tx('Stunden'),
                  value: r => r.data.stunden ?? null,
                  format: 'number',
                }}
              />
            </div>
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
