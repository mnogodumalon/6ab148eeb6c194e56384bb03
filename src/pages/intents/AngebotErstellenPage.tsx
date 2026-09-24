/**
 * Angebot erstellen — 6-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Berater auswählen → 3) Angebotstyp & Zeitrahmen →
 *        4) Kosten → 5) Beschreibung → 6) Prüfen & anlegen.
 * Reads: projekte (projektkennung, projektart, projektstatus, kunde),
 *        berater (vorname, nachname, status).
 * Writes: angebote (createAngeboteEntry) — angebotsjahr computed, angebotsstatus fixed 'entwurf'.
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
      zeitrahmen_anfang: 3,
      zeitrahmen_ende: 3,
      dauer: 3,
      kostentyp: 4,
      kostenbetrag: 4,
      beschreibung: 5,
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
        description: tx('Erstellt ein neues Angebot für ein bestehendes Projekt.'),
        needs: [tx('Projektkennung'), tx('Zuständiger Berater')],
      }}
    >
      {/* Schritt 1: Projekt auswählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Für welches Projekt soll das Angebot erstellt werden?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          avatar="none"
          columns={2}
        />
      </WizardStep>

      {/* Schritt 2: Berater auswählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wer ist für dieses Angebot zuständig?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          searchPlaceholder={tx('Name des Beraters suchen …')}
          avatar="initials"
          create={false}
          emptyText={tx('Kein aktiver Berater gefunden. Bitte zuerst einen Berater anlegen.')}
        />
      </WizardStep>

      {/* Schritt 3: Angebotstyp und Zeitrahmen */}
      <WizardStep
        label={tx('Zeitrahmen')}
        description={tx('Angebotstyp, Beginn, Ende und Dauer des Angebotszeitraums angeben.')}
        needs={['berater']}
      >
        <div className="space-y-5">
          <Bound form={flow.forms.angebote} name="angebotstyp" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_anfang" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_ende" />
          <Bound
            form={flow.forms.angebote}
            name="dauer"
            hint={tx('z. B. 3 Monate, 6 Wochen …')}
          />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Kostentyp und Kostenbetrag */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Abrechnungsart und den Kostenbetrag des Angebots festlegen.')}
        needs={['zeitrahmen_anfang']}
      >
        <div className="space-y-5">
          <Bound form={flow.forms.angebote} name="kostentyp" />
          <Bound
            form={flow.forms.angebote}
            name="kostenbetrag"
            hint={tx('Betrag in Euro (netto)')}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Beschreibung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Beschreibung / Leistungsumfang */}
      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Leistungsumfang und weitere Informationen zum Angebot beschreiben.')}
      >
        <div className="space-y-5">
          <Bound
            form={flow.forms.angebote}
            name="beschreibung"
            rows={6}
            hint={tx('Beschreibe den Leistungsumfang möglichst konkret.')}
          />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Prüfen & anlegen */}
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
              'Die Angebotsnummer wird automatisch vergeben. Anschließend kann ein PDF generiert werden.'
            )}
            confirmLabel={tx('Angebot anlegen')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx(
            'Das Angebot befindet sich im Status „Entwurf". Es kann nun als PDF ausgegeben und versendet werden.'
          )}
          next={[
            {
              label: tx('Rechnung erstellen'),
              href: '#/intents/rechnung-erstellen',
            },
            {
              label: tx('Stunden buchen'),
              href: '#/intents/zeit-buchen',
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
