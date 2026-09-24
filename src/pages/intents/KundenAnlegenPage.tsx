/**
 * Kunden anlegen — 5-Schritt-Wizard.
 * Steps: 1) Name / Firmenname und Kundentyp → 2) E-Mail und Hauptadresse →
 *        3) Rechnungsadresse → 4) Ansprechpartner → 5) Kontaktpräferenz & Notizen.
 * Reads: — (keine externe Entität nötig, rein formularbasiert).
 * Writes: kunden (useKundenAnlegenFlow → createKunden).
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
      notizen: 5,
    },
  });

  const f = flow.forms.kunden;
  const rechnungsAdresseGleich = f.get('rechnungsadresse_gleich') === true;

  return (
    <IntentWizardShell
      title={tx('Kunden anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Neuen Kunden mit Adress- und Kontaktdaten vollständig anlegen.'),
        needs: [tx('Name oder Firmenname'), tx('E-Mail-Adresse'), tx('Hauptadresse')],
      }}
    >
      {/* Schritt 1: Name und Kundentyp */}
      <WizardStep
        label={tx('Name & Typ')}
        description={tx('Wie heißt der Kunde, und um welche Art von Kunde handelt es sich?')}
      >
        <div className="space-y-4">
          <Bound form={f} name="kundenname" placeholder={tx('z. B. Mustermann GmbH oder Max Mustermann')} />
          <Bound form={f} name="kundentyp" />
          <StepNav
            hideBack
            onNext={() => flow.validateStep(1)}
            nextStepLabel={tx('Adresse')}
          />
        </div>
      </WizardStep>

      {/* Schritt 2: E-Mail und Hauptadresse */}
      <WizardStep
        label={tx('Adresse')}
        description={tx('E-Mail-Adresse und Hauptanschrift des Kunden eingeben.')}
        needs={['kundenname', 'kundentyp']}
      >
        <div className="space-y-4">
          <Bound form={f} name="email" placeholder={tx('z. B. info@mustermann.de')} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Bound form={f} name="strasse" placeholder={tx('Straßenname')} />
            </div>
            <div>
              <Bound form={f} name="hausnummer" placeholder={tx('Nr.')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Bound form={f} name="plz" placeholder={tx('PLZ')} />
            </div>
            <div className="sm:col-span-2">
              <Bound form={f} name="ort" placeholder={tx('Ort')} />
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
        description={tx('Ist die Rechnungsadresse dieselbe wie die Hauptadresse, oder weicht sie ab?')}
        needs={['email', 'strasse', 'hausnummer', 'plz', 'ort']}
      >
        <div className="space-y-4">
          <Bound form={f} name="rechnungsadresse_gleich" />
          {!rechnungsAdresseGleich && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Bound form={f} name="rechnungsstrasse" placeholder={tx('Rechnungsstraße')} />
                </div>
                <div>
                  <Bound form={f} name="rechnungshausnummer" placeholder={tx('Nr.')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Bound form={f} name="rechnungsplz" placeholder={tx('PLZ')} />
                </div>
                <div className="sm:col-span-2">
                  <Bound form={f} name="rechnungsort" placeholder={tx('Ort')} />
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

      {/* Schritt 4: Ansprechpartner */}
      <WizardStep
        label={tx('Ansprechpartner')}
        description={tx('Wen kontaktieren wir beim Kunden? Titel, Name und E-Mail erfassen.')}
        needs={['rechnungsadresse_gleich']}
      >
        <div className="space-y-4">
          <Bound form={f} name="ansprechpartner_titel" placeholder={tx('z. B. Dr., Prof.')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Bound form={f} name="ansprechpartner_vorname" placeholder={tx('Vorname')} />
            <Bound form={f} name="ansprechpartner_nachname" placeholder={tx('Nachname')} />
          </div>
          <Bound form={f} name="ansprechpartner_email" placeholder={tx('z. B. max@mustermann.de')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Kontakt & Notizen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Kontaktpräferenz und Notizen */}
      <WizardStep
        label={tx('Kontakt & Notizen')}
        description={tx('Wie soll der Kunde bevorzugt kontaktiert werden? Optionale Notizen ergänzen.')}
        needs={['ansprechpartner_vorname', 'ansprechpartner_nachname']}
      >
        <div className="space-y-4">
          <Bound form={f} name="bevorzugte_kontaktart" allowClear />
          <Bound form={f} name="notizen" rows={4} placeholder={tx('Interne Hinweise zum Kunden …')} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Zusammenfassung */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Kunde wird sofort angelegt und ist danach in allen Abläufen verfügbar.')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Du kannst direkt ein erstes Projekt für diesen Kunden anlegen.')}
          next={[
            { label: tx('Projekt anlegen'), href: '#/intents/projekt-anlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
