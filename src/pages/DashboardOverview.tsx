import { useState } from 'react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { formatDate, formatCurrency, lookupKey } from '@/lib/formatters';
import { lookupOption, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard, KanbanColumn } from '@/components/widgets/KanbanWidget';
import {
  IconAlertCircle,
  IconBriefcase,
  IconClock,
  IconFileInvoice,
  IconPlus,
  IconReceipt,
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
    fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'rechnungen') {
        const r = top.record;
        const key = lookupKey(r.fields.rechnungsstatus);
        if (key === 'entwurf') {
          return {
            label: tx('Als versendet markieren'),
            onClick: async () => {
              const prev = r.fields.rechnungsstatus;
              const next = lookupOption('rechnungen', 'rechnungsstatus', 'versendet');
              // optimistic
              data.setRechnungen(rs => rs.map(x => x.record_id === r.record_id ? { ...x, fields: { ...x.fields, rechnungsstatus: next } } : x));
              try {
                await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'versendet' });
                undoToast(tx`Rechnung ${r.fields.rechnungsnummer ?? ''} — versendet`, async () => {
                  data.setRechnungen(rs => rs.map(x => x.record_id === r.record_id ? { ...x, fields: { ...x.fields, rechnungsstatus: prev } } : x));
                  await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: key ?? 'entwurf' });
                });
              } catch {
                await fetchAll();
              }
            },
          };
        }
        if (key === 'versendet') {
          return {
            label: tx('Als bezahlt markieren'),
            onClick: async () => {
              const prev = r.fields.rechnungsstatus;
              const next = lookupOption('rechnungen', 'rechnungsstatus', 'bezahlt');
              data.setRechnungen(rs => rs.map(x => x.record_id === r.record_id ? { ...x, fields: { ...x.fields, rechnungsstatus: next } } : x));
              try {
                await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: 'bezahlt' });
                undoToast(tx`Rechnung ${r.fields.rechnungsnummer ?? ''} — bezahlt`, async () => {
                  data.setRechnungen(rs => rs.map(x => x.record_id === r.record_id ? { ...x, fields: { ...x.fields, rechnungsstatus: prev } } : x));
                  await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: key ?? 'versendet' });
                });
              } catch {
                await fetchAll();
              }
            },
          };
        }
      }
      if (top.type === 'angebote') {
        const a = top.record;
        const key = lookupKey(a.fields.angebotsstatus);
        if (key === 'entwurf') {
          return {
            label: tx('Als versendet markieren'),
            onClick: async () => {
              const prev = a.fields.angebotsstatus;
              const next = lookupOption('angebote', 'angebotsstatus', 'versendet');
              data.setAngebote(as => as.map(x => x.record_id === a.record_id ? { ...x, fields: { ...x.fields, angebotsstatus: next } } : x));
              try {
                await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: 'versendet' });
                undoToast(tx`Angebot ${a.fields.angebotsnummer ?? ''} — versendet`, async () => {
                  data.setAngebote(as => as.map(x => x.record_id === a.record_id ? { ...x, fields: { ...x.fields, angebotsstatus: prev } } : x));
                  await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: key ?? 'entwurf' });
                });
              } catch {
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
  const enrichedAngebote = crud.enriched.angebote;
  const enrichedRechnungen = crud.enriched.rechnungen;
  const enrichedZeiterfassung = crud.enriched.zeiterfassung;

  const clock = useClock();
  const [projektFilter, setProjektFilter] = useState<string | null>(null);

  // Derived data
  const currentMonth = format(clock, 'yyyy-MM');
  const currentYear = clock.getFullYear();

  // Projekte nach Status
  const projekteColumns: KanbanColumn[] = (LOOKUP_OPTIONS['projekte']?.['projektstatus'] ?? []).map(o => ({
    key: o.key,
    label: o.label,
    tone: o.key === 'in_bearbeitung' ? 'primary' as const : o.key === 'abgeschlossen' ? 'success' as const : 'default' as const,
  }));

  const filteredProjekte = projektFilter
    ? enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === projektFilter)
    : enrichedProjekte;

  const kanbanCards: KanbanCard[] = enrichedProjekte.map(p => ({
    id: `projekt:${p.record_id}`,
    column: lookupKey(p.fields.projektstatus) ?? '',
    title: p.fields.projektkennung ?? p.kundeName ?? tx('Ohne Kennung'),
    subtitle: p.kundeName ? <span className="text-xs text-muted-foreground">{p.kundeName}{p.projektleitungName ? ` · ${p.projektleitungName}` : ''}</span> : undefined,
    tone: lookupKey(p.fields.projektstatus) === 'abgeschlossen' ? 'success' as const : 'default' as const,
  }));

  // Rechnungen
  const ueberfaelligeRechnungen = enrichedRechnungen.filter(r => lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig');
  const offeneRechnungen = enrichedRechnungen.filter(r => {
    const k = lookupKey(r.fields.rechnungsstatus);
    return k === 'versendet' || k === 'ueberfaellig';
  });
  const offeneBetragSum = offeneRechnungen.reduce((s, r) => s + (r.fields.gesamtbetrag ?? 0), 0);

  // Angebote
  const aktiveAngebote = enrichedAngebote.filter(a => {
    const k = lookupKey(a.fields.angebotsstatus);
    return k === 'entwurf' || k === 'versendet';
  });

  // Zeiterfassung aktueller Monat
  const zeitAktuellerMonat = enrichedZeiterfassung.filter(z => {
    if (!z.fields.datum) return false;
    return z.fields.datum.startsWith(currentMonth);
  });
  const stundenAktuellerMonat = zeitAktuellerMonat.reduce((s, z) => s + (z.fields.stunden ?? 0), 0);
  const abrechenbarAktuellerMonat = zeitAktuellerMonat
    .filter(z => z.fields.abrechenbar)
    .reduce((s, z) => s + (z.fields.stunden ?? 0), 0);

  // Aktive Berater
  const aktiveBerater = berater.filter(b => lookupKey(b.fields.status) === 'aktiv');

  // Context line
  const projektNamen = enrichedProjekte
    .filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung')
    .slice(0, 3)
    .map(p => p.kundeName ?? p.fields.projektkennung ?? '');

  const contextLine = enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung').length > 0
    ? tx`${namen(projektNamen)} — laufende Projekte im Blick.`
    : ueberfaelligeRechnungen.length > 0
    ? tx`${ueberfaelligeRechnungen.length} überfällige ${ueberfaelligeRechnungen.length === 1 ? tx('Rechnung') : tx('Rechnungen')} warten auf Bearbeitung.`
    : tx('Alle Projekte und Rechnungen sind auf dem aktuellen Stand.');

  // Advance Rechnung status helper
  const advanceRechnung = async (r: typeof enrichedRechnungen[0]) => {
    const key = lookupKey(r.fields.rechnungsstatus);
    const nextKey = key === 'entwurf' ? 'versendet' : key === 'versendet' ? 'bezahlt' : null;
    if (!nextKey) return;
    const prev = r.fields.rechnungsstatus;
    const next = lookupOption('rechnungen', 'rechnungsstatus', nextKey);
    data.setRechnungen(rs => rs.map(x => x.record_id === r.record_id ? { ...x, fields: { ...x.fields, rechnungsstatus: next } } : x));
    try {
      await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: nextKey });
      undoToast(tx`Rechnung ${r.fields.rechnungsnummer ?? ''} — ${next.label}`, async () => {
        data.setRechnungen(rs => rs.map(x => x.record_id === r.record_id ? { ...x, fields: { ...x.fields, rechnungsstatus: prev } } : x));
        await LivingAppsService.updateRechnungenEntry(r.record_id, { rechnungsstatus: key ?? 'entwurf' });
      });
    } catch {
      await fetchAll();
    }
  };

  // Advance Angebot status helper
  const advanceAngebot = async (a: typeof enrichedAngebote[0]) => {
    const key = lookupKey(a.fields.angebotsstatus);
    const nextKey = key === 'entwurf' ? 'versendet' : null;
    if (!nextKey) return;
    const prev = a.fields.angebotsstatus;
    const next = lookupOption('angebote', 'angebotsstatus', nextKey);
    data.setAngebote(as => as.map(x => x.record_id === a.record_id ? { ...x, fields: { ...x.fields, angebotsstatus: next } } : x));
    try {
      await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: nextKey });
      undoToast(tx`Angebot ${a.fields.angebotsnummer ?? ''} — ${next.label}`, async () => {
        data.setAngebote(as => as.map(x => x.record_id === a.record_id ? { ...x, fields: { ...x.fields, angebotsstatus: prev } } : x));
        await LivingAppsService.updateAngeboteEntry(a.record_id, { angebotsstatus: key ?? 'entwurf' });
      });
    } catch {
      await fetchAll();
    }
  };

  const handleCardMove = async (cardId: string, newColumn: string) => {
    const recordId = cardId.split(':')[1];
    const projekt = enrichedProjekte.find(p => p.record_id === recordId);
    if (!projekt) return;
    const prev = projekt.fields.projektstatus;
    const next = lookupOption('projekte', 'projektstatus', newColumn);
    data.setProjekte(ps => ps.map(p => p.record_id === recordId ? { ...p, fields: { ...p.fields, projektstatus: next } } : p));
    try {
      await LivingAppsService.updateProjekteEntry(recordId, { projektstatus: newColumn });
      undoToast(tx`${projekt.fields.projektkennung ?? ''} — ${next.label}`, async () => {
        data.setProjekte(ps => ps.map(p => p.record_id === recordId ? { ...p, fields: { ...p.fields, projektstatus: prev } } : p));
        await LivingAppsService.updateProjekteEntry(recordId, { projektstatus: lookupKey(prev) ?? 'akquise' });
      });
    } catch {
      await fetchAll();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{contextLine}</p>
        </div>
        <button
          onClick={() => crud.projekte.openCreate({ projektstatus: 'akquise' })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          <IconPlus size={16} className="shrink-0" />
          {tx('Neues Projekt')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          ueberfaelligeRechnungen.length > 0 ? (
            <HeroBanner
              icon={<IconAlertCircle size={18} />}
              action={{
                label: tx('Als bezahlt markieren'),
                onClick: () => advanceRechnung(ueberfaelligeRechnungen[0]),
              }}
            >
              <b>{namen(ueberfaelligeRechnungen.map(r => r.kundeName ?? r.fields.rechnungsnummer ?? ''))}</b>
              {' '}{ueberfaelligeRechnungen.length === 1 ? tx('— Rechnung überfällig') : tx('— Rechnungen überfällig')}{offeneBetragSum > 0 ? ` · ${formatCurrency(offeneBetragSum)}` : ''}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={appLabel('projekte')}
              value={enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'in_bearbeitung').length}
              icon={<IconBriefcase size={16} />}
              tone="primary"
              onClick={() => setProjektFilter(f => f === 'in_bearbeitung' ? null : 'in_bearbeitung')}
              active={projektFilter === 'in_bearbeitung'}
            />
            <StatStripItem
              title={tx('Akquise')}
              value={enrichedProjekte.filter(p => lookupKey(p.fields.projektstatus) === 'akquise').length}
              icon={<IconBriefcase size={16} />}
              tone="default"
              onClick={() => setProjektFilter(f => f === 'akquise' ? null : 'akquise')}
              active={projektFilter === 'akquise'}
            />
            <StatStripItem
              title={tx('Offene Rechnungen')}
              value={offeneRechnungen.length > 0 ? formatCurrency(offeneBetragSum) : '0'}
              icon={<IconReceipt size={16} />}
              tone={ueberfaelligeRechnungen.length > 0 ? 'destructive' : offeneRechnungen.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Stunden (Monat)')}
              value={`${stundenAktuellerMonat.toFixed(1)} h`}
              icon={<IconClock size={16} />}
              tone="default"
            />
            <StatStripItem
              title={tx('Abrechenbar')}
              value={`${abrechenbarAktuellerMonat.toFixed(1)} h`}
              icon={<IconClock size={16} />}
              tone={abrechenbarAktuellerMonat > 0 ? 'success' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            columns={projekteColumns}
            cards={kanbanCards}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={(card) => {
              const recordId = card.id.split(':')[1];
              const p = enrichedProjekte.find(x => x.record_id === recordId);
              if (p) crud.projekte.openDetail(p);
            }}
            onCardMove={handleCardMove}
            onAddCard={(column) => crud.projekte.openCreate({ projektstatus: column })}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Offene & überfällige Rechnungen')}
              items={offeneRechnungen
                .sort((a, b) => {
                  const aKey = lookupKey(a.fields.rechnungsstatus);
                  const bKey = lookupKey(b.fields.rechnungsstatus);
                  if (aKey === 'ueberfaellig' && bKey !== 'ueberfaellig') return -1;
                  if (bKey === 'ueberfaellig' && aKey !== 'ueberfaellig') return 1;
                  return 0;
                })
                .slice(0, 8)
                .map(r => {
                  const isUeberfaellig = lookupKey(r.fields.rechnungsstatus) === 'ueberfaellig';
                  const nextKey = lookupKey(r.fields.rechnungsstatus) === 'entwurf' ? tx('Versenden') : tx('Bezahlt');
                  return {
                    id: r.record_id,
                    title: r.kundeName ?? r.fields.rechnungsnummer ?? tx('Rechnung'),
                    secondLine: (
                      <>
                        <span className={`font-medium ${isUeberfaellig ? 'text-destructive' : 'text-amber-600'}`}>
                          {r.fields.rechnungsstatus?.label ?? ''}
                        </span>
                        {r.fields.faelligkeitsdatum && (
                          <span className="text-muted-foreground"> · {formatDate(r.fields.faelligkeitsdatum)}</span>
                        )}
                        {r.fields.gesamtbetrag != null && (
                          <span className="text-muted-foreground"> · {formatCurrency(r.fields.gesamtbetrag)}</span>
                        )}
                      </>
                    ),
                    action: { label: nextKey, onClick: () => advanceRechnung(r) },
                  };
                })}
              onItemClick={(id) => {
                const r = enrichedRechnungen.find(x => x.record_id === id);
                if (r) crud.rechnungen.openDetail(r);
              }}
              empty={{
                text: tx('Keine offenen Rechnungen — alle beglichen.'),
                action: {
                  label: tx('Neue Rechnung'),
                  onClick: () => crud.rechnungen.openCreate({}),
                },
              }}
            />
            <WorkList
              title={tx('Angebote in Bearbeitung')}
              items={aktiveAngebote
                .sort((a, b) => (a.fields.zeitrahmen_anfang ?? '').localeCompare(b.fields.zeitrahmen_anfang ?? ''))
                .slice(0, 6)
                .map(a => {
                  const statusKey = lookupKey(a.fields.angebotsstatus);
                  return {
                    id: a.record_id,
                    title: a.projektName ?? `${tx('Angebot')} ${a.fields.angebotsnummer ?? ''}`,
                    secondLine: (
                      <>
                        <span className={`font-medium ${statusKey === 'entwurf' ? 'text-muted-foreground' : 'text-amber-600'}`}>
                          {a.fields.angebotsstatus?.label ?? ''}
                        </span>
                        {a.beraterName && (
                          <span className="text-muted-foreground"> · {a.beraterName}</span>
                        )}
                        {a.fields.kostenbetrag != null && (
                          <span className="text-muted-foreground"> · {formatCurrency(a.fields.kostenbetrag)}</span>
                        )}
                      </>
                    ),
                    action: statusKey === 'entwurf'
                      ? { label: tx('Versenden'), onClick: () => advanceAngebot(a) }
                      : undefined,
                  };
                })}
              onItemClick={(id) => {
                const a = enrichedAngebote.find(x => x.record_id === id);
                if (a) crud.angebote.openDetail(a);
              }}
              empty={{
                text: tx('Keine aktiven Angebote.'),
                action: {
                  label: tx('Neues Angebot'),
                  onClick: () => crud.angebote.openCreate({ angebotsstatus: 'entwurf' }),
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
