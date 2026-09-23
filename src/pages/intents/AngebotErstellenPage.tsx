/**
 * Angebot erstellen — 7-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Berater auswählen → 3) Angebotstyp wählen →
 *        4) Zeitrahmen eingeben → 5) Kosten eingeben → 6) Beschreibung erfassen → 7) Prüfen & anlegen.
 * Reads: projekte (projektkennung, projektart, projektstatus, kunde), berater (vorname, nachname, status).
 * Writes: angebote (createAngeboteEntry) — angebotsstatus wird auf 'entwurf' gesetzt.
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
  });

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Erstellt ein Angebot zu einem bestehenden Projekt — Nummer und Jahr werden automatisch vergeben.'),
        needs: [tx('Projektkennung'), tx('Zuständiger Berater')],
      }}
    >
      <WizardStep
        label={tx('Projekt')}
        description={tx('Zu welchem Projekt soll das Angebot erstellt werden?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          avatar="none"
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
          searchPlaceholder={tx('Name suchen …')}
          avatar="initials"
        />
      </WizardStep>

      <WizardStep
        label={tx('Angebotstyp')}
        description={tx('Um welche Art von Angebot handelt es sich?')}
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
        description={tx('Beginn, Ende und Dauer des Angebots festhalten.')}
        needs={['angebotstyp']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="zeitrahmen_anfang" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_ende" />
          <Bound form={flow.forms.angebote} name="dauer" hint={tx('z. B. 3 Monate, 12 Wochen')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Kosten')}
        description={tx('Kostentyp und Betrag des Angebots angeben.')}
        needs={['zeitrahmen_anfang']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="kostentyp" allowClear />
          <Bound form={flow.forms.angebote} name="kostenbetrag" hint={tx('Betrag in Euro')} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Beschreibung')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Leistungsumfang und weitere Details zum Angebot beschreiben.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="beschreibung" rows={5} hint={tx('Leistungsumfang, Voraussetzungen, Besonderheiten …')} />
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
              { key: 'angebotsstatus', label: tx('Status'), value: tx('Entwurf') },
            ]}
            whatHappensNext={tx('Angebotsnummer und Jahr vergibt das System automatisch. Das Angebot wird als PDF generiert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Sobald das Angebot versendet wurde, den Status über „Angebotsstatus aktualisieren" anpassen.')}
          next={[
            { label: tx('Angebotsstatus aktualisieren'), href: '#/intents/angebotsstatus-aendern' },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
