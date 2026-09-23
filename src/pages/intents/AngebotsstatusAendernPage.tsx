/**
 * Angebotsstatus aktualisieren — 3-Schritt-Wizard.
 * Steps: 1) Angebot auswählen → 2) Neuen Status wählen → 3) Änderung prüfen & speichern.
 * Reads: angebote (angebotsnummer, angebotsjahr, angebotstyp, angebotsstatus, projekt).
 * Writes: angebote – aktualisiert `angebotsstatus` des gewählten Angebots.
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
import { fieldText, fieldNumber, fieldLookup } from '@/lib/journey';
import { useAngebotsstatusAendernFlow } from '@/lib/journey/flows/AngebotsstatusAendern';
import { tx } from '@/i18n';

export default function AngebotsstatusAendernPage() {
  const [step, setStep] = useState(1);

  const flow = useAngebotsstatusAendernFlow({
    steps: { angebote: 1, angebotsstatus: 2 },
    items: {
      angebote: r => {
        const nr = fieldNumber(r, 'angebotsnummer');
        const jahr = fieldNumber(r, 'angebotsjahr');
        const typ = fieldLookup(r, 'angebotstyp');
        const status = fieldLookup(r, 'angebotsstatus');
        const dauer = fieldText(r, 'dauer');
        return {
          id: r.id,
          title: nr != null ? tx`Angebot ${nr} / ${jahr ?? ''}` : tx('Unbekanntes Angebot'),
          subtitle: [typ?.label, dauer].filter(Boolean).join(' · '),
          status: status ? { key: status.key, label: status.label } : undefined,
        };
      },
    },
    messages: {
      angebotsstatus: tx('Bitte wähle den neuen Status für dieses Angebot.'),
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
        description: tx('Status eines Angebots auf Versendet, Angenommen oder Abgelehnt setzen.'),
        needs: [tx('Angebotsnummer'), tx('Neuer Status')],
      }}
    >
      <WizardStep
        label={tx('Angebot')}
        description={tx('Welches Angebot soll aktualisiert werden?')}
      >
        <EntitySelectStep
          {...flow.picks.angebote.select}
          {...flow.pick('angebote')}
          searchPlaceholder={tx('Angebotsnummer oder Typ …')}
          create={false}
          emptyText={tx('Kein passendes Angebot gefunden.')}
          columns={1}
        />
      </WizardStep>

      <WizardStep
        label={tx('Neuer Status')}
        description={tx('Wähle den Status, der für dieses Angebot gesetzt werden soll.')}
        needs={['angebote']}
      >
        <div className="space-y-6">
          {flow.targets.angebote.record && (() => {
            const rec = flow.targets.angebote.record!;
            const nr = fieldNumber(rec, 'angebotsnummer');
            const jahr = fieldNumber(rec, 'angebotsjahr');
            const currentStatus = fieldLookup(rec, 'angebotsstatus');
            return (
              <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
                <span className="font-medium text-foreground">
                  {nr != null ? tx`Angebot ${nr} / ${jahr ?? ''}` : tx('Angebot')}
                </span>
                {currentStatus && (
                  <>
                    <span className="text-muted-foreground">{tx('Aktuell:')}</span>
                    <StatusBadge statusKey={currentStatus.key} label={currentStatus.label} />
                  </>
                )}
              </div>
            );
          })()}
          <Bound
            form={flow.forms.angebote}
            name="angebotsstatus"
            hint={tx('Nur der Status wird geändert — alle anderen Felder bleiben unberührt.')}
          />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der neue Status wird sofort gespeichert und ist im Angebot sichtbar.')}
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
            { label: tx('Weiteres Angebot ändern') },
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Den Projektstatus kannst du separat über den Ablauf „Projektstatus ändern" aktualisieren.')}
        />
      )}
    </IntentWizardShell>
  );
}
