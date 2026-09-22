import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupKey, formatCurrency, formatDate } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { tx, appLabel } from '@/i18n';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatCardRow, StatCard } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';
import { IconAlertCircle, IconBriefcase, IconReceipt, IconClock, IconPlus } from '@tabler/icons-react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    projekte, setProjekte, angebote, rechnungen, zeiterfassung,
    berater, fetchAll,
  } = data;

  const crud = useEntityCrud(data);
  const enrichedProjekte = crud.enriched.projekte;
  const enrichedRechnungen = crud.enriched.rechnungen;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;

  const clock = useClock();

  // --- Projekte Kanban ---
  const projektColumns = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone: o.key === 'in_bearbeitung' ? 'primary' as KanbanTone
        : o.key === 'akquise' ? 'warning' as KanbanTone
        : 'default' as KanbanTone,
    })),
    [],
  );

  const projektCards = useMemo<KanbanCard[]>(
    () => enrichedProjekte.map(p => {
      const status = lookupKey(p.fields.projektstatus) ?? 'akquise';
      const tone: KanbanTone = status === 'in_bearbeitung' ? 'primary'
        : status === 'akquise' ? 'warning'
        : 'default';
      return {
        id: `projekt:${p.record_id}`,
        column: status,
        title: p.fields.projektkennung ?? p.fields.projektnummer?.toString() ?? tx('Ohne Kennung'),
        subtitle: p.kundeName || p.fields.ansprechpartner_kunde || undefined,
        tone,
      };
    }),
    [enrichedProjekte],
  );

  const handleCardMove = async (cardId: string, newColumn: string) => {
    const rid = cardId.split(':')[1];
    if (!rid) return;
    const prev = projekte.find(p => p.record_id === rid);
    if (!prev) return;

    const newLookup = lookupOption('projekte', 'projektstatus', newColumn);
    setProjekte(ps => ps.map(p =>
      p.record_id === rid
        ? { ...p, fields: { ...p.fields, projektstatus: newLookup } }
        : p,
    ));
    try {
      await LivingAppsService.updateProjekteEntry(rid, { projektstatus: newColumn });
      undoToast(
        tx`${prev.fields.projektkennung ?? ''} — Status geändert`,
        async () => {
          setProjekte(ps => ps.map(p =>
            p.record_id === rid
              ? { ...p, fields: { ...p.fields, projektstatus: prev.fields.projektstatus } }
              : p,
          ));
          await LivingAppsService.updateProjekteEntry(rid, {
            projektstatus: lookupKey(prev.fields.projektstatus) ?? newColumn,
          });
        },
      );
    } catch {
      await fetchAll();
    }
  };

  // --- KPI Daten ---
  const currentYear = clock.getFullYear();
  const currentMonth = clock.getMonth();

  const projekteInBearbeitung = useMemo(
    () => projekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung'),
    [projekte],
  );
  const projekteAkquise = useMemo(
    () => projekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise'),
    [projekte],
  );

  // Offene Rechnungen (Entwurf + Versendet)
  const offeneRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => {
      const st = lookupKey(r.fields.rechnungsstatus);
      return st === 'entwurf' || st === 'versendet';
    }),
    [enrichedRechnungen],
  );
  const ueberfaelligeRechnungen = useMemo(
    () => enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig'),
    [enrichedRechnungen],
  );
  const offeneSumme = useMemo(
    () => offeneRechnungen.reduce((s, r) => s + (r.fields.gesamtbetrag ?? r.fields.nettobetrag ?? 0), 0),
    [offeneRechnungen],
  );

  // Stunden im laufenden Monat (Zeiterfassung)
  const stundenDieserMonat = useMemo(() => {
    const monthKey = format(clock, 'yyyy-MM');
    return zeiterfassung.filter(z => {
      if (z.fields.datum) return z.fields.datum.startsWith(monthKey);
      // Fallback: erfassungsjahr + monat
      const jahrOk = z.fields.erfassungsjahr === currentYear;
      // map month index to lookup keys
      const monthNames = ['januar','februar','maerz','april','mai','juni','juli','august','september','oktober','november','dezember'];
      const monatOk = lookupKey(z.fields.erfassungsmonat) === monthNames[currentMonth];
      return jahrOk && monatOk;
    });
  }, [zeiterfassung, clock, currentYear, currentMonth]);

  const stundenGesamt = useMemo(
    () => stundenDieserMonat.reduce((s, z) => s + (z.fields.stunden ?? 0), 0),
    [stundenDieserMonat],
  );

  // Stunden je Berater (laufender Monat)
  const stundenJeBerater = useMemo(() => {
    const map = new Map<string, { name: string; stunden: number; beraterId: string }>();
    for (const z of stundenDieserMonat) {
      const ez = enrichedZeiterfassung.find(e => e.record_id === z.record_id);
      const name = ez?.beraterName || tx('Unbekannt');
      const bid = z.fields.berater ?? 'unknown';
      const key = typeof bid === 'string' ? bid : String(bid);
      const existing = map.get(key);
      if (existing) {
        existing.stunden += z.fields.stunden ?? 0;
      } else {
        map.set(key, { name, stunden: z.fields.stunden ?? 0, beraterId: key });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.stunden - a.stunden);
  }, [stundenDieserMonat, enrichedZeiterfassung]);

  // Angebote im aktuellen Jahr
  const angeboteJahr = useMemo(
    () => angebote.filter(a => a.fields.angebotsjahr === currentYear),
    [angebote, currentYear],
  );
  const angeboteVersendet = useMemo(
    () => angeboteJahr.filter(a => lookupKey(a.fields.angebotsstatus) === 'versendet'),
    [angeboteJahr],
  );

  // Hero: überfällige Rechnungen
  const hasUeberfaellig = ueberfaelligeRechnungen.length > 0;

  // KPI filter states
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Context line
  const aktiveBeraternamen = useMemo(
    () => berater
      .filter(b => lookupKey(b.fields.status) === 'aktiv')
      .map(b => [b.fields.vorname, b.fields.nachname].filter(Boolean).join(' ')),
    [berater],
  );

  const contextLine = useMemo(() => {
    if (projekteInBearbeitung.length === 0 && projekteAkquise.length === 0) {
      return tx('Noch keine Projekte angelegt — leg dein erstes Projekt an.');
    }
    if (projekteInBearbeitung.length > 0 && aktiveBeraternamen.length > 0) {
      return tx`${projekteInBearbeitung.length} Projekte in Bearbeitung — aktive Berater: ${namen(aktiveBeraternamen)}`;
    }
    return tx`${projekteInBearbeitung.length} Projekte in Bearbeitung, ${projekteAkquise.length} in Akquise`;
  }, [projekteInBearbeitung.length, projekteAkquise.length, aktiveBeraternamen]);

  // Filtered cards for KPI
  const visibleCards = useMemo(
    () => filterStatus
      ? projektCards.filter(c => c.column === filterStatus)
      : projektCards,
    [projektCards, filterStatus],
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-1">{contextLine}</p>
        </div>
        <button
          onClick={() => crud.projekte.openCreate({})}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors shrink-0"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={hasUeberfaellig ? (
          <HeroBanner
            icon={<IconAlertCircle size={18} />}
            action={{
              label: tx('Rechnung öffnen'),
              onClick: () => crud.rechnungen.openDetail(ueberfaelligeRechnungen[0]),
            }}
          >
            <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName || r.fields.rechnungsnummer || ''))}</b>
            {' '}{tx('— Rechnungen überfällig.')}
            {' '}{tx`Fällig: ${formatDate(ueberfaelligeRechnungen[0].fields.faelligkeitsdatum)}`}
          </HeroBanner>
        ) : undefined}
        kpis={
          <StatCardRow>
            <StatCard
              title={tx('In Bearbeitung')}
              value={projekteInBearbeitung.length}
              description={projekteInBearbeitung.length === 0 ? tx('Keine aktiven Projekte') : tx('Aktive Projekte')}
              icon={<IconBriefcase size={18} className="text-muted-foreground" />}
              tone={projekteInBearbeitung.length > 0 ? 'primary' : 'default'}
              onClick={() => setFilterStatus(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={filterStatus === 'in_bearbeitung'}
            />
            <StatCard
              title={tx('Akquise')}
              value={projekteAkquise.length}
              description={projekteAkquise.length === 0 ? tx('Keine Akquise-Projekte') : tx('Potenzielle Projekte')}
              icon={<IconBriefcase size={18} className="text-muted-foreground" />}
              tone={projekteAkquise.length > 0 ? 'warning' : 'default'}
              onClick={() => setFilterStatus(f => f === 'akquise' ? null : 'akquise')}
              active={filterStatus === 'akquise'}
            />
            <StatCard
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length}
              description={offeneRechnungen.length > 0 ? formatCurrency(offeneSumme) : tx('Alle beglichen')}
              icon={<IconReceipt size={18} className="text-muted-foreground" />}
              tone={offeneRechnungen.length > 0 ? 'warning' : 'success'}
              onClick={() => crud.rechnungen.openCreate({})}
            />
            <StatCard
              title={tx('Stunden (Monat)')}
              value={stundenGesamt}
              description={stundenGesamt === 0 ? tx('Noch keine Stunden erfasst') : tx`${stundenJeBerater.length} Berater aktiv`}
              icon={<IconClock size={18} className="text-muted-foreground" />}
              tone={stundenGesamt > 0 ? 'default' : 'default'}
              onClick={() => crud.zeiterfassung.openCreate({})}
            />
          </StatCardRow>
        }
        aside={
          <>
            {/* Offene Rechnungen */}
            <WorkList
              title={tx('Offene Rechnungen')}
              items={offeneRechnungen.slice(0, 8).map(r => ({
                id: r.record_id,
                title: r.kundeName || r.fields.rechnungsnummer || tx('Ohne Kunde'),
                secondLine: (
                  <span className="flex gap-2 items-center flex-wrap">
                    <span className={
                      lookupKey(r.fields.rechnungsstatus) === 'versendet'
                        ? 'font-medium text-amber-600'
                        : 'font-medium text-muted-foreground'
                    }>
                      {r.fields.rechnungsstatus?.label ?? '—'}
                    </span>
                    {(r.fields.gesamtbetrag ?? r.fields.nettobetrag) != null && (
                      <span className="text-muted-foreground">
                        {formatCurrency(r.fields.gesamtbetrag ?? r.fields.nettobetrag)}
                      </span>
                    )}
                  </span>
                ),
                action: lookupKey(r.fields.rechnungsstatus) === 'entwurf' ? {
                  label: tx('Versenden'),
                  onClick: async () => {
                    const prev = r.fields.rechnungsstatus;
                    await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'versendet' });
                    undoToast(
                      tx`${r.fields.rechnungsnummer ?? ''} — als versendet markiert`,
                      async () => {
                        await LivingAppsService.updateRechnungenEntry(r.record_id, {
                          rechnungsstatus: lookupKey(prev) ?? 'entwurf',
                        });
                        await fetchAll();
                      },
                    );
                    await fetchAll();
                  },
                } : undefined,
              }))}
              onItemClick={id => {
                const r = enrichedRechnungen.find(r => r.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Keine offenen Rechnungen — alle Rechnungen sind beglichen.'),
                action: { label: tx('Neue Rechnung'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />

            {/* Stunden je Berater im laufenden Monat */}
            <WorkList
              title={tx('Stunden diesen Monat je Berater')}
              items={stundenJeBerater.slice(0, 8).map(item => {
                const b = berater.find(b => {
                  const bUrl = b.record_id;
                  return item.beraterId.includes(bUrl);
                });
                return {
                  id: item.beraterId,
                  title: item.name || tx('Unbekannter Berater'),
                  secondLine: (
                    <span className="text-muted-foreground">
                      {item.stunden} {tx('Std.')}
                    </span>
                  ),
                  action: {
                    label: tx('+ Stunden'),
                    onClick: () => crud.zeiterfassung.openCreate(
                      b ? { berater: b.record_id } : {},
                    ),
                  },
                };
              })}
              onItemClick={_id => {
                // find matching berater and open detail
                const match = berater.find(b => _id.includes(b.record_id));
                if (match) crud.berater.openDetail(match);
              }}
              empty={{
                text: tx('Noch keine Stunden im laufenden Monat erfasst.'),
                action: { label: tx('Stunden erfassen'), onClick: () => crud.zeiterfassung.openCreate({}) },
              }}
            />

            {/* Angebote im laufenden Jahr */}
            <WorkList
              title={tx('Angebote dieses Jahr')}
              items={angeboteVersendet.slice(0, 6).map(a => {
                const ea = crud.enriched.angebote.find(e => e.record_id === a.record_id);
                return {
                  id: a.record_id,
                  title: ea?.projektName || a.fields.angebotsnummer?.toString() || tx('Ohne Projekt'),
                  secondLine: (
                    <span className="flex gap-2 items-center flex-wrap">
                      <span className="font-medium text-amber-600">
                        {a.fields.angebotsstatus?.label ?? '—'}
                      </span>
                      {a.fields.kostenbetrag != null && (
                        <span className="text-muted-foreground">
                          {formatCurrency(a.fields.kostenbetrag)}
                        </span>
                      )}
                    </span>
                  ),
                  action: {
                    label: tx('Annehmen'),
                    onClick: async () => {
                      const prev = a.fields.angebotsstatus;
                      await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'angenommen' });
                      undoToast(
                        tx`Angebot ${a.fields.angebotsnummer ?? ''} — angenommen`,
                        async () => {
                          await LivingAppsService.updateAngeboteEntry(a.record_id, {
                            angebotsstatus: lookupKey(prev) ?? 'versendet',
                          });
                          await fetchAll();
                        },
                      );
                      await fetchAll();
                    },
                  },
                };
              })}
              onItemClick={id => {
                const a = crud.enriched.angebote.find(a => a.record_id === id);
                if (a) crud.angebote.openDetail(a);
              }}
              empty={{
                text: tx('Keine versendeten Angebote dieses Jahr.'),
                action: { label: tx('Neues Angebot'), onClick: () => crud.angebote.openCreate({ angebotsjahr: currentYear }) },
              }}
            />
          </>
        }
        primary={
          projekte.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center gap-4">
              <IconBriefcase size={48} className="text-muted-foreground" stroke={1.5} />
              <div>
                <h2 className="font-semibold text-foreground">{tx('Noch keine Projekte vorhanden')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{tx('Leg dein erstes Projekt an, um loszulegen.')}</p>
              </div>
              <button
                onClick={() => crud.projekte.openCreate({})}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <IconPlus size={16} className="shrink-0" />
                {tx('Erstes Projekt anlegen')}
              </button>
            </div>
          ) : (
            <KanbanWidget
              cards={filterStatus ? visibleCards : projektCards}
              columns={projektColumns}
              defaultCollapsed={['abgeschlossen']}
              onCardClick={card => {
                const rid = card.id.split(':')[1];
                const p = enrichedProjekte.find(p => p.record_id === rid);
                if (p) crud.projekte.openDetail(p);
              }}
              onCardMove={handleCardMove}
              onAddCard={column => crud.projekte.openCreate({ projektstatus: column })}
            />
          )
        }
      />

      {crud.surfaces}
    </div>
  );
}
