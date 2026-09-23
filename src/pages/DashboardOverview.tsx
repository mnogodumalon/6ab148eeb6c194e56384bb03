import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { useState, useMemo } from 'react';
import { tx, appLabel } from '@/i18n';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { gruss, useClock, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import { ChartWidget } from '@/components/widgets/ChartWidget';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupOption } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import {
  IconBriefcase,
  IconFileInvoice,
  IconClock,
  IconAlertTriangle,
  IconPlus,
  IconCheck,
} from '@tabler/icons-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

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
    setProjekte,
    fetchAll,
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
              const snapshot = rechnungen.map(x => ({ ...x }));
              data.setRechnungen(prev =>
                prev.map(x =>
                  x.record_id === r.record_id
                    ? { ...x, fields: { ...x.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt') } }
                    : x
                )
              );
              try {
                await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
                undoToast(tx`${r.fields.rechnungsnummer ?? tx('Rechnung')} — als bezahlt markiert`, async () => {
                  data.setRechnungen(snapshot);
                  await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: status });
                });
              } catch {
                data.setRechnungen(snapshot);
                await fetchAll();
              }
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
              const snapshot = angebote.map(x => ({ ...x }));
              data.setAngebote(prev =>
                prev.map(x =>
                  x.record_id === a.record_id
                    ? { ...x, fields: { ...x.fields, angebotsstatus: lookupOption('angebote', 'angebotsstatus', 'versendet') } }
                    : x
                )
              );
              try {
                await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
                undoToast(tx`${a.fields.angebotsnummer ? String(a.fields.angebotsnummer) : tx('Angebot')} — als versendet markiert`, async () => {
                  data.setAngebote(snapshot);
                  await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: status });
                });
              } catch {
                data.setAngebote(snapshot);
                await fetchAll();
              }
            },
          };
        }
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte;
  const enrichedRechnungen = crud.enriched.rechnungen;
  const enrichedAngebote = crud.enriched.angebote;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;

  const clock = useClock();

  // Today's date key
  const todayKey = format(clock, 'yyyy-MM-dd');

  // Week range
  const weekStart = startOfWeek(clock, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(clock, { weekStartsOn: 1 });

  // Month range
  const monthStart = startOfMonth(clock);
  const monthEnd = endOfMonth(clock);

  // Überfällige Rechnungen
  const ueberfaelligeRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'),
    [enrichedRechnungen]
  );

  // Offene Rechnungen (versendet aber noch nicht bezahlt und nicht überfällig)
  const offeneRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => {
      const s = lookupKey(r.fields.rechnungsstatus);
      return s === 'versendet';
    }),
    [enrichedRechnungen]
  );

  // Angebote im Status Entwurf oder Versendet
  const aktiveAngebote = useMemo(
    () => enrichedAngebote.filter(r => {
      const s = lookupKey(r.fields.angebotsstatus);
      return s === 'entwurf' || s === 'versendet';
    }),
    [enrichedAngebote]
  );

  // Zeiterfassung dieser Woche
  const stundenDieseWoche = useMemo(
    () => enrichedZeiterfassung
      .filter(z => {
        if (!z.fields.datum) return false;
        try {
          const d = parseISO(z.fields.datum);
          return isWithinInterval(d, { start: weekStart, end: weekEnd });
        } catch {
          return false;
        }
      })
      .reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0),
    [enrichedZeiterfassung, weekStart, weekEnd]
  );

  // Zeiterfassung diesen Monat
  const stundenDiesenMonat = useMemo(
    () => enrichedZeiterfassung
      .filter(z => {
        if (!z.fields.datum) return false;
        try {
          const d = parseISO(z.fields.datum);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        } catch {
          return false;
        }
      })
      .reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0),
    [enrichedZeiterfassung, monthStart, monthEnd]
  );

  // Projekte nach Status
  const projekteInBearbeitung = useMemo(
    () => enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung'),
    [enrichedProjekte]
  );

  const projekteAkquise = useMemo(
    () => enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise'),
    [enrichedProjekte]
  );

  // Kontext-Zeile
  const contextNames = projekteInBearbeitung.length > 0
    ? namen(projekteInBearbeitung.slice(0, 3).map(p => p.fields.projektkennung ?? p.kundeName ?? ''))
    : null;

  // Rechnungsbetrag offener Posten
  const offeneBetrag = useMemo(
    () => [...ueberfaelligeRechnungen, ...offeneRechnungen].reduce((sum, r) => sum + (r.fields.gesamtbetrag ?? r.fields.nettobetrag ?? 0), 0),
    [ueberfaelligeRechnungen, offeneRechnungen]
  );

  // Kanban: Projekte board
  const projekteColumns = useMemo(
    () => (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? ('primary' as const) : o.key === 'akquise' ? ('warning' as const) : ('default' as const),
    })),
    []
  );

  const projekteCards = useMemo(
    () => enrichedProjekte.map(p => ({
      id: p.record_id,
      column: lookupKey(p.fields.projektstatus) ?? '',
      title: (
        <span className="flex flex-col gap-0.5">
          <span className="font-medium truncate">{p.fields.projektkennung ?? tx('Ohne Kennung')}</span>
        </span>
      ),
      subtitle: (
        <span className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <span className="truncate">{p.kundeName || tx('Kein Kunde')}</span>
          {p.fields.letzter_schritt && (
            <span className="truncate italic">{p.fields.letzter_schritt}</span>
          )}
        </span>
      ),
    })),
    [enrichedProjekte]
  );

  // Advance Projekt-Status
  const advanceProjektStatus = async (projektId: string, newStatus: string) => {
    const projekt = projekte.find(p => p.record_id === projektId);
    if (!projekt) return;
    const oldStatus = lookupKey(projekt.fields.projektstatus) ?? '';
    const newLookup = lookupOption('projekte', 'projektstatus', newStatus);
    const snapshot = projekte.map(p => ({ ...p }));
    setProjekte(prev =>
      prev.map(p =>
        p.record_id === projektId
          ? { ...p, fields: { ...p.fields, projektstatus: newLookup } }
          : p
      )
    );
    try {
      await LivingAppsService.updateProjekteEntry(projektId, { projektstatus: newStatus });
      const col = projekteColumns.find(c => c.key === newStatus);
      undoToast(tx`Projekt — verschoben nach ${col?.label ?? newStatus}`, async () => {
        setProjekte(snapshot);
        await LivingAppsService.updateProjekteEntry(projektId, { projektstatus: oldStatus });
      });
    } catch {
      setProjekte(snapshot);
      await fetchAll();
    }
  };

  // Rechnung als bezahlt markieren (shared helper for WorkList action + HeroBanner)
  const markiereAlsBezahlt = async (rId: string, rNr: string | undefined) => {
    const snapshot = rechnungen.map(r => ({ ...r }));
    const oldStatus = lookupKey(rechnungen.find(r => r.record_id === rId)?.fields.rechnungsstatus) ?? 'versendet';
    data.setRechnungen(prev =>
      prev.map(r =>
        r.record_id === rId
          ? { ...r, fields: { ...r.fields, rechnungsstatus: lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt') } }
          : r
      )
    );
    try {
      await LivingAppsService.updateRechnungenEntry(rId, { rechnungsstatus: 'bezahlt' });
      undoToast(tx`${rNr ?? tx('Rechnung')} — als bezahlt markiert`, async () => {
        data.setRechnungen(snapshot);
        await LivingAppsService.updateRechnungenEntry(rId, { rechnungsstatus: oldStatus });
      });
    } catch {
      data.setRechnungen(snapshot);
      await fetchAll();
    }
  };

  // Hero: Überfällige Rechnungen
  const heroContent = ueberfaelligeRechnungen.length > 0 ? (
    <HeroBanner
      icon={<IconAlertTriangle size={18} />}
      action={{
        label: tx('Bezahlt markieren'),
        onClick: () => markiereAlsBezahlt(
          ueberfaelligeRechnungen[0].record_id,
          ueberfaelligeRechnungen[0].fields.rechnungsnummer
        ),
      }}
    >
      <b>{namen(ueberfaelligeRechnungen.map(r => r.fields.rechnungsnummer ?? r.kundeName ?? ''))}</b>
      {ueberfaelligeRechnungen.length === 1
        ? tx` — Zahlung überfällig seit ${formatDate(ueberfaelligeRechnungen[0].fields.faelligkeitsdatum)}`
        : tx` — ${String(ueberfaelligeRechnungen.length)} Rechnungen überfällig`}
    </HeroBanner>
  ) : undefined;

  // KPI Strip
  const kpiStrip = (
    <StatStrip>
      <StatStripItem
        title={tx('Projekte aktiv')}
        value={projekteInBearbeitung.length}
        icon={<IconBriefcase size={16} className="shrink-0" />}
        tone="primary"
      />
      <StatStripItem
        title={tx('In Akquise')}
        value={projekteAkquise.length}
        icon={<IconBriefcase size={16} className="shrink-0" />}
        tone={projekteAkquise.length > 0 ? 'warning' : 'default'}
      />
      <StatStripItem
        title={tx('Offene Rechnungen')}
        value={formatCurrency(offeneBetrag)}
        icon={<IconFileInvoice size={16} className="shrink-0" />}
        tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
      />
      <StatStripItem
        title={tx('Stunden diese Woche')}
        value={stundenDieseWoche.toFixed(1)}
        icon={<IconClock size={16} className="shrink-0" />}
        tone="default"
      />
      <StatStripItem
        title={tx('Stunden dieser Monat')}
        value={stundenDiesenMonat.toFixed(1)}
        icon={<IconClock size={16} className="shrink-0" />}
        tone="default"
      />
    </StatStrip>
  );

  // Aside 1: Offene & überfällige Rechnungen
  const rechnungenList = (
    <WorkList
      title={tx('Rechnungen — offen & überfällig')}
      items={[...ueberfaelligeRechnungen, ...offeneRechnungen].map(r => ({
        id: r.record_id,
        title: r.fields.rechnungsnummer ?? tx('Ohne Nummer'),
        secondLine: (
          <span className="flex items-center gap-2 flex-wrap">
            <span className={
              lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'
                ? 'font-medium text-destructive'
                : 'font-medium text-amber-600'
            }>
              {r.fields.rechnungsstatus?.label ?? ''}
            </span>
            <span className="text-muted-foreground">
              · {r.kundeName || tx('Kein Kunde')} · {formatCurrency(r.fields.gesamtbetrag ?? r.fields.nettobetrag)}
            </span>
          </span>
        ),
        action: {
          label: tx('Bezahlt'),
          onClick: () => markiereAlsBezahlt(r.record_id, r.fields.rechnungsnummer),
        },
      }))}
      onItemClick={(id) => {
        const r = enrichedRechnungen.find(x => x.record_id === id);
        if (r) crud.rechnungen.openDetail(r);
      }}
      empty={{
        text: tx('Alle Rechnungen beglichen — keine offenen Posten.'),
        action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
      }}
    />
  );

  // Aside 2: Angebote (Entwurf + Versendet)
  const markAngebotVersendet = async (aId: string, aNr: number | undefined) => {
    const snapshot = angebote.map(a => ({ ...a }));
    data.setAngebote(prev =>
      prev.map(a =>
        a.record_id === aId
          ? { ...a, fields: { ...a.fields, angebotsstatus: lookupOption('angebote', 'angebotsstatus', 'versendet') } }
          : a
      )
    );
    try {
      await LivingAppsService.updateAngeboteEntry(aId, { angebotsstatus: 'versendet' });
      undoToast(tx`${aNr ? String(aNr) : tx('Angebot')} — als versendet markiert`, async () => {
        data.setAngebote(snapshot);
        await LivingAppsService.updateAngeboteEntry(aId, { angebotsstatus: 'entwurf' });
      });
    } catch {
      data.setAngebote(snapshot);
      await fetchAll();
    }
  };

  const angeboteList = (
    <WorkList
      title={tx('Angebote — aktiv')}
      items={aktiveAngebote.map(a => ({
        id: a.record_id,
        title: a.fields.angebotsnummer ? `#${a.fields.angebotsnummer}` : tx('Ohne Nummer'),
        secondLine: (
          <span className="flex items-center gap-2 flex-wrap">
            <span className={
              lookupKey(a.fields.angebotsstatus) === 'entwurf'
                ? 'font-medium text-muted-foreground'
                : 'font-medium text-blue-600'
            }>
              {a.fields.angebotsstatus?.label ?? ''}
            </span>
            <span className="text-muted-foreground">
              · {a.projektName || tx('Kein Projekt')}
              {a.fields.kostenbetrag ? ` · ${formatCurrency(a.fields.kostenbetrag)}` : ''}
            </span>
          </span>
        ),
        action: lookupKey(a.fields.angebotsstatus) === 'entwurf'
          ? {
            label: tx('Versenden'),
            onClick: () => markAngebotVersendet(a.record_id, a.fields.angebotsnummer),
          }
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
  );

  // Primary: Projekte Kanban
  const primaryBoard = (
    <KanbanWidget
      columns={projekteColumns}
      cards={projekteCards}
      defaultCollapsed={['abgeschlossen']}
      onCardClick={(card) => {
        const p = enrichedProjekte.find(x => x.record_id === card.id);
        if (p) crud.projekte.openDetail(p);
      }}
      onCardMove={async (cardId, newColumn) => {
        await advanceProjektStatus(cardId, newColumn);
      }}
      onAddCard={(column) => {
        crud.projekte.openCreate({ projektstatus: column });
      }}
    />
  );

  // Empty state
  if (projekte.length === 0 && rechnungen.length === 0 && angebote.length === 0 && zeiterfassung.length === 0 && kunden.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-1">{tx('Richte dein ERP ein — beginne mit Kunden und Projekten.')}</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-[27px] border-2 border-dashed border-border">
          <IconBriefcase size={48} className="text-muted-foreground" stroke={1.5} />
          <div className="text-center">
            <p className="font-semibold text-lg">{tx('Noch keine Projekte angelegt')}</p>
            <p className="text-muted-foreground text-sm mt-1">{tx('Erstelle dein erstes Projekt und starte die Arbeit.')}</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              onClick={() => crud.kunden.openCreate({})}
            >
              <IconPlus size={16} className="shrink-0" />
              {tx('Ersten Kunden anlegen')}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
              onClick={() => crud.projekte.openCreate({})}
            >
              <IconPlus size={16} className="shrink-0" />
              {tx('Erstes Projekt anlegen')}
            </button>
          </div>
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
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground mt-1">
            {projekteInBearbeitung.length > 0 && contextNames
              ? tx`Aktive Projekte: ${contextNames}`
              : stundenDieseWoche > 0
              ? tx`Diese Woche ${stundenDieseWoche.toFixed(1)} Stunden erfasst.`
              : tx('Übersicht deiner Projekte, Rechnungen und Angebote.')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            onClick={() => crud.zeiterfassung.openCreate({})}
          >
            <IconClock size={16} className="shrink-0" />
            {tx('Stunden erfassen')}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors"
            onClick={() => crud.projekte.openCreate({})}
          >
            <IconPlus size={16} className="shrink-0" />
            {tx('Neues Projekt')}
          </button>
        </div>
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroContent}
        kpis={kpiStrip}
        primary={primaryBoard}
        aside={<>{rechnungenList}{angeboteList}</>}
      />

      {crud.surfaces}
    </div>
  );
}
