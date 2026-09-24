/**
 * Stunden erfassen — 5-Schritt-Wizard.
 * Steps: 1) Berater wählen → 2) Projekt wählen → 3) Leistung wählen → 4) Details (Datum, Stunden, Tätigkeit, Abrechenbar) → 5) Prüfen & anlegen.
 * Reads: berater, projekte, leistungskatalog. Writes: zeiterfassung (createZeiterfassungEntry).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 * Derives: erfassungsmonat (Monatsschlüssel aus Datum), erfassungsjahr (Jahr als Zahl) — beide computed via `compute`.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, todayIso } from '@/lib/journey';
import { useStundenErfassenFlow } from '@/lib/journey/flows/StundenErfassen';
import { tx } from '@/i18n';

const MONTH_KEYS: Record<number, string> = {
  1: 'januar', 2: 'februar', 3: 'maerz', 4: 'april',
  5: 'mai', 6: 'juni', 7: 'juli', 8: 'august',
  9: 'september', 10: 'oktober', 11: 'november', 12: 'dezember',
};

export default function StundenErfassenPage() {
  const [step, setStep] = useState(1);

  const flow = useStundenErfassenFlow({
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 3,
      datum: 4,
      stunden: 4,
      taetigkeit: 4,
      abrechenbar: 4,
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
        subtitle: fieldLookup(r, 'projektart')?.label,
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      leistung: r => ({
        id: r.id,
        title: fieldText(r, 'leistungsname'),
        subtitle: fieldLookup(r, 'leistungstyp')?.label,
        stats: fieldLookup(r, 'einheit') ? [{ label: tx('Einheit'), value: fieldLookup(r, 'einheit')!.label }] : undefined,
      }),
    },
    initial: {
      datum: todayIso(),
    },
    compute: {
      erfassungsmonat: forms => {
        const datum = forms.zeiterfassung.get('datum') as string | undefined;
        if (!datum) return null;
        const month = new Date(datum + 'T00:00:00').getMonth() + 1;
        return MONTH_KEYS[month] ?? null;
      },
      erfassungsjahr: forms => {
        const datum = forms.zeiterfassung.get('datum') as string | undefined;
        if (!datum) return null;
        return new Date(datum + 'T00:00:00').getFullYear();
      },
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
        description: tx('Geleistete Stunden eines Beraters auf ein Projekt und eine Leistung buchen.'),
        needs: [tx('Name des Beraters'), tx('Projektzuordnung'), tx('Datum und Stundenanzahl')],
      }}
    >
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den Berater, dessen Stunden erfasst werden sollen.')}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          avatar="initials"
          searchPlaceholder={tx('Name suchen …')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Projekt')}
        description={tx('Auf welches Projekt sollen die Stunden gebucht werden?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung oder Projektart suchen …')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Leistung')}
        description={tx('Wähle die erbrachte Leistung aus dem Leistungskatalog.')}
      >
        <EntitySelectStep
          {...flow.picks.leistung.select}
          {...flow.pick('leistung')}
          searchPlaceholder={tx('Leistungsname suchen …')}
          create={false}
          emptyText={tx('Keine passende Leistung gefunden. Bitte den Leistungskatalog prüfen.')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Details')}
        description={tx('Datum, Stundenanzahl und Tätigkeitsbeschreibung eingeben.')}
        needs={['berater', 'projekt']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="datum" />
          <Bound
            form={flow.forms.zeiterfassung}
            name="stunden"
            hint={tx('Anzahl der geleisteten Stunden, z. B. 7,5')}
          />
          <Bound form={flow.forms.zeiterfassung} name="taetigkeit" rows={3} />
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
            whatHappensNext={tx('Abrechnungsmonat und -jahr werden automatisch aus dem Datum ermittelt.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Weitere Stunden erfassen'), onClick: flow.reset },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Die Stunden erscheinen sofort in der Zeiterfassung des Projekts.')}
        />
      )}
    </IntentWizardShell>
  );
}
