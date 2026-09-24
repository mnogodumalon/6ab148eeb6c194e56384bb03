/**
 * Angebot erstellen — 7-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Berater wählen → 3) Angebotstyp wählen →
 *        4) Zeitrahmen (Beginn, Ende, Dauer) → 5) Kosten (Typ & Betrag) →
 *        6) Beschreibung / Leistungsumfang → 7) Prüfen & anlegen.
 * Reads: projekte, berater. Writes: angebote (angebotsstatus auf 'entwurf' gesetzt).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useAngebotErstellenFlow } from '@/lib/journey/flows/AngebotErstellen';
import { tx } from '@/i18n';

export default function AngebotErstellenPage() {
  const [step, setStep] = useState(1);

  const flow = useAngebotErstellenFlow({
    steps: {
      projekt: 1,
      berater: 2,
      angebotstyp: 3,
      zeitrahmen_anfang: 4,
      zeitrahmen_ende: 4,
      dauer: 4,
      kostentyp: 5,
      kostenbetrag: 5,
      beschreibung: 6,
    },
    items: {
      projekt: (r) => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldLookup(r, 'projektart')?.label,
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      berater: (r) => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Erstellt ein neues Angebot zu einem Projekt.'),
        needs: [tx('Projekt'), tx('Zuständiger Berater')],
      }}
    >
      <WizardStep
        label={tx('Projekt')}
        description={tx('Für welches Projekt wird das Angebot erstellt?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung oder Kunde …')}
          onSelect={(id) => {
            flow.pick('projekt').onSelect(id);
            setStep(2);
          }}
        />
      </WizardStep>

      <WizardStep
        label={tx('Berater')}
        description={tx('Wer ist für dieses Angebot zuständig?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          avatar="initials"
          searchPlaceholder={tx('Name des Beraters …')}
          onSelect={(id) => {
            flow.pick('berater').onSelect(id);
            setStep(3);
          }}
        />
      </WizardStep>

      <WizardStep
        label={tx('Angebotstyp')}
        description={tx('Art des Angebots auswählen.')}
        needs={['berater']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="angebotstyp" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Zeitrahmen')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Zeitrahmen')}
        description={tx('Beginn, Ende und Laufzeit des Angebots angeben.')}
        needs={['angebotstyp']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="zeitrahmen_anfang" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_ende" />
          <Bound
            form={flow.forms.angebote}
            name="dauer"
            hint={tx('z. B. „6 Monate", „1 Jahr"')}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Kosten')}
        description={tx('Kostentyp und Betrag festlegen.')}
        needs={['zeitrahmen_anfang']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="kostentyp" />
          <Bound
            form={flow.forms.angebote}
            name="kostenbetrag"
            hint={tx('In Euro')}
          />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Beschreibung')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Leistungsumfang und weitere Informationen erfassen.')}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.angebote}
            name="beschreibung"
            rows={5}
            hint={tx('Leistungsumfang, besondere Konditionen, Anmerkungen …')}
          />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => flow.validateStep(6)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              {
                key: 'angebotsstatus',
                label: tx('Status'),
                value: tx('Entwurf'),
              },
            ]}
            whatHappensNext={tx(
              'Die Angebotsnummer wird automatisch vergeben. Das Angebot wird als Entwurf angelegt.',
            )}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx(
            'Den Angebotsstatus kannst du jederzeit über „Angebotsstatus aktualisieren" ändern.',
          )}
          next={[
            {
              label: tx('Angebotsstatus aktualisieren'),
              href: '#/intents/angebotsstatus-aendern',
            },
            {
              label: tx('Stunden erfassen'),
              href: '#/intents/stunden-erfassen',
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
