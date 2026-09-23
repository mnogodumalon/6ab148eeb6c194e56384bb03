/**
 * Kunden anlegen — 5-Schritt-Wizard.
 * Steps: 1) Firmenname/Name + Kundentyp → 2) E-Mail + Adresse →
 *        3) Rechnungsadresse (bedingt) → 4) Ansprechpartnerdaten (optional) →
 *        5) Bevorzugte Kontaktart (optional) → Prüfen & anlegen.
 * Reads: kunden (Eindeutigkeitscheck E-Mail).
 * Writes: kunden (createKundenEntry) — useKundeAnlegenFlow setzt anlagedatum selbst.
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
      // Schritt 1: Firmenname / Name und Kundentyp
      kundenname: 1,
      kundentyp: 1,
      // Schritt 2: E-Mail und Adresse
      email: 2,
      strasse: 2,
      hausnummer: 2,
      plz: 2,
      ort: 2,
      // Schritt 3: Rechnungsadresse
      rechnungsadresse_gleich: 3,
      rechnungsstrasse: 3,
      rechnungshausnummer: 3,
      rechnungsplz: 3,
      rechnungsort: 3,
      // Schritt 4: Ansprechpartnerdaten
      ansprechpartner_titel: 4,
      ansprechpartner_vorname: 4,
      ansprechpartner_nachname: 4,
      ansprechpartner_email: 4,
      // Schritt 5: Bevorzugte Kontaktart
      bevorzugte_kontaktart: 5,
    },
    messages: {
      email: tx('Bitte eine gültige E-Mail-Adresse für den Kunden angeben.'),
      strasse: tx('Bitte die Straße der Kundenadresse angeben.'),
      plz: tx('Bitte die Postleitzahl der Kundenadresse angeben.'),
      ort: tx('Bitte den Ort der Kundenadresse angeben.'),
    },
  });

  // Rechnungsadresse-Gleichheits-Flag auslesen für bedingte Anzeige
  const rechnungsadresseGleich = flow.forms.kunden.get('rechnungsadresse_gleich') as boolean | undefined;

  return (
    <IntentWizardShell
      title={tx('Kunden anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Neuen Kunden mit Adresse und optionalen Ansprechpartnerdaten erfassen.'),
        needs: [tx('Name oder Firmenname'), tx('E-Mail-Adresse'), tx('Anschrift')],
      }}
    >
      {/* Schritt 1: Firmenname / Name und Kundentyp */}
      <WizardStep
        label={tx('Name & Typ')}
        description={tx('Name oder Firmenname des Kunden und Kundenkategorie angeben.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.kunden} name="kundenname" placeholder={tx('z. B. Musterfirma GmbH oder Max Mustermann')} />
          <Bound form={flow.forms.kunden} name="kundentyp" />
          <StepNav
            hideBack
            onNext={() => flow.validateStep(1)}
            nextStepLabel={tx('Adresse')}
          />
        </div>
      </WizardStep>

      {/* Schritt 2: E-Mail und Adresse */}
      <WizardStep
        label={tx('Adresse')}
        description={tx('E-Mail und Hauptadresse des Kunden eingeben.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.kunden} name="email" placeholder={tx('z. B. kontakt@musterfirma.de')} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Bound form={flow.forms.kunden} name="strasse" placeholder={tx('Straße')} />
            </div>
            <div>
              <Bound form={flow.forms.kunden} name="hausnummer" placeholder={tx('Nr.')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Bound form={flow.forms.kunden} name="plz" placeholder={tx('PLZ')} />
            </div>
            <div className="sm:col-span-2">
              <Bound form={flow.forms.kunden} name="ort" placeholder={tx('Ort')} />
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
        description={tx('Angeben, ob die Rechnungsadresse von der Hauptadresse abweicht.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.kunden} name="rechnungsadresse_gleich" />
          {!rechnungsadresseGleich && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Bound form={flow.forms.kunden} name="rechnungsstrasse" placeholder={tx('Straße')} />
                </div>
                <div>
                  <Bound form={flow.forms.kunden} name="rechnungshausnummer" placeholder={tx('Nr.')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Bound form={flow.forms.kunden} name="rechnungsplz" placeholder={tx('PLZ')} />
                </div>
                <div className="sm:col-span-2">
                  <Bound form={flow.forms.kunden} name="rechnungsort" placeholder={tx('Ort')} />
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

      {/* Schritt 4: Ansprechpartnerdaten (optional) */}
      <WizardStep
        label={tx('Ansprechpartner')}
        description={tx('Ansprechpartnerdaten sind optional — bei Bedarf ausfüllen.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.kunden} name="ansprechpartner_titel" placeholder={tx('z. B. Dr., Prof.')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Bound form={flow.forms.kunden} name="ansprechpartner_vorname" placeholder={tx('Vorname')} />
            <Bound form={flow.forms.kunden} name="ansprechpartner_nachname" placeholder={tx('Nachname')} />
          </div>
          <Bound form={flow.forms.kunden} name="ansprechpartner_email" placeholder={tx('E-Mail des Ansprechpartners')} />
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
        description={tx('Wie soll der Kunde bevorzugt kontaktiert werden? (optional)')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.kunden} name="bevorzugte_kontaktart" allowClear />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Zusammenfassung & Bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              {
                key: 'anlagedatum',
                label: tx('Anlagedatum'),
                value: tx('Wird automatisch gesetzt'),
              },
            ]}
            whatHappensNext={tx('Der Kunde wird sofort angelegt und steht für Projekte, Angebote und Rechnungen zur Verfügung.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Jetzt ein erstes Projekt für diesen Kunden anlegen oder direkt ein Angebot erstellen.')}
          next={[
            { label: tx('Projekt anlegen'), href: '#/intents/projekt-anlegen' },
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
