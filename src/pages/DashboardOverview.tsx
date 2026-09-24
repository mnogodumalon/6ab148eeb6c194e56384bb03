import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard, KanbanColumn } from '@/components/widgets/KanbanWidget';
import { LOOKUP_OPTIONS } from '@/types/app';
import {
  IconAlertCircle,
  IconBriefcase,
  IconClock,
  IconFileInvoice,
  IconFileText,
  IconPlus,
  IconUsers,
} from '@tabler/icons-react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    kunden, berater, projekte, angebote, zeiterfassung, rechnungen,
    setProjekte, fetchAll,
  } = data;

  const crud = useEntityCrud(data);
  const enrichedProjekte = crud.enriched.projekte;
  const enrichedAngebote = crud.enriched.angebote;
  const enrichedRechnungen = crud.enriched.rechnungen;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;

  const clock = useClock();
  const [projektFilter, setProjektFilter] = useState<string | null>(null);

  // Current month key for Zeiterfassung
  const currentMonthKey = format(clock, 'MMMM').toLowerCase(); // annäherungsweise
  const currentYear = clock.getFullYear();
  const currentMonth = clock.getMonth() + 1; // 1-12

  // Month key mapping (DE month names → key)
  const MONAT_KEYS: Record<number, string> = {
    1: 'januar', 2: 'februar', 3: 'maerz', 4: 'april', 5: 'mai', 6: 'juni',
    7: 'juli', 8: 'august', 9: 'september', 10: 'oktober', 11: 'november', 12: 'dezember',
  };
  const aktuellerMonatKey = MONAT_KEYS[currentMonth];

  // Überfällige Rechnungen
  const ueberfaelligeRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => {
      const status = lookupKey(r.fields.rechnungsstatus);
      return status === 'ueberfaellig' || (
        status === 'versendet' &&
        r.fields.faelligkeitsdatum &&
        r.fields.faelligkeitsdatum < format(clock, 'yyyy-MM-dd')
      );
    }),
    [enrichedRechnungen, clock]
  );

  // Offene Rechnungen (versendet, nicht überfällig)
  const offeneRechnungen = useMemo(() =>
    enrichedRechnungen.filter(r => {
      const status = lookupKey(r.fields.rechnungsstatus);
      return status === 'versendet' && !ueberfaelligeRechnungen.find(u => u.record_id === r.record_id);
    }),
    [enrichedRechnungen, ueberfaelligeRechnungen]
  );

  // Offene Angebote (Entwurf + Versendet)
  const offeneAngebote = useMemo(() =>
    enrichedAngebote.filter(r => {
      const status = lookupKey(r.fields.angebotsstatus);
      return status === 'entwurf' || status === 'versendet';
    }),
    [enrichedAngebote]
  );

  // Projekte in Bearbeitung
  const aktiveProjekte = useMemo(() =>
    enrichedProjekte.filter(r => lookupKey(r.fields.projektstatus) === 'in_bearbeitung'),
    [enrichedProjekte]
  );

  // Stunden aktueller Monat (Summe aus Zeiterfassung)
  const stundenAktuellerMonat = useMemo(() => {
    return zeiterfassung
      .filter(z => {
        const mkey = lookupKey(z.fields.erfassungsmonat);
        return mkey === aktuellerMonatKey && z.fields.erfassungsjahr === currentYear;
      })
      .reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0);
  }, [zeiterfassung, aktuellerMonatKey, currentYear]);

  // Kontext-Satz
  const kontextSatz = useMemo(() => {
    if (ueberfaelligeRechnungen.length > 0) {
      const namen_str = namen(ueberfaelligeRechnungen.map(r => r.kundeName).filter(Boolean));
      return tx`${namen_str} — Rechnung überfällig`;
    }
    if (aktiveProjekte.length > 0) {
      const namen_str = namen(aktiveProjekte.map(p => p.kundeName).filter(Boolean));
      return tx`Aktive Projekte bei ${namen_str}`;
    }
    return tx('Bereit für den Arbeitstag');
  }, [ueberfaelligeRechnungen, aktiveProjekte]);

  // Kanban-Daten
  const projektColumns: KanbanColumn[] = useMemo(() =>
    (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? 'primary' as const
        : o.key === 'abgeschlossen' ? 'success' as const
        : 'default' as const,
    })),
    []
  );

  const projektCards: KanbanCard[] = useMemo(() => {
    const source = projektFilter
      ? enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === projektFilter)
      : enrichedProjekte;
    return source.map(p => ({
      id: `projekt:${p.record_id}`,
      column: lookupKey(p.fields.projektstatus) ?? '',
      title: p.fields.projektkennung ?? tx('Ohne Kennung'),
      subtitle: p.kundeName
        ? `${p.kundeName}${p.projektleitungName ? ` · ${p.projektleitungName}` : ''}`
        : undefined,
      tone: 'default' as const,
    }));
  }, [enrichedProjekte, projektFilter]);

  const handleCardMove = async (cardId: string, newColumn: string) => {
    const id = cardId.split(':')[1];
    const projekt = projekte.find(p => p.record_id === id);
    if (!projekt) return;
    const prevStatus = projekt.fields.projektstatus;
    const newLookup = lookupOption('projekte', 'projektstatus', newColumn);
    // Optimistisch
    setProjekte(prev => prev.map(p => p.record_id === id
      ? { ...p, fields: { ...p.fields, projektstatus: newLookup } }
      : p
    ));
    try {
      await LivingAppsService.updateProjekteEntry(id, { projektstatus: newColumn });
      undoToast(tx`Projekt nach „${newLookup.label}" verschoben`, async () => {
        const prevKey = typeof prevStatus === 'object' && prevStatus && 'key' in prevStatus
          ? prevStatus.key : String(prevStatus ?? '');
        setProjekte(prev => prev.map(p => p.record_id === id
          ? { ...p, fields: { ...p.fields, projektstatus: prevStatus } }
          : p
        ));
        await LivingAppsService.updateProjekteEntry(id, { projektstatus: prevKey });
      });
    } catch {
      fetchAll();
    }
  };

  // Rechnung als bezahlt markieren
  const markBezahlt = async (id: string) => {
    const rechnung = rechnungen.find(r => r.record_id === id);
    if (!rechnung) return;
    const prev = rechnung.fields.rechnungsstatus;
    const newLookup = lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt');
    data.setRechnungen(prev_ => prev_.map(r => r.record_id === id
      ? { ...r, fields: { ...r.fields, rechnungsstatus: newLookup } }
      : r
    ));
    try {
      await LivingAppsService.updateRechnungenEntry(id, { rechnungsstatus: 'bezahlt' });
      undoToast(tx('Rechnung als bezahlt markiert'), async () => {
        const prevKey = typeof prev === 'object' && prev && 'key' in prev ? prev.key : String(prev ?? '');
        data.setRechnungen(prev_ => prev_.map(r => r.record_id === id
          ? { ...r, fields: { ...r.fields, rechnungsstatus: prev } }
          : r
        ));
        await LivingAppsService.updateRechnungenEntry(id, { rechnungsstatus: prevKey });
      });
    } catch {
      fetchAll();
    }
  };

  // Angebot annehmen
  const angebotAnnehmen = async (id: string) => {
    const angebot = angebote.find(a => a.record_id === id);
    if (!angebot) return;
    const prev = angebot.fields.angebotsstatus;
    const newLookup = lookupOption('angebote', 'angebotsstatus', 'angenommen');
    data.setAngebote(prev_ => prev_.map(a => a.record_id === id
      ? { ...a, fields: { ...a.fields, angebotsstatus: newLookup } }
      : a
    ));
    try {
      await LivingAppsService.updateAngeboteEntry(id, { angebotsstatus: 'angenommen' });
      undoToast(tx('Angebot als angenommen markiert'), async () => {
        const prevKey = typeof prev === 'object' && prev && 'key' in prev ? prev.key : String(prev ?? '');
        data.setAngebote(prev_ => prev_.map(a => a.record_id === id
          ? { ...a, fields: { ...a.fields, angebotsstatus: prev } }
          : a
        ));
        await LivingAppsService.updateAngeboteEntry(id, { angebotsstatus: prevKey });
      });
    } catch {
      fetchAll();
    }
  };

  // Total offener Rechnungsbetrag
  const offenerBetrag = useMemo(() =>
    [...ueberfaelligeRechnungen, ...offeneRechnungen]
      .reduce((sum, r) => sum + (r.fields.gesamtbetrag ?? r.fields.nettobetrag ?? 0), 0),
    [ueberfaelligeRechnungen, offeneRechnungen]
  );

  return (
    <div className="space-y-6">
      {/* Seiten-Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {gruss(clock)}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5 truncate">{kontextSatz}</p>
        </div>
        <button
          onClick={() => crud.projekte.openCreate({})}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={ueberfaelligeRechnungen.length > 0 ? (
          <HeroBanner
            icon={<IconAlertCircle size={18} />}
            action={{
              label: tx('Als bezahlt markieren'),
              onClick: () => markBezahlt(ueberfaelligeRechnungen[0].record_id),
            }}
          >
            <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName).filter(Boolean))}</b>
            {' — '}
            {ueberfaelligeRechnungen.length === 1
              ? tx`Rechnung überfällig (${formatCurrency(ueberfaelligeRechnungen[0].fields.gesamtbetrag ?? ueberfaelligeRechnungen[0].fields.nettobetrag)})`
              : tx`${ueberfaelligeRechnungen.length} Rechnungen überfällig — ${formatCurrency(offenerBetrag)} offen`
            }
          </HeroBanner>
        ) : undefined}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Aktive Projekte')}
              value={aktiveProjekte.length}
              icon={<IconBriefcase size={16} className="shrink-0" />}
              tone={aktiveProjekte.length > 0 ? 'primary' : 'default'}
              onClick={() => setProjektFilter(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={projektFilter === 'in_bearbeitung'}
            />
            <StatStripItem
              title={tx('Offene Angebote')}
              value={offeneAngebote.length}
              icon={<IconFileText size={16} className="shrink-0" />}
              tone={offeneAngebote.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Stunden (Monat)')}
              value={stundenAktuellerMonat % 1 === 0 ? stundenAktuellerMonat : stundenAktuellerMonat.toFixed(1)}
              icon={<IconClock size={16} className="shrink-0" />}
              tone="default"
            />
            <StatStripItem
              title={tx('Rechnungen offen')}
              value={ueberfaelligeRechnungen.length + offeneRechnungen.length}
              icon={<IconFileInvoice size={16} className="shrink-0" />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Kunden')}
              value={kunden.length}
              icon={<IconUsers size={16} className="shrink-0" />}
              tone="default"
            />
          </StatStrip>
        }
        primary={
          projekte.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 px-8 text-center gap-4">
              <IconBriefcase size={48} className="text-muted-foreground" stroke={1.5} />
              <p className="text-muted-foreground text-sm max-w-xs">
                {tx('Noch keine Projekte vorhanden. Lege das erste Projekt an, um loszulegen.')}
              </p>
              <button
                onClick={() => crud.projekte.openCreate({})}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <IconPlus size={16} className="shrink-0" />
                {tx('Erstes Projekt anlegen')}
              </button>
            </div>
          ) : (
            <KanbanWidget
              columns={projektColumns}
              cards={projektCards}
              defaultCollapsed={['abgeschlossen']}
              onCardClick={(card) => {
                const id = card.id.split(':')[1];
                const p = projekte.find(x => x.record_id === id);
                if (p) crud.projekte.openDetail(p);
              }}
              onCardMove={handleCardMove}
              onAddCard={(column) => crud.projekte.openCreate({ projektstatus: column })}
            />
          )
        }
        aside={<>
          {/* Überfällige & offene Rechnungen */}
          <WorkList
            title={tx('Rechnungen — offen & überfällig')}
            items={[...ueberfaelligeRechnungen, ...offeneRechnungen].slice(0, 10).map(r => {
              const isUeberfaellig = ueberfaelligeRechnungen.some(u => u.record_id === r.record_id);
              const betrag = r.fields.gesamtbetrag ?? r.fields.nettobetrag;
              return {
                id: r.record_id,
                title: r.kundeName || r.fields.rechnungsnummer || tx('Rechnung'),
                secondLine: (
                  <>
                    <span className={isUeberfaellig ? 'font-medium text-destructive' : 'font-medium text-amber-600'}>
                      {isUeberfaellig ? tx('Überfällig') : tx('Offen')}
                    </span>
                    {r.fields.faelligkeitsdatum && (
                      <span className="text-muted-foreground"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
                    )}
                    {betrag != null && (
                      <span className="text-muted-foreground"> · {formatCurrency(betrag)}</span>
                    )}
                  </>
                ),
                action: { label: tx('✓ Bezahlt'), onClick: () => markBezahlt(r.record_id) },
              };
            })}
            onItemClick={(id) => {
              const r = rechnungen.find(x => x.record_id === id);
              if (r) crud.rechnungen.openDetail(r);
            }}
            empty={{
              text: tx('Alle Rechnungen bezahlt — keine offenen Posten'),
              action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
            }}
          />

          {/* Offene Angebote */}
          <WorkList
            title={tx('Offene Angebote')}
            items={offeneAngebote.slice(0, 8).map(a => {
              const status = lookupKey(a.fields.angebotsstatus);
              const isVersendet = status === 'versendet';
              return {
                id: a.record_id,
                title: a.projektName || tx`Nr. ${a.fields.angebotsnummer ?? '—'}`,
                secondLine: (
                  <>
                    <span className={isVersendet ? 'font-medium text-amber-600' : 'text-muted-foreground'}>
                      {isVersendet ? tx('Versendet') : tx('Entwurf')}
                    </span>
                    {a.fields.zeitrahmen_anfang && (
                      <span className="text-muted-foreground"> {tx('· ab')} {formatDate(a.fields.zeitrahmen_anfang)}</span>
                    )}
                    {a.fields.kostenbetrag != null && (
                      <span className="text-muted-foreground"> · {formatCurrency(a.fields.kostenbetrag)}</span>
                    )}
                  </>
                ),
                action: isVersendet
                  ? { label: tx('✓ Angenommen'), onClick: () => angebotAnnehmen(a.record_id) }
                  : undefined,
              };
            })}
            onItemClick={(id) => {
              const a = angebote.find(x => x.record_id === id);
              if (a) crud.angebote.openDetail(a);
            }}
            empty={{
              text: tx('Keine offenen Angebote — alle angenommen oder abgeschlossen'),
              action: { label: tx('Neues Angebot'), onClick: () => crud.angebote.openCreate({}) },
            }}
          />
        </>}
      />

      {crud.surfaces}
    </div>
  );
}
