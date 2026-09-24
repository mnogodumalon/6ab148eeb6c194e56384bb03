import { useMemo, useState } from 'react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx, appLabel } from '@/i18n';
import { lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
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
import {
  IconAlertTriangle,
  IconBriefcase,
  IconClock,
  IconFileInvoice,
  IconPlus,
} from '@tabler/icons-react';
import { format } from 'date-fns';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    projekte, angebote, zeiterfassung, rechnungen,
    kundenMap, beraterMap, projekteMap, zeiterfassungMap,
    setProjekte, fetchAll,
  } = data;

  const clock = useClock();
  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const rec = top.record;
        const status = lookupKey(rec.fields.rechnungsstatus);
        if (status === 'versendet' || status === 'entwurf') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: async () => {
              const snap = { ...rec.fields };
              const newStatus = lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt');
              await LivingAppsService.updateRechnungenEntry(rec.record_id, { rechnungsstatus: 'bezahlt' });
              undoToast(tx`${rec.fields.rechnungsnummer ?? ''} — bezahlt`, async () => {
                await LivingAppsService.updateRechnungenEntry(rec.record_id, { rechnungsstatus: lookupKey(snap.rechnungsstatus) ?? 'versendet' });
                fetchAll();
              });
              fetchAll();
            },
          };
        }
      }
      if (top.type === 'angebote') {
        const rec = top.record;
        const status = lookupKey(rec.fields.angebotsstatus);
        if (status === 'entwurf') {
          return {
            label: tx('Als versendet markieren'),
            onClick: async () => {
              await LivingAppsService.updateAngeboteEntry(rec.record_id, { angebotsstatus: 'versendet' });
              undoToast(tx`Angebot ${rec.fields.angebotsnummer ?? ''} — versendet`, async () => {
                await LivingAppsService.updateAngeboteEntry(rec.record_id, { angebotsstatus: 'entwurf' });
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
              await LivingAppsService.updateAngeboteEntry(rec.record_id, { angebotsstatus: 'angenommen' });
              undoToast(tx`Angebot ${rec.fields.angebotsnummer ?? ''} — angenommen`, async () => {
                await LivingAppsService.updateAngeboteEntry(rec.record_id, { angebotsstatus: 'versendet' });
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
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;
  const enrichedRechnungen = crud.enriched.rechnungen;

  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Current month key
  const currentMonthStr = format(clock, 'yyyy-MM');
  const currentMonth = clock.getMonth() + 1;
  const currentYear = clock.getFullYear();

  // Projekt-Kanban-Columns aus Schema (im component body — locale-aware getter)
  const projektColumns = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS_PROJEKTE_STATUS).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? 'primary' as KanbanTone
        : o.key === 'akquise' ? 'warning' as KanbanTone
        : 'default' as KanbanTone,
    })),
    [],
  );

  const projektCards = useMemo<KanbanCard[]>(() => {
    const filtered = statusFilter
      ? enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === statusFilter)
      : enrichedProjekte;
    return filtered.map(p => {
      const status = lookupKey(p.fields.projektstatus) ?? 'akquise';
      return {
        id: `projekt:${p.record_id}`,
        column: status,
        title: p.fields.projektkennung ?? tx('Ohne Kennung'),
        subtitle: p.kundeName || undefined,
        tone: status === 'in_bearbeitung' ? 'primary' as KanbanTone
          : status === 'akquise' ? 'warning' as KanbanTone
          : 'default' as KanbanTone,
      };
    });
  }, [enrichedProjekte, statusFilter]);

  // Projekt-Status-Move (optimistic)
  const moveProjekt = async (cardId: string, newColumn: string) => {
    const rid = cardId.split(':')[1];
    if (!rid) return;
    const prevProjekte = projekte.map(p => ({ ...p }));
    setProjekte(prev =>
      prev.map(p =>
        p.record_id === rid
          ? { ...p, fields: { ...p.fields, projektstatus: lookupOption('projekte', 'projektstatus', newColumn) } }
          : p,
      ),
    );
    const col = projektColumns.find(c => c.key === newColumn);
    try {
      await LivingAppsService.updateProjekteEntry(rid, { projektstatus: newColumn });
      undoToast(tx`Projektstatus auf ${col?.label ?? newColumn} gesetzt`, async () => {
        const old = prevProjekte.find(p => p.record_id === rid);
        if (old) {
          const oldKey = lookupKey(old.fields.projektstatus) ?? 'akquise';
          await LivingAppsService.updateProjekteEntry(rid, { projektstatus: oldKey });
          fetchAll();
        }
      });
    } catch {
      fetchAll();
    }
  };

  // KPI-Daten
  const projekte_in_bearbeitung = enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung');
  const projekte_akquise = enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise');

  // Zeiterfassung laufender Monat
  const zeitMonat = enrichedZeiterfassung.filter(z => {
    if (z.fields.erfassungsjahr !== currentYear) return false;
    const mKey = lookupKey(z.fields.erfassungsmonat);
    return mKey === MONTH_KEYS[currentMonth - 1];
  });
  const stundenMonat = zeitMonat.reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0);

  // Rechnungen
  const offeneRechnungen = enrichedRechnungen.filter(r => {
    const s = lookupKey(r.fields.rechnungsstatus);
    return s === 'versendet' || s === 'ueberfaellig';
  });
  const ueberfaelligeRechnungen = enrichedRechnungen.filter(r =>
    lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig',
  );
  const offeneAngebote = enrichedAngebote.filter(a => {
    const s = lookupKey(a.fields.angebotsstatus);
    return s === 'entwurf' || s === 'versendet';
  });

  // Hero-Signal: überfällige Rechnungen
  const heroRechnung = ueberfaelligeRechnungen[0];

  // Kontext-Satz
  const activeNames = projekte_in_bearbeitung.slice(0, 2).map(p => p.kundeName ?? p.fields.projektkennung ?? '');
  const contextLine = projekte_in_bearbeitung.length > 0
    ? tx`${projekte_in_bearbeitung.length} Projekte aktiv — Kunden: ${namen(activeNames)}`
    : tx('Noch keine aktiven Projekte — leg das erste Projekt an.');

  return (
    <div className="space-y-6">
      {/* Seiten-Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contextLine}</p>
        </div>
        <button
          onClick={() => crud.projekte.openCreate({})}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shrink-0"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          heroRechnung && ueberfaelligeRechnungen.length > 0 ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: tx('Rechnung öffnen'),
                onClick: () => crud.rechnungen.openDetail(
                  rechnungen.find(r => r.record_id === heroRechnung.record_id)!,
                ),
              }}
            >
              <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName ?? r.fields.rechnungsnummer ?? ''))}</b>
              {' — '}
              {ueberfaelligeRechnungen.length === 1
                ? tx`Rechnung ${heroRechnung.fields.rechnungsnummer ?? ''} ist überfällig`
                : tx`${ueberfaelligeRechnungen.length} Rechnungen sind überfällig`}
              {heroRechnung.fields.faelligkeitsdatum
                ? tx` (fällig seit ${formatDate(heroRechnung.fields.faelligkeitsdatum)})`
                : null}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Aktive Projekte')}
              value={projekte_in_bearbeitung.length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone="primary"
              onClick={() => setStatusFilter(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={statusFilter === 'in_bearbeitung'}
            />
            <StatStripItem
              title={tx('In Akquise')}
              value={projekte_akquise.length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone={projekte_akquise.length > 0 ? 'warning' : 'default'}
              onClick={() => setStatusFilter(f => f === 'akquise' ? null : 'akquise')}
              active={statusFilter === 'akquise'}
            />
            <StatStripItem
              title={tx('Stunden diesen Monat')}
              value={stundenMonat.toFixed(1)}
              icon={<IconClock size={16} className="shrink-0" />}
              tone="default"
            />
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length}
              icon={<IconFileInvoice size={16} className="shrink-0" />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            cards={projektCards}
            columns={projektColumns}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={card => {
              const rid = card.id.split(':')[1];
              const proj = projekte.find(p => p.record_id === rid);
              if (proj) crud.projekte.openDetail(proj);
            }}
            onCardMove={moveProjekt}
            onAddCard={column => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene Rechnungen')}
              items={offeneRechnungen.slice(0, 8).map(r => ({
                id: r.record_id,
                title: r.kundeName || r.fields.rechnungsnummer || tx('Ohne Kunde'),
                secondLine: (
                  <>
                    <span className={lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'
                      ? 'font-medium text-destructive'
                      : 'font-medium text-amber-600'}>
                      {r.fields.rechnungsstatus?.label ?? '—'}
                    </span>
                    {r.fields.faelligkeitsdatum && (
                      <span className="text-muted-foreground"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
                    )}
                    {r.fields.gesamtbetrag != null && (
                      <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag)}</span>
                    )}
                  </>
                ),
                action: lookupKey(r.fields.rechnungsstatus) !== 'bezahlt' ? {
                  label: tx('Bezahlt'),
                  onClick: async () => {
                    const snapStatus = r.fields.rechnungsstatus;
                    await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
                    undoToast(tx`${r.fields.rechnungsnummer ?? ''} — bezahlt`, async () => {
                      await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: lookupKey(snapStatus) ?? 'versendet' });
                      fetchAll();
                    });
                    fetchAll();
                  },
                } : undefined,
              }))}
              onItemClick={id => {
                const r = rechnungen.find(r => r.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Keine offenen Rechnungen — alles bezahlt.'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />
            <WorkList
              title={tx('Zeiterfassung diesen Monat')}
              items={zeitMonat.slice(0, 8).map(z => ({
                id: z.record_id,
                title: z.beraterName || tx('Ohne Berater'),
                secondLine: (
                  <>
                    <span className="font-medium text-foreground">
                      {z.fields.stunden != null ? `${z.fields.stunden}h` : '—'}
                    </span>
                    {z.projektName && (
                      <span className="text-muted-foreground"> · {z.projektName}</span>
                    )}
                    {z.fields.datum && (
                      <span className="text-muted-foreground"> · {formatDate(z.fields.datum)}</span>
                    )}
                  </>
                ),
              }))}
              onItemClick={id => {
                const z = zeiterfassung.find(z => z.record_id === id);
                if (z) crud.zeiterfassung.openDetail(z);
              }}
              empty={{
                text: tx('Noch keine Stunden für diesen Monat erfasst.'),
                action: { label: tx('Stunden buchen'), onClick: () => crud.zeiterfassung.openCreate({}) },
              }}
            />
          </>
        }
      />

      {/* Offene Angebote — unter dem Board als kompakte Zeile */}
      {offeneAngebote.length > 0 && (
        <section className="rounded-[18px] border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">{tx('Offene Angebote')}</h2>
            <button
              onClick={() => crud.angebote.openCreate({})}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconPlus size={14} className="shrink-0" />
              {tx('Neues Angebot')}
            </button>
          </div>
          <div className="space-y-1">
            {offeneAngebote.slice(0, 6).map(a => (
              <button
                key={a.record_id}
                onClick={() => crud.angebote.openDetail(angebote.find(x => x.record_id === a.record_id)!)}
                className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-medium truncate block">{a.projektName || tx('Ohne Projekt')}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.fields.angebotsnummer ? tx`Nr. ${a.fields.angebotsnummer} · ` : ''}
                    {a.fields.angebotsstatus?.label ?? '—'}
                    {a.fields.kostenbetrag != null
                      ? ` · ${formatCurrency(a.fields.kostenbetrag)}`
                      : ''}
                  </span>
                </span>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                  lookupKey(a.fields.angebotsstatus) === 'versendet'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {a.fields.angebotsstatus?.label ?? '—'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {crud.surfaces}
    </div>
  );
}

// Monatsnamen-Keys für die Zeiterfassungs-Filterung
const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
];

// Lazy accessor damit die locale-aware getter im component body bleiben —
// wird über useMemo aufgerufen, so ist der Scope ok
import { LOOKUP_OPTIONS } from '@/types/app';
const LOOKUP_OPTIONS_PROJEKTE_STATUS = LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? [];
