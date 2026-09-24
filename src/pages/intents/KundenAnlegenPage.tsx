/**
 * Kunden anlegen — 5-Schritt-Wizard.
 * Steps: 1) Basisdaten (Name, Kundentyp, E-Mail) → 2) Adresse →
 *        3) Rechnungsadresse (ggf. abweichend) → 4) Ansprechpartner → 5) Kontaktpräferenz & Prüfen.
 * Reads: kunden (Eindeutigkeitsprüfung E-Mail).
 * Writes: kunden (createKundenEntry via flow hook).
 * Composes: IntentWizardShell, WizardStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useKundenAnlegenFlow } from '@/lib/journey/flows/KundenAnlegen';
import { tx } from '@/i18n';

export default function KundenAnlegenPage() {
  const [step, setStep] = useState(1);

  const flow = useKundenAnlegenFlow({
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
    },
    messages: {
      email: tx('Bitte eine gültige E-Mail-Adresse eingeben.'),
      kundenname: tx('Bitte Name oder Firmenname eingeben.'),
    },
  });

  const f = flow.forms.kunden;
  const rechnungGleich = f.get('rechnungsadresse_gleich') as boolean | undefined;

  return (
    <IntentWizardShell
      title={tx('Kunden anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Neuen Kunden mit Stammdaten und optionalem Ansprechpartner anlegen.'),
        needs: [tx('Name oder Firmenname'), tx('E-Mail-Adresse'), tx('Postadresse')],
      }}
    >
      {/* Schritt 1: Basisdaten */}
      <WizardStep
        label={tx('Basisdaten')}
        description={tx('Name, Typ und E-Mail-Adresse des Kunden eingeben.')}
      >
        <div className="space-y-4">
          <Bound form={f} name="kundenname" />
          <Bound form={f} name="kundentyp" />
          <Bound form={f} name="email" />
          <StepNav
            onBack={undefined}
            hideBack
            onNext={() => flow.validateStep(1)}
            nextStepLabel={tx('Adresse')}
          />
        </div>
      </WizardStep>

      {/* Schritt 2: Adresse */}
      <WizardStep
        label={tx('Adresse')}
        description={tx('Straße, Hausnummer, PLZ und Ort des Kunden eingeben.')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Bound form={f} name="strasse" />
            </div>
            <div>
              <Bound form={f} name="hausnummer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
        description={tx('Ist die Rechnungsadresse identisch mit der Lieferadresse?')}
      >
        <div className="space-y-4">
          <Bound form={f} name="rechnungsadresse_gleich" />
          {rechnungGleich === false && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Bound form={f} name="rechnungsstrasse" />
                </div>
                <div>
                  <Bound form={f} name="rechnungshausnummer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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

      {/* Schritt 4: Ansprechpartner */}
      <WizardStep
        label={tx('Ansprechpartner')}
        description={tx('Ansprechpartner-Daten sind optional.')}
      >
        <div className="space-y-4">
          <Bound form={f} name="ansprechpartner_titel" />
          <div className="grid grid-cols-2 gap-4">
            <Bound form={f} name="ansprechpartner_vorname" />
            <Bound form={f} name="ansprechpartner_nachname" />
          </div>
          <Bound form={f} name="ansprechpartner_email" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Kontakt')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Kontaktart */}
      <WizardStep
        label={tx('Kontakt')}
        description={tx('Bevorzugte Kontaktart auswählen (optional).')}
      >
        <div className="space-y-4">
          <Bound form={f} name="bevorzugte_kontaktart" allowClear />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Prüfen & Anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Kunde wird sofort angelegt und kann in Projekten und Rechnungen verwendet werden.')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Jetzt kannst du direkt ein Projekt für diesen Kunden anlegen.')}
          next={[
            { label: tx('Projekt anlegen'), href: '#/intents/projekt-anlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
