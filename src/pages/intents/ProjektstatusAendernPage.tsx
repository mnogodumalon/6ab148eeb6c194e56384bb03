/**
 * Projektstatus ändern — 4-Schritt-Wizard.
 * Steps: 1) Projekt auswählen → 2) Neuen Status wählen (ChoiceGroup) → 3) Letzten Stand eintragen → 4) Prüfen & aktualisieren.
 * Reads: projekte (projektkennung, projektnummer, projektstatus, letzter_schritt).
 * Writes: projekte (update: projektstatus, letzter_schritt).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
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
      projekte: (r) => {
        const status = fieldLookup(r, 'projektstatus');
        return {
          id: r.id,
          title: fieldText(r, 'projektkennung'),
          subtitle: fieldText(r, 'projektnummer'),
          status: status ?? undefined,
        };
      },
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
        description: tx('Setzt den Status eines Projekts und hält den letzten Stand fest.'),
        needs: [tx('Projektkennung'), tx('Neuer Status')],
      }}
    >
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt möchtest du aktualisieren?')}
      >
        <EntitySelectStep
          {...flow.picks.projekte.select}
          {...flow.pick('projekte')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={false}
        />
      </WizardStep>

      <WizardStep
        label={tx('Status')}
        description={tx('Welchen Status hat das Projekt jetzt?')}
        needs={['projekte']}
      >
        <Bound form={flow.forms.projekte} name="projektstatus" />
        {flow.targets.projekte?.record && (
          <p className="mt-3 text-sm text-muted-foreground">
            {tx('Aktueller Status:')} {' '}
            <StatusBadge
              statusKey={fieldLookup(flow.targets.projekte.record, 'projektstatus')?.key}
              label={fieldLookup(flow.targets.projekte.record, 'projektstatus')?.label}
            />
          </p>
        )}
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Letzter Stand')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Letzter Stand')}
        description={tx('Was ist der aktuelle Stand oder nächste Schritt?')}
        needs={['projekte', 'projektstatus']}
      >
        <Bound
          form={flow.forms.projekte}
          name="letzter_schritt"
          rows={4}
          hint={tx('Kurze Zusammenfassung des aktuellen Stands oder nächsten Schritts.')}
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
            whatHappensNext={tx('Das Projekt wird sofort mit dem neuen Status aktualisiert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Du kannst den Status jederzeit erneut anpassen.')}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Stunden buchen'), href: '#/intents/stunden-buchen' },
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
