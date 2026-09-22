/**
 * Angebot erstellen — 6-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Berater wählen → 3) Angebotstyp festlegen →
 *        4) Zeitrahmen & Dauer → 5) Kosten → 6) Prüfen & anlegen.
 * Reads: projekte, berater. Writes: angebote (createAngeboteEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup,
 *           Bound, Field, StepNav, SummaryStep, SuccessStep.
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
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: [
        fieldLookup(p, 'projektart')?.label,
        fieldLookup(p, 'projektstatus')?.label,
      ].filter(Boolean).join(' · '),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldLookup(b, 'status')?.label,
      status: fieldLookup(b, 'status') ?? undefined,
    }),
  });

  const f = useStepForm('angebote', {
    steps: {
      projekt: 1,
      berater: 2,
      angebotstyp: 3,
      zeitrahmen_anfang: 4,
      zeitrahmen_ende: 4,
      dauer: 4,
      kostentyp: 5,
      kostenbetrag: 5,
      beschreibung: 5,
    },
    required: {
      zeitrahmen_ende: false,
      dauer: false,
      kostentyp: false,
      kostenbetrag: false,
      beschreibung: false,
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
        form: f,
        primary: true,
        values: {
          angebotsstatus: 'entwurf',
          angebotsjahr: new Date().getFullYear(),
        },
      },
    ],
    { draftKey: 'angebot-erstellen' },
  );

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      subtitle={tx('Neues Angebot zu einem bestehenden Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="angebot-erstellen"
      intro={{
        description: tx('Erstellt ein neues Angebot für ein bestehendes Projekt.'),
        needs: [tx('Projektkennung'), tx('Zuständiger Berater'), tx('Angebotstyp und Kostenrahmen')],
      }}
    >
      {/* Schritt 1: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt, für das das Angebot erstellt werden soll.')}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={f.get('projekt') as string | null}
          onSelect={id => {
            f.set('projekt', id, projekte.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Projektkennung suchen …')}
          avatar="none"
          columns={2}
        />
      </WizardStep>

      {/* Schritt 2: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den zuständigen Berater für dieses Angebot.')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={f.get('berater') as string | null}
          onSelect={id => {
            f.set('berater', id, berater.labelOf(id));
            setStep(3);
          }}
          searchPlaceholder={tx('Berater suchen …')}
          avatar="initials"
          create={false}
        />
      </WizardStep>

      {/* Schritt 3: Angebotstyp festlegen */}
      <WizardStep
        label={tx('Angebotstyp')}
        description={tx('Welche Art von Angebot soll erstellt werden?')}
        needs={['berater']}
      >
        <div className="space-y-6">
          <Bound form={f} name="angebotstyp" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => f.validate(['angebotstyp'])}
            nextStepLabel={tx('Zeitrahmen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Zeitrahmen & Dauer */}
      <WizardStep
        label={tx('Zeitrahmen')}
        description={tx('Beginn des Angebotszeitraums ist Pflicht, Ende und Dauer sind optional.')}
        needs={['angebotstyp']}
      >
        <div className="space-y-4">
          <Bound form={f} name="zeitrahmen_anfang" />
          <Bound form={f} name="zeitrahmen_ende" hint={tx('Optional — Ende des Leistungszeitraums')} />
          <Bound form={f} name="dauer" hint={tx('Optional — z. B. „3 Monate" oder „laufend"')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => f.validate(['zeitrahmen_anfang'])}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Kosten & Beschreibung */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Kostentyp, Betrag und optionale Leistungsbeschreibung erfassen.')}
        needs={['zeitrahmen_anfang']}
      >
        <div className="space-y-4">
          <Bound form={f} name="kostentyp" />
          <Bound form={f} name="kostenbetrag" hint={tx('Betrag in Euro')} />
          <Bound form={f} name="beschreibung" rows={4} hint={tx('Optional — Beschreibung des Leistungsumfangs')} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => f.validate(['kostentyp', 'kostenbetrag', 'beschreibung'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Zusammenfassung & Bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            items={[
              { key: 'status', label: tx('Angebotsstatus'), value: tx('Entwurf') },
              { key: 'jahr', label: tx('Angebotsjahr'), value: String(new Date().getFullYear()) },
            ]}
            whatHappensNext={tx(
              'Das Angebot wird als Entwurf angelegt. Angebotsnummer und PDF werden automatisch erzeugt.',
            )}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          whatHappensNext={tx(
            'Die Angebotsnummer und das PDF-Anhang werden vom System vergeben – dies kann einen Moment dauern.',
          )}
          next={[
            {
              label: tx('Weiteres Angebot erstellen'),
            },
            {
              label: tx('Rechnung erstellen'),
              href: '#/intents/rechnung-erstellen',
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
