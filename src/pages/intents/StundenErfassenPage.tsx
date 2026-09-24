/**
 * Stunden erfassen — 6-Schritt-Wizard.
 * Steps: 1) Berater wählen (nur aktive) → 2) Projekt wählen → 3) Datum & Stunden eingeben
 *        → 4) Leistung wählen (optional) → 5) Tätigkeitsbeschreibung & Abrechnung → 6) Prüfen & speichern.
 * Reads: berater (filter: status=aktiv), projekte, leistungskatalog.
 * Writes: zeiterfassung (createZeiterfassungEntry).
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
import { useStundenErfassenFlow } from '@/lib/journey/flows/StundenErfassen';
import { tx } from '@/i18n';

export default function StundenErfassenPage() {
  const [step, setStep] = useState(1);

  const flow = useStundenErfassenFlow({
    steps: {
      berater: 1,
      projekt: 2,
      datum: 3,
      stunden: 3,
      leistung: 4,
      taetigkeit: 5,
      erfassungsmonat: 5,
      erfassungsjahr: 5,
      abrechenbar: 5,
    },
    items: {
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldNumber(r, 'projektnummer') != null
          ? tx`Projektnr. ${String(fieldNumber(r, 'projektnummer'))}`
          : undefined,
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      leistung: r => ({
        id: r.id,
        title: fieldText(r, 'leistungsname'),
        status: fieldLookup(r, 'leistungstyp') ?? undefined,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Stunden erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Geleistete Stunden eines Beraters für ein Projekt erfassen.'),
        needs: [tx('Name des Beraters'), tx('Projektkennung'), tx('Datum und Stundenanzahl')],
      }}
    >
      {/* Schritt 1: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den Berater, dessen Stunden du erfassen möchtest.')}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          avatar="initials"
          searchPlaceholder={tx('Vorname oder Nachname …')}
          emptyText={tx('Kein aktiver Berater gefunden. Nur Berater mit Status „Aktiv" sind auswählbar.')}
          create={false}
        />
      </WizardStep>

      {/* Schritt 2: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Für welches Projekt wurden die Stunden geleistet?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung oder Nummer …')}
          create={false}
          columns={2}
        />
      </WizardStep>

      {/* Schritt 3: Datum und Stunden */}
      <WizardStep
        label={tx('Datum & Stunden')}
        description={tx('Datum und Anzahl der geleisteten Stunden eingeben.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="datum" />
          <Bound
            form={flow.forms.zeiterfassung}
            name="stunden"
            hint={tx('Dezimalzahl, z. B. 7.5 für 7,5 Stunden')}
          />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Leistung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Leistung wählen (optional) */}
      <WizardStep
        label={tx('Leistung')}
        description={tx('Welche Leistung wurde erbracht? Dieser Schritt ist optional.')}
      >
        <EntitySelectStep
          {...flow.picks.leistung.select}
          {...flow.pick('leistung')}
          searchPlaceholder={tx('Leistungsname …')}
          create={false}
        />
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Abrechnung')}
          nextLabel={
            !flow.forms.zeiterfassung.get('leistung')
              ? tx('Überspringen')
              : undefined
          }
        />
      </WizardStep>

      {/* Schritt 5: Tätigkeitsbeschreibung, Abrechnungsmonat/-jahr, Abrechenbar */}
      <WizardStep
        label={tx('Abrechnung')}
        description={tx('Tätigkeitsbeschreibung und Abrechnungszeitraum festlegen.')}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.zeiterfassung}
            name="taetigkeit"
            rows={3}
            hint={tx('Optional: Kurze Beschreibung der ausgeführten Tätigkeit')}
          />
          <Bound form={flow.forms.zeiterfassung} name="erfassungsmonat" allowClear />
          <Bound
            form={flow.forms.zeiterfassung}
            name="erfassungsjahr"
            hint={tx('z. B. 2026')}
          />
          <Bound form={flow.forms.zeiterfassung} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Zusammenfassung & Speichern */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Zeiteintrag wird sofort gespeichert und steht für die Rechnungsstellung bereit.')}
            confirmLabel={tx('Eintrag speichern')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Der Eintrag ist jetzt in der Zeiterfassung gespeichert und kann für Rechnungen verwendet werden.')}
          next={[
            { label: tx('Weitere Stunden erfassen'), onClick: flow.reset },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
