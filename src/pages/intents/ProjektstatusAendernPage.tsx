/**
 * Projektstatus ändern — 3-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Neuen Status und letzten Stand eingeben → 3) Prüfen & aktualisieren.
 * Reads: projekte (projektkennung, projektstatus, kunde, projektleitung).
 * Writes: projekte (projektstatus, letzter_schritt) — updates the picked record.
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
import { useProjektstatusAendernFlow } from '@/lib/journey/flows/ProjektstatusAendern';
import { tx } from '@/i18n';

export default function ProjektstatusAendernPage() {
  const [step, setStep] = useState(1);

  const flow = useProjektstatusAendernFlow({
    steps: {
      projekte: 1,
      projektstatus: 2,
      letzter_schritt: 3,
    },
    items: {
      projekte: (r) => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Projektstatus ändern')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Ändert den Status eines Projekts und hält den aktuellen Stand fest.'),
        needs: [tx('Projektkennung'), tx('Neuer Status')],
      }}
    >
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt aus, dessen Status du ändern möchtest.')}
      >
        <EntitySelectStep
          {...flow.picks.projekte.select}
          {...flow.pick('projekte')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={false}
        />
      </WizardStep>

      <WizardStep
        label={tx('Neuer Status')}
        description={tx('Wähle den neuen Projektstatus aus.')}
        needs={['projekte']}
      >
        <Bound form={flow.forms.projekte} name="projektstatus" />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Aktueller Stand')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Aktueller Stand')}
        description={tx('Beschreibe kurz den letzten Schritt oder aktuellen Projektstand.')}
        needs={['projektstatus']}
      >
        <Bound form={flow.forms.projekte} name="letzter_schritt" rows={4} />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Projektstatus und der aktuelle Stand werden sofort aktualisiert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Weiteres Projekt aktualisieren') },
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Der neue Status ist sofort in der Projektübersicht sichtbar.')}
        />
      )}
    </IntentWizardShell>
  );
}
