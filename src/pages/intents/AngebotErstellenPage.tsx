/**
 * Angebot erstellen — 7-Schritt-Wizard.
 * Steps: 1) Angebotstyp → 2) Projekt wählen → 3) Berater wählen → 4) Zeitrahmen →
 *        5) Kostentyp & Betrag → 6) Beschreibung → 7) Prüfen & speichern.
 * Reads: projekte (projektkennung, projektnummer, projektstatus, kunde),
 *        berater (vorname, nachname, status).
 * Writes: angebote (createAngeboteEntry) — angebotsstatus=entwurf (fixed),
 *         angebotsjahr=computed (current year).
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
import { useAngebotErstellenFlow, ANGEBOTERSTELLEN_REVIEW_STEP } from '@/lib/journey/flows/AngebotErstellen';
import { tx } from '@/i18n';

export default function AngebotErstellenPage() {
  const [step, setStep] = useState(1);

  const flow = useAngebotErstellenFlow({
    steps: {
      angebotstyp: 1,
      projekt: 2,
      berater: 3,
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
        subtitle: fieldLookup(r, 'projektstatus')?.label,
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
        description: tx('Erstellt ein neues Angebot für ein Projekt als Entwurf.'),
        needs: [tx('Projektauswahl'), tx('Zuständiger Berater'), tx('Zeitrahmen und Kosten')],
      }}
    >
      {/* Step 1 — Angebotstyp */}
      <WizardStep
        label={tx('Angebotstyp')}
        description={tx('Welche Art von Angebot soll erstellt werden?')}
      >
        <Bound form={flow.forms.angebote} name="angebotstyp" />
        <StepNav
          hideBack
          onNext={() => flow.validateStep(1)}
          nextStepLabel={tx('Projekt')}
        />
      </WizardStep>

      {/* Step 2 — Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Für welches Projekt wird das Angebot erstellt?')}
        needs={['angebotstyp']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung oder -nummer …')}
          avatar="none"
          columns={2}
        />
      </WizardStep>

      {/* Step 3 — Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wer ist für dieses Angebot zuständig?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          searchPlaceholder={tx('Name des Beraters …')}
          avatar="initials"
        />
      </WizardStep>

      {/* Step 4 — Zeitrahmen */}
      <WizardStep
        label={tx('Zeitrahmen')}
        description={tx('Wann soll das Angebot gelten? Beginn ist Pflicht, Ende optional.')}
        needs={['berater']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="zeitrahmen_anfang" />
          <Bound form={flow.forms.angebote} name="zeitrahmen_ende" />
          <Bound
            form={flow.forms.angebote}
            name="dauer"
            hint={tx('z. B. 3 Monate, 1 Jahr, unbefristet')}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      {/* Step 5 — Kostentyp & Betrag */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Wie werden die Kosten abgerechnet und wie hoch ist der Betrag?')}
        needs={['zeitrahmen_anfang']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.angebote} name="kostentyp" />
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

      {/* Step 6 — Beschreibung */}
      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Leistungsumfang und Besonderheiten des Angebots beschreiben.')}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.angebote}
            name="beschreibung"
            rows={5}
            hint={tx('Was ist im Angebot enthalten? Welche Leistungen werden erbracht?')}
          />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => flow.validateStep(6)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 7 — Prüfen & speichern */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'angebotsstatus', label: tx('Status'), value: tx('Entwurf') },
            ]}
            whatHappensNext={tx('Die Angebotsnummer wird automatisch vom System vergeben. Das Angebot wird als Entwurf gespeichert.')}
          />
        )}
      </WizardStep>

      {/* Success */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die Angebotsnummer wurde automatisch vergeben. Das Angebot kann jetzt weiter bearbeitet oder versendet werden.')}
          next={[
            { label: tx('Weiteres Angebot erstellen') },
            { label: tx('Stunden erfassen'), href: '#/intents/stunden-erfassen' },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
