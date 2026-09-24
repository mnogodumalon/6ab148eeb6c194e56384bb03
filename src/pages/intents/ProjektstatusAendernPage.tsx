/**
 * Projektstatus ändern — 4-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Neuen Status wählen → 3) Letzten Schritt aktualisieren → 4) Prüfen & speichern.
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
      projekte: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: ctx.ref('kunde'),
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
        description: tx('Projektstatus aktualisieren und den letzten Stand festhalten.'),
        needs: [tx('Projektkennung oder Kundenname'), tx('Neuer Status'), tx('Kurze Beschreibung des letzten Schritts')],
      }}
    >
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt soll aktualisiert werden?')}
      >
        <EntitySelectStep
          {...flow.picks.projekte.select}
          {...flow.pick('projekte')}
          searchPlaceholder={tx('Projektkennung oder Kunde …')}
          avatar="none"
          columns={1}
        />
      </WizardStep>

      <WizardStep
        label={tx('Neuer Status')}
        description={tx('Welchen Status hat das Projekt jetzt?')}
        needs={['projekte']}
      >
        <Bound
          form={flow.forms.projekte}
          name="projektstatus"
        />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Letzter Schritt')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Letzter Schritt')}
        description={tx('Was wurde zuletzt gemacht oder was ist der aktuelle Stand?')}
        needs={['projektstatus']}
      >
        <Bound
          form={flow.forms.projekte}
          name="letzter_schritt"
          rows={4}
          hint={tx('Kurze Beschreibung des aktuellen Stands oder des letzten Schritts.')}
        />
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
            whatHappensNext={tx('Der Projektstatus und der letzte Schritt werden sofort gespeichert.')}
            confirmLabel={tx('Status speichern')}
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
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Stunden erfassen'), href: '#/intents/stunden-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Bei weiteren Änderungen diesen Ablauf erneut starten.')}
        />
      )}
    </IntentWizardShell>
  );
}
