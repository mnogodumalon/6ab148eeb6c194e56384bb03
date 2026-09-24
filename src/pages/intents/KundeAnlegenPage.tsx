/**
 * Kunden anlegen — 4-Schritt-Wizard.
 * Steps: 1) Basisinformationen (Name, Kundentyp, E-Mail) →
 *         2) Adresse (Straße, Hausnummer, PLZ, Ort) →
 *         3) Rechnungsadresse (gleich oder abweichend) →
 *         4) Ansprechpartner & Kontaktpräferenz → Prüfen & Anlegen.
 * Reads: kunden. Writes: kunden (useKundeAnlegenFlow).
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
      email: 1,
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
      bevorzugte_kontaktart: 4,
      notizen: 4,
    },
  });

  const f = flow.forms.kunden;
  const rechnungsadresseGleich = f.get('rechnungsadresse_gleich') === true;

  return (
    <IntentWizardShell
      title={tx('Kunden anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Legt einen neuen Kunden mit Stammdaten, Adresse und Ansprechpartner an.'),
        needs: [tx('Name oder Firmenname'), tx('E-Mail-Adresse'), tx('Postanschrift')],
      }}
    >
      {/* Schritt 1: Basisinformationen */}
      <WizardStep
        label={tx('Basisinformationen')}
        description={tx('Name, Typ und E-Mail-Adresse des Kunden eingeben.')}
      >
        <div className="space-y-4">
          <Bound form={f} name="kundenname" placeholder={tx('z. B. Muster GmbH oder Maria Muster')} />
          <Bound form={f} name="kundentyp" />
          <Bound form={f} name="email" placeholder={tx('kontakt@beispiel.de')} />
          <StepNav
            hideBack
            onNext={() => flow.validateStep(1)}
            nextStepLabel={tx('Adresse')}
          />
        </div>
      </WizardStep>

      {/* Schritt 2: Adresse */}
      <WizardStep
        label={tx('Adresse')}
        description={tx('Postanschrift des Kunden eingeben.')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Bound form={f} name="strasse" placeholder={tx('Musterstraße')} />
            </div>
            <Bound form={f} name="hausnummer" placeholder={tx('12a')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Bound form={f} name="plz" placeholder={tx('12345')} />
            <div className="sm:col-span-2">
              <Bound form={f} name="ort" placeholder={tx('Berlin')} />
            </div>
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
        description={tx('Ist die Rechnungsadresse identisch mit der Adresse?')}
      >
        <div className="space-y-4">
          <Bound form={f} name="rechnungsadresse_gleich" />
          {!rechnungsadresseGleich && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Bound form={f} name="rechnungsstrasse" placeholder={tx('Rechnungsstraße')} />
                </div>
                <Bound form={f} name="rechnungshausnummer" placeholder={tx('12a')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Bound form={f} name="rechnungsplz" placeholder={tx('12345')} />
                <div className="sm:col-span-2">
                  <Bound form={f} name="rechnungsort" placeholder={tx('Berlin')} />
                </div>
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

      {/* Schritt 4: Ansprechpartner & Kontaktpräferenz */}
      <WizardStep
        label={tx('Ansprechpartner')}
        description={tx('Ansprechpartner und bevorzugte Kontaktart festhalten.')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Bound form={f} name="ansprechpartner_titel" placeholder={tx('Dr., Prof., …')} />
            <Bound form={f} name="ansprechpartner_vorname" placeholder={tx('Maria')} />
            <Bound form={f} name="ansprechpartner_nachname" placeholder={tx('Muster')} />
          </div>
          <Bound form={f} name="ansprechpartner_email" placeholder={tx('maria.muster@beispiel.de')} />
          <Bound form={f} name="bevorzugte_kontaktart" />
          <Bound form={f} name="notizen" rows={3} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Prüfen & Anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Kunde wird sofort angelegt und steht für Projekte und Angebote zur Verfügung.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Projekt anlegen'), href: '#/intents/projekt-anlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Mit „Projekt anlegen" direkt das erste Projekt für diesen Kunden starten.')}
        />
      )}
    </IntentWizardShell>
  );
}
