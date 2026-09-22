/**
 * Angebot erstellen — 5-Schritt-Wizard.
 * Steps: 1) Projekt wählen (nur in_bearbeitung/akquise) → 2) Berater wählen (nur aktiv) →
 *        3) Angebotstyp, Zeitrahmen & Dauer → 4) Kostentyp & Kostenbetrag → 5) Beschreibung →
 *        6) Prüfen & anlegen.
 * Reads: projekte (filter: projektstatus in_bearbeitung|akquise), berater (filter: status aktiv).
 * Writes: angebote (createAngeboteEntry) — angebotsstatus=entwurf, angebotsjahr=current year (fixed).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
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

export default function AngebotErstellenPage() {
  const [step, setStep] = useState(1);

  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    filter: "r.v_projektstatus in ['in_bearbeitung', 'akquise']",
    where: r => {
      const status = fieldLookup(r, 'projektstatus')?.key;
      return status === 'in_bearbeitung' || status === 'akquise';
    },
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektart')?.label,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldLookup(b, 'status')?.label,
    }),
  });

  const angebot = useStepForm('angebote', {
    steps: {
      projekt: 1,
      berater: 2,
      angebotstyp: 3,
      zeitrahmen_anfang: 3,
      zeitrahmen_ende: 3,
      dauer: 3,
      kostentyp: 4,
      kostenbetrag: 4,
      beschreibung: 5,
    },
    required: {
      zeitrahmen_ende: true,
    },
    initial: {
      zeitrahmen_anfang: todayIso(),
    },
  });

  const submit = useJourneySubmit(
    servicePort,
    [
      {
        key: 'angebot',
        entity: 'angebote',
        form: angebot,
        primary: true,
        values: {
          angebotsstatus: 'entwurf',
          angebotsjahr: new Date().getFullYear(),
        },
      },
    ],
    { draftKey: 'angebot-erstellen' }
  );

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[angebot]}
      draftKey="angebot-erstellen"
      intro={{
        description: tx('Erstellt ein neues Angebot zu einem Projekt mit Typ, Zeitrahmen und Kosten.'),
        needs: [tx('Projektkennung'), tx('Zuständiger Berater'), tx('Kosteninformationen')],
      }}
    >
      {/* Step 1: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt, für das das Angebot erstellt wird.')}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={angebot.get('projekt') as string}
          onSelect={id => {
            angebot.set('projekt', id, projekte.labelOf(id));
            setStep(2);
          }}
          emptyText={tx('Keine Projekte in Bearbeitung oder Akquise vorhanden.')}
          avatar="none"
          searchPlaceholder={tx('Projektkennung suchen …')}
        />
      </WizardStep>

      {/* Step 2: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den zuständigen Berater für dieses Angebot.')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={angebot.get('berater') as string}
          onSelect={id => {
            angebot.set('berater', id, berater.labelOf(id));
            setStep(3);
          }}
          emptyText={tx('Keine aktiven Berater gefunden.')}
          avatar="initials"
          searchPlaceholder={tx('Berater suchen …')}
        />
      </WizardStep>

      {/* Step 3: Angebotstyp, Zeitrahmen & Dauer */}
      <WizardStep
        label={tx('Typ & Zeitrahmen')}
        description={tx('Angebotstyp, Laufzeit und Dauer festlegen.')}
        needs={['projekt', 'berater']}
      >
        <div className="space-y-4">
          <Bound form={angebot} name="angebotstyp" />
          <Bound form={angebot} name="zeitrahmen_anfang" />
          <Bound form={angebot} name="zeitrahmen_ende" />
          <Bound form={angebot} name="dauer" placeholder={tx('z. B. 3 Monate')} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() =>
              angebot.validate(['angebotstyp', 'zeitrahmen_anfang', 'zeitrahmen_ende', 'dauer'])
            }
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      {/* Step 4: Kostentyp & Kostenbetrag */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Kostenmodell und Betrag für das Angebot eingeben.')}
        needs={['angebotstyp', 'zeitrahmen_anfang', 'zeitrahmen_ende', 'dauer']}
      >
        <div className="space-y-4">
          <Bound form={angebot} name="kostentyp" />
          <Bound form={angebot} name="kostenbetrag" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => angebot.validate(['kostentyp', 'kostenbetrag'])}
            nextStepLabel={tx('Beschreibung')}
          />
        </div>
      </WizardStep>

      {/* Step 5: Beschreibung */}
      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Leistungsumfang und weitere Details beschreiben.')}
        needs={['kostentyp', 'kostenbetrag']}
      >
        <div className="space-y-4">
          <Bound form={angebot} name="beschreibung" rows={5} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => angebot.validate(['beschreibung'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 6: Prüfen & Anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[angebot]}
            submit={submit}
            items={[
              {
                key: 'angebotsstatus',
                label: tx('Angebotsstatus'),
                value: tx('Entwurf'),
              },
              {
                key: 'angebotsjahr',
                label: tx('Angebotsjahr'),
                value: String(new Date().getFullYear()),
              },
            ]}
            whatHappensNext={tx(
              'Das Angebot wird als Entwurf angelegt. Anschließend wird automatisch eine Angebotsnummer vergeben und ein PDF erzeugt.'
            )}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[angebot]}
          submit={submit}
          whatHappensNext={tx(
            'Die Angebotsnummer wird automatisch vergeben und ein PDF generiert. Du findest das Angebot in der Angebotsliste.'
          )}
          next={[
            {
              label: tx('Rechnung erstellen'),
              href: '#/intents/rechnung-erstellen',
            },
            {
              label: tx('Stunden buchen'),
              href: '#/intents/stunden-buchen',
            },
            {
              label: tx('Zum Dashboard'),
              href: '#/',
            },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
