/**
 * Angebot erstellen — 4-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Berater wählen → 3) Typ, Zeitrahmen, Kosten & Beschreibung → 4) Prüfen & anlegen.
 * Reads: projekte, berater. Writes: angebote (via useAngebotErstellenFlow; Status „Entwurf“ setzt der Ablauf selbst).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText } from '@/lib/journey';
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
      kostentyp: 3,
      kostenbetrag: 3,
      beschreibung: 3,
    },
    items: {
      projekt: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: ctx.ref('kunde'),
      }),
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
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
        description: tx('Ein Angebot für ein Projekt als Entwurf anlegen.'),
        needs: [tx('Projekt'), tx('Zuständiger Berater'), tx('Beginn des Zeitrahmens')],
      }}
    >
      <WizardStep label={tx('Projekt')} description={tx('Für welches Projekt ist das Angebot?')}>
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
        />
      </WizardStep>
      <WizardStep label={tx('Berater')} description={tx('Wer ist für das Angebot zuständig?')}>
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          searchPlaceholder={tx('Name suchen …')}
          avatar="initials"
        />
      </WizardStep>
      <WizardStep
        label={tx('Angebot')}
        description={tx('Typ, Zeitrahmen, Kosten und Leistungsumfang festhalten.')}
        needs={['projekt', 'berater']}
      >
        <div className="space-y-4">
          <Bound form={f} name="angebotstyp" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Bound form={f} name="zeitrahmen_anfang" />
            <Bound form={f} name="zeitrahmen_ende" />
          </div>
          <Bound form={f} name="dauer" placeholder={tx('z. B. 6 Monate')} />
          <Bound form={f} name="kostentyp" />
          <Bound form={f} name="kostenbetrag" hint={tx('In Euro, z. B. 2500')} />
          <Bound form={f} name="beschreibung" rows={4} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'angebotsstatus', label: tx('Status'), value: tx('Entwurf') }]}
            whatHappensNext={tx('Angebotsnummer und Jahr vergibt das System automatisch.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Stunden erfassen'), href: '#/intents/zeit-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Das Angebot liegt als Entwurf vor.')}
        />
      )}
    </IntentWizardShell>
  );
}
