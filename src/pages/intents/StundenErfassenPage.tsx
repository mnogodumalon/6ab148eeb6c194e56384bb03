/**
 * Stunden erfassen — 5-Schritt-Wizard.
 * Steps: 1) Berater wählen → 2) Projekt wählen (nur aktive) → 3) Leistung wählen →
 *        4) Datum, Stunden, Tätigkeit & Abrechenbarkeit eingeben → 5) Prüfen & anlegen.
 * Reads: berater, projekte (filter: in_bearbeitung|akquise), leistungskatalog.
 * Writes: zeiterfassung (createZeiterfassungEntry); erfassungsmonat und erfassungsjahr
 *         werden aus datum per date-fns abgeleitet.
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav,
 *           SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format, parseISO, getYear } from 'date-fns';
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

const MONTH_KEY_MAP: Record<string, string> = {
  january: 'januar', february: 'februar', march: 'maerz', april: 'april',
  may: 'mai', june: 'juni', july: 'juli', august: 'august',
  september: 'september', october: 'oktober', november: 'november', december: 'dezember',
};

function deriveMonatKey(datumIso: string): string {
  const englishMonth = format(parseISO(datumIso), 'MMMM').toLowerCase();
  return MONTH_KEY_MAP[englishMonth] ?? englishMonth;
}

export default function StundenErfassenPage() {
  const [step, setStep] = useState(1);

  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
  });

  const projekte = useRecordSearch(servicePort, 'projekte', {
    filter: "r.v_projektstatus in ['in_bearbeitung', 'akquise']",
    where: r => {
      const key = fieldLookup(r, 'projektstatus')?.key;
      return key === 'in_bearbeitung' || key === 'akquise';
    },
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  const leistungen = useRecordSearch(servicePort, 'leistungskatalog', {
    searchFields: ['leistungsname'],
    toItem: l => ({
      id: l.id,
      title: fieldText(l, 'leistungsname'),
      status: fieldLookup(l, 'leistungstyp') ?? undefined,
    }),
  });

  const f = useStepForm('zeiterfassung', {
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 3,
      datum: 4,
      stunden: 4,
      taetigkeit: 4,
      abrechenbar: 4,
    },
    initial: { datum: todayIso() },
    required: { erfassungsmonat: false, erfassungsjahr: false },
  });

  const submitPlan = useJourneySubmit(servicePort, [
    {
      key: 'zeiteintrag',
      entity: 'zeiterfassung',
      form: f,
      primary: true,
      values: () => {
        const datum = f.get('datum') as string | null;
        if (!datum) return {};
        return {
          erfassungsmonat: deriveMonatKey(datum),
          erfassungsjahr: getYear(parseISO(datum)),
        };
      },
    },
  ], { draftKey: 'stunden-erfassen' });

  return (
    <IntentWizardShell
      title={tx('Stunden erfassen')}
      subtitle={tx('Zeiteintrag für Projekt und Leistung anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="stunden-erfassen"
      intro={{
        description: tx('Erfasse deine geleisteten Stunden für ein Projekt und ordne sie einer Leistung zu.'),
        needs: [tx('Name des Beraters'), tx('Projektkennung'), tx('Datum und Stundenzahl')],
      }}
    >
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den Berater aus, dessen Stunden erfasst werden.')}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={f.get('berater') as string | null}
          onSelect={id => {
            f.set('berater', id, berater.labelOf(id));
            setStep(2);
          }}
          avatar="initials"
          searchPlaceholder={tx('Berater suchen …')}
          create={false}
          emptyText={tx('Kein Berater gefunden.')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das aktive Projekt, auf das die Stunden gebucht werden.')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={f.get('projekt') as string | null}
          onSelect={id => {
            f.set('projekt', id, projekte.labelOf(id));
            setStep(3);
          }}
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={false}
          emptyText={tx('Keine aktiven Projekte vorhanden. Nur Projekte mit Status „In Bearbeitung" oder „Akquise" können ausgewählt werden.')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Leistung')}
        description={tx('Wähle die erbrachte Leistung aus dem Leistungskatalog.')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...leistungen.select}
          selectedId={f.get('leistung') as string | null}
          onSelect={id => {
            f.set('leistung', id, leistungen.labelOf(id));
            setStep(4);
          }}
          searchPlaceholder={tx('Leistung suchen …')}
          create={false}
          emptyText={tx('Keine Leistungen im Katalog vorhanden.')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Details')}
        description={tx('Gib Datum, Stunden, Tätigkeit und Abrechenbarkeit an.')}
        needs={['leistung']}
      >
        <div className="space-y-4">
          <Bound form={f} name="datum" />
          <Bound form={f} name="stunden" />
          <Bound form={f} name="taetigkeit" rows={4} placeholder={tx('Was wurde gemacht?')} />
          <Bound form={f} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => f.validate(['datum', 'stunden'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!submitPlan.done && (
          <SummaryStep
            forms={[f]}
            submit={submitPlan}
            whatHappensNext={tx('Der Zeiteintrag wird sofort gespeichert. Monat und Jahr werden automatisch aus dem Datum abgeleitet.')}
            items={
              (f.get('datum') as string | null)
                ? [
                    {
                      key: 'erfassungsmonat',
                      label: tx('Abrechnungsmonat'),
                      value: deriveMonatKey(f.get('datum') as string),
                    },
                    {
                      key: 'erfassungsjahr',
                      label: tx('Abrechnungsjahr'),
                      value: String(getYear(parseISO(f.get('datum') as string))),
                    },
                  ]
                : []
            }
          />
        )}
      </WizardStep>

      {submitPlan.result && (
        <SuccessStep
          result={submitPlan.result}
          submit={submitPlan}
          forms={[f]}
          whatHappensNext={tx('Die Stunden sind erfasst und können in der Zeiterfassung eingesehen werden.')}
          next={[
            { label: tx('Weitere Stunden erfassen'), onClick: () => { submitPlan.reset(); f.reset(); setStep(1); } },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
