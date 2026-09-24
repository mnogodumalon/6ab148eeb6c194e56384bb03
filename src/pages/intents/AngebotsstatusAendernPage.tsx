/**
 * Angebotsstatus aktualisieren — 3-Schritt-Wizard.
 * Steps: 1) Angebot auswählen → 2) Neuen Angebotsstatus wählen → 3) Prüfen & aktualisieren.
 * Reads: angebote (angebotsnummer, angebotsjahr, angebotstyp, angebotsstatus, projekt).
 * Writes: angebote.angebotsstatus (update, via flow hook).
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
      angebote: (r) => {
        const nummer = fieldNumber(r, 'angebotsnummer');
        const jahr = fieldNumber(r, 'angebotsjahr');
        const typ = fieldLookup(r, 'angebotstyp');
        const status = fieldLookup(r, 'angebotsstatus');
        const dauer = fieldText(r, 'dauer');
        return {
          id: r.id,
          title: nummer && jahr
            ? tx`Angebot ${String(nummer)}/${String(jahr)}`
            : dauer || r.id,
          subtitle: typ?.label,
          status: status ? { key: status.key, label: status.label } : undefined,
        };
      },
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
        description: tx('Status eines bestehenden Angebots auf Versendet, Angenommen oder Abgelehnt setzen.'),
        needs: [tx('Angebotsnummer oder Jahr des Angebots')],
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
          emptyText={tx('Noch keine Angebote vorhanden. Erst ein Angebot anlegen.')}
          columns={1}
        />
      </WizardStep>

      <WizardStep
        label={tx('Neuer Status')}
        description={tx('Welchen Status soll das Angebot erhalten?')}
        needs={['angebote']}
      >
        <div className="space-y-6">
          {(() => {
            const picked = flow.picks.angebote;
            const angebotId = flow.forms.angebote.get('angebote') as string | undefined;
            const rec = angebotId ? picked.recordOf(angebotId) : undefined;
            const currentStatus = rec ? fieldLookup(rec, 'angebotsstatus') : null;
            return currentStatus ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{tx('Aktuell:')}</span>
                <StatusBadge statusKey={currentStatus.key} label={currentStatus.label} />
              </div>
            ) : null;
          })()}
          <Bound
            form={flow.forms.angebote}
            name="angebotsstatus"
            hint={tx('Wähle den neuen Status für dieses Angebot.')}
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
            whatHappensNext={tx('Der Angebotsstatus wird sofort aktualisiert.')}
            confirmLabel={tx('Status aktualisieren')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          actions={{ copy: false, print: false }}
          whatHappensNext={tx('Der neue Status ist ab sofort in der Angebotsübersicht sichtbar.')}
          next={[
            { label: tx('Weiteres Angebot aktualisieren') },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
