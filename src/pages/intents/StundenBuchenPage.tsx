/**
 * Stunden buchen — 5-Schritt-Wizard.
 * Steps: 1) Berater wählen → 2) Projekt wählen → 3) Leistung wählen (optional) → 4) Stunden & Tätigkeit → 5) Prüfen & buchen.
 * Reads: berater (filter: aktiv), projekte, leistungskatalog.
 * Writes: zeiterfassung (createZeiterfassungEntry) — datum wird automatisch auf heute gesetzt.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldNumber, fieldDate } from '@/lib/journey';
import { useStundenBuchenFlow } from '@/lib/journey/flows/StundenBuchen';
import { tx } from '@/i18n';

export default function StundenBuchenPage() {
  const [step, setStep] = useState(1);

  const flow = useStundenBuchenFlow({
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 3,
      stunden: 4,
      taetigkeit: 4,
      erfassungsmonat: 5,
      erfassungsjahr: 5,
      abrechenbar: 5,
    },
    items: {
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldLookup(r, 'status')?.label,
        status: fieldLookup(r, 'status') ?? undefined,
      }),
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldLookup(r, 'projektstatus')?.label,
        stats: fieldNumber(r, 'projektnummer') != null
          ? [{ label: tx('Nr.'), value: String(fieldNumber(r, 'projektnummer')) }]
          : undefined,
      }),
      leistung: r => ({
        id: r.id,
        title: fieldText(r, 'leistungsname'),
        subtitle: fieldLookup(r, 'leistungstyp')?.label,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Stunden buchen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Erfasst einen Zeiterfassungseintrag für einen Berater auf einem Projekt.'),
        needs: [tx('Name des Beraters'), tx('Projektkennung'), tx('Anzahl der Stunden')],
      }}
    >
      {/* Schritt 1: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den Berater, für den die Stunden erfasst werden sollen.')}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          avatar="initials"
          searchPlaceholder={tx('Name suchen …')}
          create={{ fields: ['vorname', 'nachname', 'email_beruflich', 'status'] }}
        />
      </WizardStep>

      {/* Schritt 2: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Auf welchem Projekt wurden die Stunden erbracht?')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung oder Nummer suchen …')}
          create={{ fields: ['projektkennung', 'projektnummer', 'projektart', 'projektstatus'] }}
        />
      </WizardStep>

      {/* Schritt 3: Leistung wählen (optional) */}
      <WizardStep
        label={tx('Leistung')}
        description={tx('Optional: Welche Leistung aus dem Katalog wurde erbracht?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.leistung.select}
          {...flow.pick('leistung')}
          searchPlaceholder={tx('Leistungsname suchen …')}
          create={{ fields: ['leistungsname', 'leistungstyp'] }}
        />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
          nextStepLabel={tx('Stunden & Tätigkeit')}
        />
      </WizardStep>

      {/* Schritt 4: Stunden & Tätigkeitsbeschreibung */}
      <WizardStep
        label={tx('Stunden & Tätigkeit')}
        description={tx('Anzahl der geleisteten Stunden und eine kurze Beschreibung der Tätigkeit.')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.zeiterfassung}
            name="stunden"
            hint={tx('z. B. 7,5 für sieben Stunden dreißig Minuten')}
          />
          <Bound
            form={flow.forms.zeiterfassung}
            name="taetigkeit"
            rows={4}
            placeholder={tx('Kurze Beschreibung der durchgeführten Tätigkeiten …')}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Abrechnung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Abrechnungsdaten */}
      <WizardStep
        label={tx('Abrechnung')}
        description={tx('Abrechnungsmonat, Abrechnungsjahr und Abrechenbarkeit festlegen.')}
        needs={['stunden']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="erfassungsmonat" />
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

      {/* Schritt 6: Prüfen & bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'datum', label: tx('Datum'), value: tx('Heute (wird automatisch gesetzt)') },
            ]}
            whatHappensNext={tx('Der Eintrag wird sofort in der Zeiterfassung gespeichert und steht für die Rechnungsstellung bereit.')}
            confirmLabel={tx('Stunden buchen')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die gebuchten Stunden können jetzt für eine Rechnung verwendet werden.')}
          next={[
            { label: tx('Weitere Stunden buchen') },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
