/**
 * Zeit erfassen — 5-Schritt-Wizard.
 * Steps: 1) Berater auswählen → 2) Projekt auswählen → 3) Leistung auswählen →
 *        4) Datum und Stunden eingeben → 5) Tätigkeit beschreiben → 6) Prüfen & anlegen.
 * Reads: berater, projekte, leistungskatalog. Writes: zeiterfassung (via useZeitErfassenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldDate } from '@/lib/journey';
import { useZeitErfassenFlow } from '@/lib/journey/flows/ZeitErfassen';
import { tx } from '@/i18n';
import { parseISO } from 'date-fns';

// Month key lookup: JS month index (0-based) → erfassungsmonat key
const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

function monthKeyFromDateIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = parseISO(iso);
    return MONTH_KEYS[d.getMonth()] ?? null;
  } catch {
    return null;
  }
}

function yearFromDateIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    const d = parseISO(iso);
    return d.getFullYear();
  } catch {
    return null;
  }
}

export default function ZeitErfassenPage() {
  const [step, setStep] = useState(1);

  const flow = useZeitErfassenFlow({
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 3,
      datum: 4,
      stunden: 4,
      taetigkeit: 5,
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
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      leistung: r => ({
        id: r.id,
        title: fieldText(r, 'leistungsname'),
        subtitle: fieldLookup(r, 'leistungstyp')?.label,
      }),
    },
    compute: {
      erfassungsmonat: forms => {
        const iso = forms.zeiterfassung.get('datum') as string | null | undefined;
        return monthKeyFromDateIso(iso);
      },
      erfassungsjahr: forms => {
        const iso = forms.zeiterfassung.get('datum') as string | null | undefined;
        return yearFromDateIso(iso);
      },
    },
  });

  return (
    <IntentWizardShell
      title={tx('Zeit erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Arbeitsstunden eines Beraters auf ein Projekt und eine Leistung buchen.'),
        needs: [tx('Name des Beraters'), tx('Projektkennung'), tx('Datum und Stundenanzahl')],
      }}
    >
      <WizardStep
        label={tx('Berater')}
        description={tx('Wessen Stunden werden erfasst?')}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          avatar="initials"
          searchPlaceholder={tx('Name suchen …')}
          create={false}
          emptyText={tx('Kein aktiver Berater gefunden.')}
        />
        <StepNav
          hideBack
          onNext={() => flow.validateStep(1)}
          nextStepLabel={tx('Projekt')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Projekt')}
        description={tx('Auf welches Projekt werden die Stunden gebucht?')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={false}
          emptyText={tx('Kein Projekt gefunden.')}
        />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Leistung')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Leistung')}
        description={tx('Welche Leistung aus dem Katalog wurde erbracht?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.leistung.select}
          {...flow.pick('leistung')}
          searchPlaceholder={tx('Leistung suchen …')}
          create={false}
          emptyText={tx('Kein Eintrag im Leistungskatalog gefunden.')}
        />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Datum & Stunden')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Datum & Stunden')}
        description={tx('An welchem Tag und wie viele Stunden wurden gearbeitet?')}
        needs={['leistung']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="datum" />
          <Bound form={flow.forms.zeiterfassung} name="stunden" hint={tx('z. B. 4 oder 7,5')} />
        </div>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Tätigkeit')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Tätigkeit')}
        description={tx('Was wurde getan? Ist die Leistung abrechenbar?')}
        needs={['datum']}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.zeiterfassung}
            name="taetigkeit"
            rows={4}
            placeholder={tx('Kurze Beschreibung der ausgeführten Tätigkeit …')}
          />
          <Bound form={flow.forms.zeiterfassung} name="abrechenbar" />
        </div>
        <StepNav
          onBack={() => setStep(4)}
          onNext={() => flow.validateStep(5)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Monat und Jahr werden automatisch aus dem eingegebenen Datum abgeleitet.')}
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
            { label: tx('Rechnung anlegen'), href: '#/intents/rechnung-anlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Die erfassten Stunden können für die Rechnungsstellung genutzt werden.')}
        />
      )}
    </IntentWizardShell>
  );
}
