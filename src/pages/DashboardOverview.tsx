import { useMemo, useState } from 'react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardGrid } from '@/components/DashboardGrid';
import { HeroBanner } from '@/components/HeroBanner';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { KanbanWidget, type KanbanCard, type KanbanColumn } from '@/components/widgets/KanbanWidget';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { tx } from '@/i18n';
import { formatCurrency, formatDate, lookupKey } from '@/lib/formatters';
import { lookupOption as lookupOptionApp, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { format } from 'date-fns';
import {
  IconAlertCircle,
  IconBriefcase,
  IconClock,
  IconFileInvoice,
  IconReceipt,
  IconUsers,
} from '@tabler/icons-react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    kunden,
    berater,
    projekte,
    angebote,
    rechnungen,
    zeiterfassung,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const rec = (crud.enriched.rechnungen as any[]).find((r: any) => r.record_id === top.record.record_id);
        const status = rec?.fields?.rechnungsstatus?.key;
        if (status === 'versendet' || status === 'ueberfaellig') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: () => markBezahlt(top.record as any),
          };
        }
      }
      if (top.type === 'angebote') {
        const rec = (crud.enriched.angebote as any[]).find((r: any) => r.record_id === top.record.record_id);
        const status = rec?.fields?.angebotsstatus?.key;
        if (status === 'entwurf') {
          return {
            label: tx('Als versendet markieren'),
            onClick: () => markAngebotVersendet(top.record as any),
          };
        }
        if (status === 'versendet') {
          return {
            label: tx('Als angenommen markieren'),
            onClick: () => markAngebotAngenommen(top.record as any),
          };
        }
      }
      return undefined;
    },
  });

  const enrichedProjekte = crud.enriched.projekte;
  const enrichedRechnungen = crud.enriched.rechnungen;
  const enrichedAngebote = crud.enriched.angebote;
  const enrichedBerater = crud.enriched.berater;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;

  const clock = useClock();
  const today = format(clock, 'yyyy-MM-dd');

  // --- Local optimistic state ---
  const [localProjekte, setLocalProjekte] = useState(projekte);
  const [localRechnungen, setLocalRechnungen] = useState(rechnungen);
  const [localAngebote, setLocalAngebote] = useState(angebote);

  // Sync when remote data changes
  useMemo(() => { setLocalProjekte(projekte); }, [projekte]);
  useMemo(() => { setLocalRechnungen(rechnungen); }, [rechnungen]);
  useMemo(() => { setLocalAngebote(angebote); }, [angebote]);

  // --- Rechnungen state ---
  const ueberfaellig = useMemo(
    () => localRechnungen.filter(r => {
      const s = r.fields.rechnungsstatus?.key;
      return s === 'ueberfaellig' || (s === 'versendet' && r.fields.faelligkeitsdatum && r.fields.faelligkeitsdatum < today);
    }),
    [localRechnungen, today],
  );
  const offeneRechnungen = useMemo(
    () => localRechnungen.filter(r => {
      const s = r.fields.rechnungsstatus?.key;
      return s === 'versendet' || s === 'entwurf' || s === 'ueberfaellig';
    }),
    [localRechnungen],
  );
  const offeneSumme = useMemo(
    () => offeneRechnungen.reduce((sum, r) => sum + (r.fields.gesamtbetrag ?? r.fields.nettobetrag ?? 0), 0),
    [offeneRechnungen],
  );

  // --- Angebote state ---
  const offeneAngebote = useMemo(
    () => localAngebote.filter(a => {
      const s = a.fields.angebotsstatus?.key;
      return s === 'entwurf' || s === 'versendet';
    }),
    [localAngebote],
  );

  // --- Projekte state ---
  const aktiveProjekte = useMemo(
    () => localProjekte.filter(p => p.fields.projektstatus?.key === 'in_bearbeitung'),
    [localProjekte],
  );
  const akquiseProjekte = useMemo(
    () => localProjekte.filter(p => p.fields.projektstatus?.key === 'akquise'),
    [localProjekte],
  );

  // --- Berater stunden this month ---
  const aktiveBerater = useMemo(
    () => berater.filter(b => b.fields.status?.key === 'aktiv'),
    [berater],
  );

  // --- Current month Zeiterfassung ---
  const currentYear = clock.getFullYear();
  const currentMonthIndex = clock.getMonth(); // 0-based
  const monthKeys = ['januar', 'februar', 'maerz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
  const currentMonthKey = monthKeys[currentMonthIndex];

  const currentMonthZeit = useMemo(
    () => zeiterfassung.filter(z =>
      z.fields.erfassungsjahr === currentYear &&
      z.fields.erfassungsmonat?.key === currentMonthKey,
    ),
    [zeiterfassung, currentYear, currentMonthKey],
  );

  const totalStundenMonat = useMemo(
    () => currentMonthZeit.reduce((sum, z) => sum + (z.fields.stunden ?? 0), 0),
    [currentMonthZeit],
  );

  // --- Kanban columns for Projekte ---
  const COLUMNS = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({ key: o.key, label: o.label })),
    [],
  );

  // Enrich local projekte with enriched names for display
  const enrichedProjekteMap = useMemo(() => {
    const map = new Map<string, typeof enrichedProjekte[0]>();
    enrichedProjekte.forEach(p => map.set(p.record_id, p));
    return map;
  }, [enrichedProjekte]);

  const kanbanCards = useMemo<KanbanCard[]>(() => {
    return localProjekte.map(p => {
      const status = lookupKey(p.fields.projektstatus) ?? 'akquise';
      const enriched = enrichedProjekteMap.get(p.record_id);
      return {
        id: `projekte:${p.record_id}`,
        column: status,
        title: p.fields.projektkennung ?? tx('Ohne Kennung'),
        subtitle: enriched?.kundeName ?? p.fields.ansprechpartner_kunde,
        tone: status === 'in_bearbeitung' ? 'primary' : status === 'akquise' ? 'warning' : 'default',
      };
    });
  }, [localProjekte, enrichedProjekteMap]);

  // --- Handlers ---
  const moveKanbanCard = async (cardId: string, newColumn: string) => {
    const rid = cardId.split(':')[1];
    if (!rid) return;
    const prev = localProjekte;
    setLocalProjekte(ps =>
      ps.map(p =>
        p.record_id === rid
          ? { ...p, fields: { ...p.fields, projektstatus: lookupOptionApp('projekte', 'projektstatus', newColumn) } }
          : p,
      ),
    );
    const label = COLUMNS.find(c => c.key === newColumn)?.label ?? newColumn;
    undoToast(tx`Projekt → ${label}`, async () => {
      setLocalProjekte(prev);
      try {
        const original = prev.find(p => p.record_id === rid);
        const origKey = lookupKey(original?.fields.projektstatus) ?? 'akquise';
        await LivingAppsService.updateProjekteEntry(rid, { projektstatus: origKey });
      } catch {
        await fetchAll();
      }
    });
    try {
      await LivingAppsService.updateProjekteEntry(rid, { projektstatus: newColumn });
    } catch {
      setLocalProjekte(prev);
      await fetchAll();
    }
  };

  const markBezahlt = async (rec: typeof rechnungen[0]) => {
    const prev = localRechnungen;
    setLocalRechnungen(rs =>
      rs.map(r =>
        r.record_id === rec.record_id
          ? { ...r, fields: { ...r.fields, rechnungsstatus: lookupOptionApp('rechnungen', 'rechnungsstatus', 'bezahlt') } }
          : r,
      ),
    );
    undoToast(tx`${rec.fields.rechnungsnummer ?? ''} — als bezahlt markiert`, async () => {
      setLocalRechnungen(prev);
      try {
        const original = prev.find(r => r.record_id === rec.record_id);
        const origKey = lookupKey(original?.fields.rechnungsstatus) ?? 'versendet';
        await LivingAppsService.updateRechnungenEntry(rec.record_id, { rechnungsstatus: origKey });
      } catch {
        await fetchAll();
      }
    });
    try {
      await LivingAppsService.updateRechnungenEntry(rec.record_id, { rechnungsstatus: 'bezahlt' });
    } catch {
      setLocalRechnungen(prev);
      await fetchAll();
    }
  };

  const markAngebotVersendet = async (rec: typeof angebote[0]) => {
    const prev = localAngebote;
    setLocalAngebote(as =>
      as.map(a =>
        a.record_id === rec.record_id
          ? { ...a, fields: { ...a.fields, angebotsstatus: lookupOptionApp('angebote', 'angebotsstatus', 'versendet') } }
          : a,
      ),
    );
    undoToast(tx`Angebot ${rec.fields.angebotsnummer ?? ''} — versendet`, async () => {
      setLocalAngebote(prev);
      try {
        await LivingAppsService.updateAngeboteEntry(rec.record_id, { angebotsstatus: 'entwurf' });
      } catch {
        await fetchAll();
      }
    });
    try {
      await LivingAppsService.updateAngeboteEntry(rec.record_id, { angebotsstatus: 'versendet' });
    } catch {
      setLocalAngebote(prev);
      await fetchAll();
    }
  };

  const markAngebotAngenommen = async (rec: typeof angebote[0]) => {
    const prev = localAngebote;
    setLocalAngebote(as =>
      as.map(a =>
        a.record_id === rec.record_id
          ? { ...a, fields: { ...a.fields, angebotsstatus: lookupOptionApp('angebote', 'angebotsstatus', 'angenommen') } }
          : a,
      ),
    );
    undoToast(tx`Angebot ${rec.fields.angebotsnummer ?? ''} — angenommen`, async () => {
      setLocalAngebote(prev);
      try {
        await LivingAppsService.updateAngeboteEntry(rec.record_id, { angebotsstatus: 'versendet' });
      } catch {
        await fetchAll();
      }
    });
    try {
      await LivingAppsService.updateAngeboteEntry(rec.record_id, { angebotsstatus: 'angenommen' });
    } catch {
      setLocalAngebote(prev);
      await fetchAll();
    }
  };

  // --- Context line ---
  const contextLine = useMemo(() => {
    if (aktiveProjekte.length === 0 && ueberfaellig.length === 0) {
      return tx('Noch keine Projekte — leg gleich los!');
    }
    const teile: string[] = [];
    if (aktiveProjekte.length > 0) {
      const projektNamen = aktiveProjekte.slice(0, 2).map(p => p.fields.projektkennung ?? '').filter(Boolean);
      if (projektNamen.length > 0) {
        teile.push(tx`${aktiveProjekte.length} Projekte in Bearbeitung`);
      }
    }
    if (ueberfaellig.length > 0) {
      teile.push(tx`${ueberfaellig.length} überfällige Rechnung${ueberfaellig.length > 1 ? 'en' : ''}`);
    }
    if (akquiseProjekte.length > 0) {
      teile.push(tx`${akquiseProjekte.length} in der Pipeline`);
    }
    return teile.join(' · ');
  }, [aktiveProjekte, ueberfaellig, akquiseProjekte]);

  // Rechnungen with enriched names
  const enrichedRechnungenMap = useMemo(() => {
    const map = new Map<string, typeof enrichedRechnungen[0]>();
    enrichedRechnungen.forEach(r => map.set(r.record_id, r));
    return map;
  }, [enrichedRechnungen]);

  // Angebote with enriched names
  const enrichedAngeboteMap = useMemo(() => {
    const map = new Map<string, typeof enrichedAngebote[0]>();
    enrichedAngebote.forEach(a => map.set(a.record_id, a));
    return map;
  }, [enrichedAngebote]);

  // Most recent ueberfaellige Rechnung for hero
  const heroRechnung = ueberfaellig[0];
  const heroRechnungEnriched = heroRechnung ? enrichedRechnungenMap.get(heroRechnung.record_id) : undefined;

  // --- Berater Stunden rows for aside ---
  const beraterStundenRows = useMemo(() => {
    return aktiveBerater
      .map(b => {
        const stunden = b.fields.stunden_aktueller_monat ?? 0;
        return { b, stunden };
      })
      .sort((a, b2) => b2.stunden - a.stunden)
      .slice(0, 8);
  }, [aktiveBerater]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contextLine}</p>
        </div>
        <button
          onClick={() => crud.projekte.openCreate({ projektstatus: 'akquise', projektstart_jahr: currentYear })}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <IconBriefcase size={15} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={ueberfaellig.length > 0 && (
          <HeroBanner
            icon={<IconAlertCircle size={18} />}
            action={{ label: tx('Als bezahlt markieren'), onClick: () => markBezahlt(heroRechnung!) }}
          >
            <b>{ueberfaellig.length === 1
              ? (heroRechnungEnriched?.kundeName ?? heroRechnung!.fields.rechnungsnummer ?? tx('Rechnung'))
              : namen(ueberfaellig.map(r => enrichedRechnungenMap.get(r.record_id)?.kundeName ?? r.fields.rechnungsnummer ?? ''))
            }</b>
            {' — '}
            {ueberfaellig.length === 1
              ? tx`Rechnung ${heroRechnung!.fields.rechnungsnummer ?? ''} ist überfällig`
              : tx`${ueberfaellig.length} Rechnungen sind überfällig`}
            {heroRechnung?.fields.faelligkeitsdatum ? tx` (fällig ${formatDate(heroRechnung.fields.faelligkeitsdatum)})` : ''}
          </HeroBanner>
        )}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Aktive Projekte')}
              value={aktiveProjekte.length}
              icon={<IconBriefcase size={16} />}
              tone={aktiveProjekte.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Pipeline')}
              value={akquiseProjekte.length}
              icon={<IconUsers size={16} />}
              tone={akquiseProjekte.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length > 0 ? formatCurrency(offeneSumme) : '0'}
              icon={<IconFileInvoice size={16} />}
              tone={ueberfaellig.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Offene Angebote')}
              value={offeneAngebote.length}
              icon={<IconReceipt size={16} />}
              tone={offeneAngebote.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Stunden diesen Monat')}
              value={totalStundenMonat > 0 ? `${totalStundenMonat}h` : '—'}
              icon={<IconClock size={16} />}
              tone="default"
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            columns={COLUMNS}
            cards={kanbanCards}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={card => {
              const rid = card.id.split(':')[1];
              const rec = localProjekte.find(p => p.record_id === rid);
              if (rec) crud.projekte.openDetail(rec);
            }}
            onCardMove={moveKanbanCard}
            onAddCard={column => crud.projekte.openCreate({ projektstatus: column, projektstart_jahr: currentYear })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Rechnungen — Offen & Überfällig')}
              items={offeneRechnungen
                .sort((a, b2) => {
                  const aU = a.fields.rechnungsstatus?.key === 'ueberfaellig' ? 0 : 1;
                  const bU = b2.fields.rechnungsstatus?.key === 'ueberfaellig' ? 0 : 1;
                  return aU - bU;
                })
                .map(r => {
                  const enriched = enrichedRechnungenMap.get(r.record_id);
                  const isUeberfaellig = r.fields.rechnungsstatus?.key === 'ueberfaellig' ||
                    (r.fields.rechnungsstatus?.key === 'versendet' && r.fields.faelligkeitsdatum && r.fields.faelligkeitsdatum < today);
                  return {
                    id: r.record_id,
                    title: enriched?.kundeName ?? r.fields.rechnungsnummer ?? tx('Unbekannt'),
                    secondLine: (
                      <>
                        <span className={isUeberfaellig ? 'font-medium text-destructive' : 'font-medium text-amber-600'}>
                          {isUeberfaellig ? tx('Überfällig') : tx('Offen')}
                        </span>
                        {r.fields.faelligkeitsdatum && (
                          <span className="text-muted-foreground"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
                        )}
                        {(r.fields.gesamtbetrag ?? r.fields.nettobetrag) ? (
                          <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag ?? r.fields.nettobetrag ?? 0)}</span>
                        ) : null}
                      </>
                    ),
                    action: (r.fields.rechnungsstatus?.key === 'versendet' || r.fields.rechnungsstatus?.key === 'ueberfaellig')
                      ? { label: tx('Bezahlt'), onClick: () => markBezahlt(r) }
                      : undefined,
                  };
                })}
              onItemClick={id => {
                const rec = localRechnungen.find(r => r.record_id === id);
                if (rec) crud.rechnungen.openDetail(rec);
              }}
              max={6}
              empty={{
                text: tx('Alle Rechnungen sind bezahlt — hervorragend!'),
                action: { label: tx('Rechnung erstellen'), onClick: () => crud.rechnungen.openCreate({}) },
              }}
            />

            <WorkList
              title={tx('Angebote — Entwürfe & Versendet')}
              items={offeneAngebote.map(a => {
                const enriched = enrichedAngeboteMap.get(a.record_id);
                const isVersendet = a.fields.angebotsstatus?.key === 'versendet';
                return {
                  id: a.record_id,
                  title: enriched?.projektName ?? tx('Ohne Projekt'),
                  secondLine: (
                    <>
                      <span className={isVersendet ? 'font-medium text-amber-600' : 'text-muted-foreground'}>
                        {a.fields.angebotsstatus?.label ?? ''}
                      </span>
                      {a.fields.kostenbetrag ? (
                        <span className="text-muted-foreground"> · {formatCurrency(a.fields.kostenbetrag)}</span>
                      ) : null}
                      {a.fields.angebotstyp?.label ? (
                        <span className="text-muted-foreground"> · {a.fields.angebotstyp.label}</span>
                      ) : null}
                    </>
                  ),
                  action: isVersendet
                    ? { label: tx('Angenommen'), onClick: () => markAngebotAngenommen(a) }
                    : { label: tx('Versenden'), onClick: () => markAngebotVersendet(a) },
                };
              })}
              onItemClick={id => {
                const rec = localAngebote.find(a => a.record_id === id);
                if (rec) crud.angebote.openDetail(rec);
              }}
              max={5}
              empty={{
                text: tx('Keine offenen Angebote — alles abgeschlossen.'),
                action: { label: tx('Angebot erstellen'), onClick: () => crud.angebote.openCreate({}) },
              }}
            />

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">{tx('Berater — Stunden diesen Monat')}</span>
                <span className="text-xs text-muted-foreground">{tx('aktueller Monat')}</span>
              </div>
              {beraterStundenRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tx('Noch keine Stunden erfasst.')}</p>
              ) : (
                <div className="space-y-2">
                  {beraterStundenRows.map(({ b, stunden }) => {
                    const name = [b.fields.vorname, b.fields.nachname].filter(Boolean).join(' ') || tx('Berater');
                    const maxStunden = beraterStundenRows[0]?.stunden || 1;
                    const pct = Math.round((stunden / maxStunden) * 100);
                    return (
                      <button
                        key={b.record_id}
                        onClick={() => crud.berater.openDetail(b)}
                        className="w-full text-left group"
                      >
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="truncate min-w-0 font-medium group-hover:text-primary transition-colors">{name}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground ml-2">{stunden}h</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
