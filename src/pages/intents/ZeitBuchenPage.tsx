/**
 * Zeit buchen — 5-Schritt-Wizard.
 * Steps: 1) Berater auswählen → 2) Projekt auswählen → 3) Leistung auswählen →
 *        4) Stunden, Datum, Tätigkeitsbeschreibung, Abrechnungsmonat/-jahr, Abrechenbar →
 *        5) Prüfen & anlegen.
 * Reads: berater, projekte, leistungskatalog. Writes: zeiterfassung (via useZeitBuchenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useZeitBuchenFlow } from '@/lib/journey/flows/ZeitBuchen';
import { tx } from '@/i18n';

export default function ZeitBuchenPage() {
  const [step, setStep] = useState(1);

  const flow = useZeitBuchenFlow({
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 3,
      stunden: 4,
      erfassungsmonat: 4,
      erfassungsjahr: 4,
      abrechenbar: 4,
      taetigkeit: 4,
    },
    items: {
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldText(r, 'email_beruflich'),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        status: fieldLookup(r, 'projektstatus') ?? undefined,
        subtitle: fieldText(r, 'kunde'),
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
      title={tx('Zeit buchen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Geleistete Stunden eines Beraters auf ein Projekt und eine Leistung erfassen.'),
        needs: [tx('Name des Beraters'), tx('Projektkürzel'), tx('Anzahl der Stunden')],
      }}
    >
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den Berater aus, dessen Stunden du erfassen möchtest.')}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          avatar="initials"
          searchPlaceholder={tx('Name suchen …')}
          create={{ fields: ['vorname', 'nachname', 'email_beruflich', 'status'] }}
        />
      </WizardStep>

      <WizardStep
        label={tx('Projekt')}
        description={tx('Auf welches Projekt werden die Stunden gebucht?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={false}
          emptyText={tx('Kein Projekt gefunden. Lege zunächst ein Projekt an.')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Leistung')}
        description={tx('Welche Leistung aus dem Katalog wurde erbracht?')}
      >
        <EntitySelectStep
          {...flow.picks.leistung.select}
          {...flow.pick('leistung')}
          searchPlaceholder={tx('Leistungsname suchen …')}
          create={{ fields: ['leistungsname', 'leistungstyp'] }}
        />
      </WizardStep>

      <WizardStep
        label={tx('Details')}
        description={tx('Trage Stunden, Tätigkeitsbeschreibung und Abrechnungszeitraum ein.')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="stunden" hint={tx('Anzahl der geleisteten Stunden, z. B. 7,5')} />
          <Bound form={flow.forms.zeiterfassung} name="taetigkeit" rows={3} placeholder={tx('Kurze Beschreibung der erbrachten Tätigkeit …')} />
          <Bound form={flow.forms.zeiterfassung} name="erfassungsmonat" />
          <Bound form={flow.forms.zeiterfassung} name="erfassungsjahr" hint={tx('z. B. 2026')} />
          <Bound form={flow.forms.zeiterfassung} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'datum', label: tx('Datum'), value: tx('Heute (wird automatisch gesetzt)') }]}
            whatHappensNext={tx('Der Eintrag wird sofort in der Zeiterfassung gespeichert und kann für die Rechnungsstellung verwendet werden.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Der Zeiteintrag ist gespeichert und kann jetzt einer Rechnung zugeordnet werden.')}
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
