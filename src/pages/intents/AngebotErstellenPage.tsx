/**
 * Angebot erstellen — 7-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Berater:in wählen → 3) Angebotstyp wählen
 *        → 4) Zeitrahmen eingeben → 5) Kosten eingeben → 6) Beschreibung erfassen → 7) Prüfen & anlegen.
 * Reads: projekte (projektkennung, kunde, projektart, projektstatus), berater (vorname, nachname, status).
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
        subtitle: fieldLookup(r, 'projektart')?.label ?? undefined,
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
  });

  const f = flow.forms.angebote;

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Neues Angebot zu einem Projekt anlegen und kaufmännische Felder erfassen.'),
        needs: [tx('Projekt'), tx('Zuständige Berater:in'), tx('Zeitrahmen und Kostendaten')],
      }}
    >
      {/* Step 1 — Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Zu welchem Projekt gehört dieses Angebot?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          avatar="none"
          create={false}
          emptyText={tx('Kein Projekt gefunden. Lege zuerst ein Projekt an.')}
        />
        <StepNav
          hideBack
          onNext={() => flow.validateStep(1)}
          nextStepLabel={tx('Berater:in')}
        />
      </WizardStep>

      {/* Step 2 — Berater:in wählen */}
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
          create={false}
          emptyText={tx('Keine aktiven Berater:innen gefunden.')}
        />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Angebotstyp')}
        />
      </WizardStep>

      {/* Step 3 — Angebotstyp */}
      <WizardStep
        label={tx('Angebotstyp')}
        description={tx('Um welche Art von Angebot handelt es sich?')}
        needs={['berater']}
      >
        <div className="space-y-4">
          <Bound form={f} name="angebotstyp" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Zeitrahmen')}
          />
        </div>
      </WizardStep>

      {/* Step 4 — Zeitrahmen */}
      <WizardStep
        label={tx('Zeitrahmen')}
        description={tx('Wann beginnt das Angebot, und wie lange läuft es?')}
        needs={['angebotstyp']}
      >
        <div className="space-y-4">
          <Bound form={f} name="zeitrahmen_anfang" />
          <Bound form={f} name="zeitrahmen_ende" />
          <Bound
            form={f}
            name="dauer"
            hint={tx('Freitext, z. B. „3 Monate" oder „bis Projektende"')}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      {/* Step 5 — Kostentyp & Kostenbetrag */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Wie wird das Angebot abgerechnet, und wie hoch ist der Betrag?')}
        needs={['zeitrahmen_anfang']}
      >
        <div className="space-y-4">
          <Bound form={f} name="kostentyp" />
          <Bound form={f} name="kostenbetrag" hint={tx('In Euro, z. B. 5000')} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Beschreibung')}
          />
        </div>
      </WizardStep>

      {/* Step 6 — Beschreibung / Leistungsumfang */}
      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Welche Leistungen sind im Angebot enthalten?')}
      >
        <div className="space-y-4">
          <Bound form={f} name="beschreibung" rows={5} />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => flow.validateStep(6)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 7 — Prüfen & anlegen */}
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
              'Das Angebot wird als Entwurf angelegt. Angebotsnummer und Jahr vergibt das System automatisch. Anschließend erstellt das Werkzeug „angebot-pdf-erzeugen" das PDF.'
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
            'Das PDF wird automatisch vom Werkzeug „angebot-pdf-erzeugen" erzeugt und steht danach im Anhang bereit.'
          )}
          next={[
            { label: tx('Weiteres Angebot erstellen') },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Stunden buchen'), href: '#/intents/stunden-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
