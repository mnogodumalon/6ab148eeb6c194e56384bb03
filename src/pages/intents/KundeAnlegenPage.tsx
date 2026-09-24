/**
 * Kunden anlegen — 7-Schritt-Wizard.
 * Steps: 1) Name / Firmenname und Kundentyp → 2) E-Mail und Adresse →
 *        3) Rechnungsadresse (gleich oder abweichend) →
 *        4) Ansprechpartner (optional) → 5) Bevorzugte Kontaktart (optional) →
 *        6) Notizen (optional) → 7) Prüfen & speichern.
 * Reads: kunden (uniqueness check on email). Writes: kunden (createKundenEntry).
 * Composes: IntentWizardShell, WizardStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useKundeAnlegenFlow } from '@/lib/journey/flows/KundeAnlegen';
import { tx } from '@/i18n';

export default function KundeAnlegenPage() {
  const [step, setStep] = useState(1);

  const flow = useKundeAnlegenFlow({
    steps: {
      kundenname: 1,
      kundentyp: 1,
      email: 2,
      strasse: 2,
      hausnummer: 2,
      plz: 2,
      ort: 2,
      rechnungsadresse_gleich: 3,
      rechnungsstrasse: 3,
      rechnungshausnummer: 3,
      rechnungsplz: 3,
      rechnungsort: 3,
      ansprechpartner_titel: 4,
      ansprechpartner_vorname: 4,
      ansprechpartner_nachname: 4,
      ansprechpartner_email: 4,
      bevorzugte_kontaktart: 5,
      notizen: 6,
    },
  });

  const f = flow.forms.kunden;
  const rechnungsadresseGleich = f.get('rechnungsadresse_gleich') as boolean | undefined;

  return (
    <IntentWizardShell
      title={tx('Kunden anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Neuen Kunden mit Adresse und optionalem Ansprechpartner anlegen.'),
        needs: [tx('Name oder Firmenname'), tx('E-Mail-Adresse'), tx('Postanschrift')],
      }}
    >
      {/* Schritt 1: Name / Firmenname und Kundentyp */}
      <WizardStep
        label={tx('Name & Typ')}
        description={tx('Wie heißt der Kunde und um welche Art von Kunde handelt es sich?')}
      >
        <div className="space-y-4">
          <Bound form={f} name="kundenname" />
          <Bound form={f} name="kundentyp" />
          <StepNav
            hideBack
            onNext={() => flow.validateStep(1)}
            nextStepLabel={tx('E-Mail & Adresse')}
          />
        </div>
      </WizardStep>

      {/* Schritt 2: E-Mail und Adresse */}
      <WizardStep
        label={tx('E-Mail & Adresse')}
        description={tx('E-Mail-Adresse und Postanschrift des Kunden eingeben.')}
      >
        <div className="space-y-4">
          <Bound form={f} name="email" />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Bound form={f} name="strasse" />
            </div>
            <div>
              <Bound form={f} name="hausnummer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Bound form={f} name="plz" />
            <Bound form={f} name="ort" />
          </div>
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Rechnungsadresse')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Rechnungsadresse */}
      <WizardStep
        label={tx('Rechnungsadresse')}
        description={tx('Ist die Rechnungsadresse identisch mit der Lieferanschrift?')}
      >
        <div className="space-y-4">
          <Bound form={f} name="rechnungsadresse_gleich" />
          {rechnungsadresseGleich === false && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Bound form={f} name="rechnungsstrasse" />
                </div>
                <div>
                  <Bound form={f} name="rechnungshausnummer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Bound form={f} name="rechnungsplz" />
                <Bound form={f} name="rechnungsort" />
              </div>
            </>
          )}
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Ansprechpartner')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Ansprechpartner (optional) */}
      <WizardStep
        label={tx('Ansprechpartner')}
        description={tx('Optionaler Ansprechpartner beim Kunden (kann übersprungen werden).')}
      >
        <div className="space-y-4">
          <Bound form={f} name="ansprechpartner_titel" />
          <div className="grid grid-cols-2 gap-3">
            <Bound form={f} name="ansprechpartner_vorname" />
            <Bound form={f} name="ansprechpartner_nachname" />
          </div>
          <Bound form={f} name="ansprechpartner_email" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Kontaktart')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Bevorzugte Kontaktart (optional) */}
      <WizardStep
        label={tx('Kontaktart')}
        description={tx('Wie möchte der Kunde bevorzugt kontaktiert werden?')}
      >
        <div className="space-y-4">
          <Bound form={f} name="bevorzugte_kontaktart" allowClear />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Notizen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Notizen (optional) */}
      <WizardStep
        label={tx('Notizen')}
        description={tx('Interne Anmerkungen zum Kunden (optional).')}
      >
        <div className="space-y-4">
          <Bound form={f} name="notizen" rows={4} />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => flow.validateStep(6)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 7: Prüfen & speichern */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Kunde wird sofort angelegt und kann danach für Projekte, Angebote und Rechnungen verwendet werden.')}
            confirmLabel={tx('Kunden anlegen')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Du kannst jetzt direkt ein Projekt für diesen Kunden anlegen.')}
          next={[
            { label: tx('Projekt anlegen'), href: '#/intents/projekt-anlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
