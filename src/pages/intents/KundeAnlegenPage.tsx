/**
 * Kunden anlegen — 5-Schritt-Wizard.
 * Steps: 1) Name, Kundentyp & E-Mail → 2) Adresse → 3) Rechnungsadresse →
 *        4) Ansprechpartner → 5) Kontaktpräferenz & Notizen → Prüfen & anlegen.
 * Reads: kunden. Writes: kunden (useKundeAnlegenFlow → createKundenEntry).
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
      bevorzugte_kontaktart: 5,
      notizen: 5,
    },
  });

  const f = flow.forms.kunden;
  const rechnungsadresseGleich = f.get('rechnungsadresse_gleich') as boolean | undefined;
  const reviewStep = 6;

  return (
    <IntentWizardShell
      title={tx('Kunden anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Lege einen neuen Kunden mit allen Pflichtfeldern an.'),
        needs: [tx('Name oder Firmenname'), tx('E-Mail-Adresse'), tx('Anschrift')],
      }}
    >
      {/* Step 1: Name, Kundentyp, E-Mail */}
      <WizardStep
        label={tx('Stammdaten')}
        description={tx('Name, Kundentyp und E-Mail-Adresse des Kunden eingeben.')}
      >
        <div className="space-y-4">
          <Bound form={f} name="kundenname" placeholder={tx('z. B. Muster GmbH')} />
          <Bound form={f} name="kundentyp" />
          <Bound form={f} name="email" placeholder={tx('z. B. kontakt@muster.de')} />
          <StepNav
            hideBack
            onNext={() => flow.validateStep(1)}
            nextStepLabel={tx('Adresse')}
          />
        </div>
      </WizardStep>

      {/* Step 2: Adresse */}
      <WizardStep
        label={tx('Adresse')}
        description={tx('Straße, Hausnummer, PLZ und Ort des Kunden eingeben.')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Bound form={f} name="strasse" placeholder={tx('Musterstraße')} />
            </div>
            <div>
              <Bound form={f} name="hausnummer" placeholder={tx('12a')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Bound form={f} name="plz" placeholder={tx('12345')} />
            </div>
            <div className="sm:col-span-2">
              <Bound form={f} name="ort" placeholder={tx('Musterstadt')} />
            </div>
          </div>
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Rechnungsadresse')}
          />
        </div>
      </WizardStep>

      {/* Step 3: Rechnungsadresse */}
      <WizardStep
        label={tx('Rechnungsadresse')}
        description={tx('Ist die Rechnungsadresse identisch mit der Lieferadresse?')}
      >
        <div className="space-y-4">
          <Bound form={f} name="rechnungsadresse_gleich" />
          {rechnungsadresseGleich === false && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Bound form={f} name="rechnungsstrasse" placeholder={tx('Rechnungsstraße')} />
                </div>
                <div>
                  <Bound form={f} name="rechnungshausnummer" placeholder={tx('12a')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Bound form={f} name="rechnungsplz" placeholder={tx('12345')} />
                </div>
                <div className="sm:col-span-2">
                  <Bound form={f} name="rechnungsort" placeholder={tx('Rechnungsort')} />
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

      {/* Step 4: Ansprechpartner */}
      <WizardStep
        label={tx('Ansprechpartner')}
        description={tx('Ansprechpartner-Daten optional erfassen.')}
      >
        <div className="space-y-4">
          <Bound form={f} name="ansprechpartner_titel" placeholder={tx('z. B. Dr.')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Bound form={f} name="ansprechpartner_vorname" placeholder={tx('Vorname')} />
            <Bound form={f} name="ansprechpartner_nachname" placeholder={tx('Nachname')} />
          </div>
          <Bound form={f} name="ansprechpartner_email" placeholder={tx('ansprechpartner@muster.de')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Kontakt & Notizen')}
          />
        </div>
      </WizardStep>

      {/* Step 5: Bevorzugte Kontaktart & Notizen */}
      <WizardStep
        label={tx('Kontakt & Notizen')}
        description={tx('Bevorzugte Kontaktart wählen und Notizen zum Kunden erfassen.')}
      >
        <div className="space-y-4">
          <Bound form={f} name="bevorzugte_kontaktart" allowClear />
          <Bound form={f} name="notizen" rows={4} placeholder={tx('Besonderheiten, Vereinbarungen …')} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 6: Prüfen & Anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Kunde wird sofort angelegt und steht für Projekte und Angebote zur Verfügung.')}
          />
        )}
      </WizardStep>

      {/* Erfolgsseite */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Der neue Kunde kann jetzt in Projekten und Angeboten verwendet werden.')}
          next={[
            { label: tx('Projekt anlegen'), href: '#/intents/projekt-anlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
