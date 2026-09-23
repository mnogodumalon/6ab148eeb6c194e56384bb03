/**
 * Angebot erstellen — 7-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Berater:in auswählen → 3) Angebotstyp wählen
 *        → 4) Zeitrahmen eingeben → 5) Kostentyp und Kostenbetrag eingeben
 *        → 6) Beschreibung erfassen → 7) Prüfen & anlegen.
 * Reads: projekte (projektkennung, projektart, projektstatus), berater (vorname, nachname, status aktiv).
 * Writes: angebote (createAngeboteEntry) — setzt angebotsstatus='entwurf', angebotsjahr=aktuelles Jahr.
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
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldLookup(r, 'projektart')?.label,
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
    compute: {
      angebotsjahr: () => new Date().getFullYear(),
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
        description: tx('Erstellt ein neues Angebot zu einem bestehenden Projekt.'),
        needs: [tx('Projekt'), tx('Zuständige Berater:in'), tx('Angebotstyp und Zeitrahmen')],
      }}
    >
      {/* Step 1: Projekt auswählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Für welches Projekt wird das Angebot erstellt?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          avatar="none"
          emptyText={tx('Kein Projekt gefunden. Lege zuerst ein Projekt an.')}
        />
        <StepNav
          hideBack
          onNext={() => flow.validateStep(1)}
          nextStepLabel={tx('Berater:in')}
        />
      </WizardStep>

      {/* Step 2: Berater:in auswählen */}
      <WizardStep
        label={tx('Berater:in')}
        description={tx('Wer ist für dieses Angebot zuständig?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          searchPlaceholder={tx('Name suchen …')}
          avatar="initials"
          emptyText={tx('Keine aktiven Berater:innen gefunden.')}
        />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Angebotstyp')}
        />
      </WizardStep>

      {/* Step 3: Angebotstyp wählen */}
      <WizardStep
        label={tx('Angebotstyp')}
        description={tx('Welche Art von Angebot wird erstellt?')}
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

      {/* Step 4: Zeitrahmen eingeben */}
      <WizardStep
        label={tx('Zeitrahmen')}
        description={tx('Beginn, optionales Ende und Dauer des Angebots festlegen.')}
        needs={['angebotstyp']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="zeitrahmen_anfang" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_ende" />
          <Bound
            form={flow.forms.angebote}
            name="dauer"
            hint={tx('z. B. 3 Monate, 12 Wochen')}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      {/* Step 5: Kostentyp und Kostenbetrag */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Abrechnungsart und Betrag für das Angebot angeben.')}
        needs={['zeitrahmen_anfang']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="kostentyp" allowClear />
          <Bound
            form={flow.forms.angebote}
            name="kostenbetrag"
            hint={tx('Betrag in Euro')}
          />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Beschreibung')}
          />
        </div>
      </WizardStep>

      {/* Step 6: Beschreibung */}
      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Optionale Beschreibung und Leistungsumfang erfassen.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="beschreibung" rows={5} />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => flow.validateStep(6)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 7: Prüfen & anlegen */}
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
            whatHappensNext={tx('Das System setzt den Status auf „Entwurf" und vergibt die Angebotsnummer automatisch.')}
          />
        )}
      </WizardStep>

      {/* Erfolgsseite */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die Angebotsnummer wird automatisch vergeben. Das Angebot kann nun weiterbearbeitet und versendet werden.')}
          next={[
            { label: tx('Weiteres Angebot erstellen') },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Stunden erfassen'), href: '#/intents/stunden-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
