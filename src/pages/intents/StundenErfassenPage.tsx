/**
 * Stunden erfassen — 4-Schritt-Wizard.
 * Steps: 1) Berater:in auswählen → 2) Projekt auswählen → 3) Leistung auswählen → 4) Datum & Details eingeben → 5) Prüfen & anlegen.
 * Reads: berater (alle), projekte (nur in_bearbeitung/akquise), leistungskatalog (alle).
 * Writes: zeiterfassung (createZeiterfassungEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, StepNav, SummaryStep, SuccessStep, Bound.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
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

const MONTH_MAP: Record<string, string> = {
  January: 'januar',
  February: 'februar',
  March: 'maerz',
  April: 'april',
  May: 'mai',
  June: 'juni',
  July: 'juli',
  August: 'august',
  September: 'september',
  October: 'oktober',
  November: 'november',
  December: 'dezember',
};

function deriveMonat(datum: string): string {
  const monthName = format(parseISO(datum), 'MMMM');
  return MONTH_MAP[monthName] ?? 'januar';
}

function deriveJahr(datum: string): number {
  return parseInt(datum.slice(0, 4), 10);
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
    orderby: ['r.v_nachname asc'],
  });

  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    filter: "r.v_projektstatus in ['in_bearbeitung', 'akquise']",
    where: r => {
      const s = fieldLookup(r, 'projektstatus')?.key;
      return s === 'in_bearbeitung' || s === 'akquise';
    },
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
    orderby: ['r.v_projektkennung asc'],
  });

  const leistungen = useRecordSearch(servicePort, 'leistungskatalog', {
    searchFields: ['leistungsname'],
    toItem: l => ({
      id: l.id,
      title: fieldText(l, 'leistungsname'),
      subtitle: fieldLookup(l, 'leistungstyp')?.label,
    }),
    orderby: ['r.v_leistungsname asc'],
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
    required: { leistung: false, taetigkeit: false, abrechenbar: false },
  });

  const datumVal = f.get('datum') as string | null | undefined;

  const submit = useJourneySubmit(
    servicePort,
    [
      {
        key: 'zeiterfassung',
        entity: 'zeiterfassung',
        form: f,
        primary: true,
        values: (ctx) => {
          const d = ctx.done;
          void d;
          const datum = f.get('datum') as string | undefined;
          if (!datum) return {};
          return {
            erfassungsmonat: deriveMonat(datum),
            erfassungsjahr: deriveJahr(datum),
          };
        },
      },
    ],
    { draftKey: 'stunden-erfassen' }
  );

  return (
    <IntentWizardShell
      title={tx('Stunden erfassen')}
      subtitle={tx('Arbeitsstunden auf ein Projekt buchen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="stunden-erfassen"
      intro={{
        description: tx('Buche Arbeitsstunden einer Berater:in auf ein Projekt und eine Leistung.'),
        needs: [tx('Name der Berater:in'), tx('Projektkennung'), tx('Datum und Stundenzahl')],
      }}
    >
      <WizardStep
        label={tx('Berater:in')}
        description={tx('Wähle die Berater:in aus, deren Stunden du erfassen möchtest.')}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={f.get('berater') as string | null}
          onSelect={id => {
            f.set('berater', id, berater.labelOf(id));
            setStep(2);
          }}
          avatar="initials"
          searchPlaceholder={tx('Berater:in suchen…')}
          create={false}
          emptyText={tx('Keine aktiven Berater:innen gefunden.')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt, auf das die Stunden gebucht werden sollen.')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={f.get('projekt') as string | null}
          onSelect={id => {
            f.set('projekt', id, projekte.labelOf(id));
            setStep(3);
          }}
          searchPlaceholder={tx('Projekt suchen…')}
          create={false}
          emptyText={tx('Keine aktiven Projekte gefunden. Nur Projekte mit Status „In Bearbeitung" oder „Akquise" sind verfügbar.')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Leistung')}
        description={tx('Wähle die erbrachte Leistung aus dem Katalog.')}
        needs={['berater', 'projekt']}
      >
        <EntitySelectStep
          {...leistungen.select}
          selectedId={f.get('leistung') as string | null}
          onSelect={id => {
            f.set('leistung', id, leistungen.labelOf(id));
            setStep(4);
          }}
          searchPlaceholder={tx('Leistung suchen…')}
          create={false}
          emptyText={tx('Keine Leistungen im Katalog gefunden.')}
        />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => {
            setStep(4);
          }}
          nextStepLabel={tx('Details')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Details')}
        description={tx('Datum, Stundenzahl, Tätigkeit und Abrechenbarkeit eingeben.')}
        needs={['berater', 'projekt']}
      >
        <div className="space-y-4">
          <Bound form={f} name="datum" />
          <Bound form={f} name="stunden" />
          <Bound form={f} name="taetigkeit" rows={3} />
          <Bound form={f} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => f.validate(['datum', 'stunden'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            items={
              datumVal
                ? [
                    {
                      key: 'erfassungsmonat',
                      label: tx('Abrechnungsmonat'),
                      value: deriveMonat(datumVal),
                    },
                    {
                      key: 'erfassungsjahr',
                      label: tx('Abrechnungsjahr'),
                      value: String(deriveJahr(datumVal)),
                    },
                  ]
                : []
            }
            whatHappensNext={tx('Die Stunden werden sofort auf das Projekt gebucht und können für die Rechnungserstellung verwendet werden.')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          restartLabel={tx('Weitere Stunden erfassen')}
          next={[
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Die erfassten Stunden stehen jetzt für die Abrechnung zur Verfügung.')}
        />
      )}
    </IntentWizardShell>
  );
}
