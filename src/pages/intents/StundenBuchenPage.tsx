/**
 * Stunden buchen — 4-Schritt-Wizard.
 * Steps: 1) Berater wählen → 2) Projekt & Leistung wählen → 3) Datum, Stunden, Tätigkeit & Abrechenbarkeit → 4) Prüfen & Speichern.
 * Reads: berater (nur aktiv), projekte (nur in_bearbeitung), leistungskatalog (alle).
 * Writes: zeiterfassung (createZeiterfassungEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldLookup,
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

const MONTH_KEYS: Record<number, string> = {
  1: 'januar',
  2: 'februar',
  3: 'maerz',
  4: 'april',
  5: 'mai',
  6: 'juni',
  7: 'juli',
  8: 'august',
  9: 'september',
  10: 'oktober',
  11: 'november',
  12: 'dezember',
};

function datumToMonatKey(datumIso: string | null | undefined): string | undefined {
  if (!datumIso) return undefined;
  const d = parseISO(datumIso);
  return MONTH_KEYS[d.getMonth() + 1];
}

function datumToJahr(datumIso: string | null | undefined): number | undefined {
  if (!datumIso) return undefined;
  return parseISO(datumIso).getFullYear();
}

export default function StundenBuchenPage() {
  const [step, setStep] = useState(1);

  const beraterSearch = useRecordSearch(servicePort, 'berater', {
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldText(b, 'email_beruflich'),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
    orderby: ['r.v_nachname asc'],
  });

  const projekteSearch = useRecordSearch(servicePort, 'projekte', {
    filter: "r.v_projektstatus == 'in_bearbeitung'",
    where: r => fieldLookup(r, 'projektstatus')?.key === 'in_bearbeitung',
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
      subtitle: fieldLookup(p, 'projektart')?.label,
    }),
    orderby: ['r.v_projektkennung asc'],
  });

  const leistungSearch = useRecordSearch(servicePort, 'leistungskatalog', {
    searchFields: ['leistungsname'],
    toItem: l => ({
      id: l.id,
      title: fieldText(l, 'leistungsname'),
      subtitle: fieldLookup(l, 'leistungstyp')?.label,
      status: fieldLookup(l, 'einheit') ?? undefined,
    }),
    orderby: ['r.v_leistungsname asc'],
  });

  const f = useStepForm('zeiterfassung', {
    fields: ['berater', 'projekt', 'leistung', 'datum', 'stunden', 'taetigkeit', 'abrechenbar'],
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 2,
      datum: 3,
      stunden: 3,
      taetigkeit: 3,
      abrechenbar: 3,
    },
    initial: { datum: todayIso() },
    required: { leistung: false },
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'zeiterfassung',
      entity: 'zeiterfassung',
      form: f,
      primary: true,
      values: (ctx) => {
        void ctx;
        const datumVal = f.get('datum') as string | null | undefined;
        const monatKey = datumToMonatKey(datumVal);
        const jahr = datumToJahr(datumVal);
        return {
          ...(monatKey ? { erfassungsmonat: monatKey } : {}),
          ...(jahr !== undefined ? { erfassungsjahr: jahr } : {}),
        };
      },
    },
  ], { draftKey: 'stunden-buchen' });

  const beraterLabel = f.get('berater')
    ? (beraterSearch.labelOf(f.get('berater') as string) ?? tx('Berater'))
    : undefined;

  return (
    <IntentWizardShell
      title={tx('Stunden buchen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="stunden-buchen"
      intro={{
        description: tx('Geleistete Stunden auf ein Projekt und eine Leistungsart buchen.'),
        needs: [tx('Name des Beraters'), tx('Aktives Projekt'), tx('Datum und Stundenanzahl')],
      }}
    >
      {/* Step 1 — Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        heading={tx('Berater auswählen')}
        description={tx('Welcher Berater hat die Stunden geleistet? Nur aktive Berater stehen zur Auswahl.')}
      >
        <EntitySelectStep
          {...beraterSearch.select}
          selectedId={f.get('berater') as string | null}
          onSelect={id => {
            f.set('berater', id, beraterSearch.labelOf(id));
            setStep(2);
          }}
          avatar="initials"
          searchPlaceholder={tx('Berater suchen …')}
          emptyText={tx('Keine aktiven Berater gefunden.')}
          create={false}
        />
      </WizardStep>

      {/* Step 2 — Projekt und Leistung wählen */}
      <WizardStep
        label={tx('Projekt & Leistung')}
        heading={tx('Projekt und Leistungsart wählen')}
        description={tx('Auf welches Projekt werden die Stunden gebucht? Nur laufende Projekte stehen zur Auswahl.')}
        needs={['berater']}
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{tx('Projekt')}</p>
            <EntitySelectStep
              {...projekteSearch.select}
              selectedId={f.get('projekt') as string | null}
              onSelect={id => {
                f.set('projekt', id, projekteSearch.labelOf(id));
              }}
              avatar="none"
              searchPlaceholder={tx('Projekt suchen …')}
              emptyText={tx('Keine aktiven Projekte gefunden. Bitte zuerst ein Projekt anlegen.')}
              create={false}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              {tx('Leistungsart')}{' '}
              <span className="text-muted-foreground font-normal text-xs">{tx('(optional)')}</span>
            </p>
            <EntitySelectStep
              {...leistungSearch.select}
              selectedId={f.get('leistung') as string | null}
              onSelect={id => {
                f.set('leistung', id, leistungSearch.labelOf(id));
              }}
              avatar="none"
              searchPlaceholder={tx('Leistungsart suchen …')}
              create={false}
            />
          </div>
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => f.validate(['projekt'])}
            nextStepLabel={tx('Details')}
          />
        </div>
      </WizardStep>

      {/* Step 3 — Details eingeben */}
      <WizardStep
        label={tx('Details')}
        heading={tx('Datum, Stunden und Tätigkeit')}
        description={tx('Erfassungsmonat und -jahr werden automatisch aus dem Datum abgeleitet.')}
        needs={['berater', 'projekt']}
      >
        <div className="space-y-4">
          <Bound form={f} name="datum" />
          <Bound form={f} name="stunden" />
          <Bound form={f} name="taetigkeit" rows={3} />
          <Bound form={f} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => f.validate(['datum', 'stunden'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 4 — Prüfen & Speichern */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            whatHappensNext={tx('Der Zeiteintrag wird sofort gespeichert. Erfassungsmonat und -jahr werden automatisch aus dem Datum abgeleitet.')}
            items={(() => {
              const datumVal = f.get('datum') as string | null | undefined;
              const monatKey = datumToMonatKey(datumVal);
              const jahr = datumToJahr(datumVal);
              const rows = [];
              if (beraterLabel) {
                rows.push({ key: 'berater_name', label: tx('Berater'), value: beraterLabel });
              }
              if (monatKey) {
                const monatLabels: Record<string, string> = {
                  januar: tx('Januar'), februar: tx('Februar'), maerz: tx('März'),
                  april: tx('April'), mai: tx('Mai'), juni: tx('Juni'),
                  juli: tx('Juli'), august: tx('August'), september: tx('September'),
                  oktober: tx('Oktober'), november: tx('November'), dezember: tx('Dezember'),
                };
                rows.push({
                  key: 'erfassungsmonat',
                  label: tx('Abrechnungsmonat'),
                  value: monatLabels[monatKey] ?? monatKey,
                });
              }
              if (jahr !== undefined) {
                rows.push({ key: 'erfassungsjahr', label: tx('Abrechnungsjahr'), value: String(jahr) });
              }
              return rows;
            })()}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          whatHappensNext={tx('Die gebuchten Stunden fließen in die Abrechnung für den Erfassungsmonat ein.')}
          next={[
            { label: tx('Weitere Stunden buchen'), onClick: () => { submit.reset(); f.reset(); setStep(1); } },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          facts={(() => {
            const datumVal = f.get('datum') as string | null | undefined;
            const stunden = f.get('stunden');
            const facts = [];
            if (datumVal) {
              facts.push({ label: tx('Datum'), value: format(parseISO(datumVal), 'dd.MM.yyyy') });
            }
            if (stunden != null && stunden !== '') {
              facts.push({ label: tx('Stunden'), value: String(stunden) });
            }
            return facts;
          })()}
        />
      )}
    </IntentWizardShell>
  );
}
