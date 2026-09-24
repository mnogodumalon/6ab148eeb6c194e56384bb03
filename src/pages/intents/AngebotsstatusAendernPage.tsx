/**
 * Angebotsstatus aktualisieren — 3-Schritt-Wizard.
 * Steps: 1) Angebot auswählen → 2) Neuen Status setzen → 3) Prüfen & speichern.
 * Reads: angebote (angebotsnummer, angebotsstatus, projekt, berater). Writes: angebote (angebotsstatus).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldNumber } from '@/lib/journey';
import { useAngebotsstatusAendernFlow } from '@/lib/journey/flows/AngebotsstatusAendern';
import { tx } from '@/i18n';

export default function AngebotsstatusAendernPage() {
  const [step, setStep] = useState(1);

  const flow = useAngebotsstatusAendernFlow({
    steps: { angebote: 1, angebotsstatus: 2 },
    items: {
      angebote: r => ({
        id: r.id,
        title: fieldNumber(r, 'angebotsnummer')
          ? tx`Angebot ${String(fieldNumber(r, 'angebotsnummer'))}`
          : fieldText(r, 'dauer') || r.id,
        subtitle: fieldLookup(r, 'angebotsstatus')?.label,
        status: fieldLookup(r, 'angebotsstatus') ?? undefined,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Angebotsstatus aktualisieren')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Status eines bestehenden Angebots ändern — z. B. von Entwurf auf Versendet.'),
        needs: [tx('Angebotsnummer oder Projektbezug'), tx('Neuer Status')],
      }}
    >
      <WizardStep
        label={tx('Angebot')}
        description={tx('Welches Angebot soll aktualisiert werden?')}
      >
        <EntitySelectStep
          {...flow.picks.angebote.select}
          {...flow.pick('angebote')}
          searchPlaceholder={tx('Angebotsnummer oder Beschreibung …')}
          create={false}
          emptyText={tx('Kein Angebot gefunden. Lege zuerst ein Angebot an.')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Neuer Status')}
        description={tx('Wähle den Status, auf den das Angebot gesetzt werden soll.')}
        needs={['angebote']}
      >
        <Bound form={flow.forms.angebote} name="angebotsstatus" />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der neue Angebotsstatus wird sofort gespeichert.')}
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
            { label: tx('Weiteres Angebot aktualisieren') },
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
