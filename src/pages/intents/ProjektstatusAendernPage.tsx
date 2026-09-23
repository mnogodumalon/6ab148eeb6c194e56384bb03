/**
 * Projektstatus ändern — 4-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Neuen Projektstatus wählen →
 *        3) Letzten Schritt / aktuellen Stand dokumentieren → 4) Änderung speichern (Prüfen).
 * Reads: projekte (projektkennung, projektstatus, kunde, projektleitung).
 * Writes: projekte — updates projektstatus, letzter_schritt.
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

  const REVIEW_STEP = 4;

  return (
    <IntentWizardShell
      title={tx('Projektstatus ändern')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Projektstatus aktualisieren und den aktuellen Stand festhalten.'),
        needs: [tx('Projektkennung'), tx('Neuer Status')],
      }}
    >
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt soll aktualisiert werden?')}
      >
        <EntitySelectStep
          {...flow.picks.projekte.select}
          {...flow.pick('projekte')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={false}
          avatar="none"
        />
      </WizardStep>

      <WizardStep
        label={tx('Neuer Status')}
        description={tx('Welchen Status hat das Projekt jetzt?')}
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
        description={tx('Was wurde zuletzt gemacht? Wo steht das Projekt gerade?')}
        needs={['projekte', 'projektstatus']}
      >
        <Bound
          form={flow.forms.projekte}
          name="letzter_schritt"
          rows={4}
          hint={tx('Kurze Zusammenfassung des letzten Schritts oder aktuellen Stands.')}
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
            whatHappensNext={tx('Der Projektstatus und der letzte Stand werden sofort gespeichert.')}
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
            { label: tx('Stunden buchen'), href: '#/intents/stunden-buchen' },
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Das aktualisierte Projekt ist sofort in der Übersicht sichtbar.')}
        />
      )}
    </IntentWizardShell>
  );
}
