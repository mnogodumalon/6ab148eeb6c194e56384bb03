/**
 * Stunden erfassen — 6-Schritt-Wizard.
 * Steps: 1) Berater auswählen → 2) Projekt auswählen → 3) Erbrachte Leistung auswählen
 *        → 4) Datum, Stunden & Tätigkeitsbeschreibung eingeben → 5) Abrechenbar markieren
 *        → 6) Prüfen & anlegen.
 * Reads: berater, projekte, leistungskatalog.
 * Writes: zeiterfassung (useStundenErfassenFlow).
 * Computes: erfassungsmonat (Lookup-Schlüssel aus Datum), erfassungsjahr (Zahl aus Datum).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldDate, fieldNumber } from '@/lib/journey';
import { useStundenErfassenFlow } from '@/lib/journey/flows/StundenErfassen';
import { tx } from '@/i18n';
import { parseISO, getMonth, getYear } from 'date-fns';

const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

function monthKeyFromIso(dateIso: string | null | undefined): string | null {
  if (!dateIso) return null;
  try {
    const m = getMonth(parseISO(dateIso)); // 0-based
    return MONTH_KEYS[m] ?? null;
  } catch {
    return null;
  }
}

function yearFromIso(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  try {
    return getYear(parseISO(dateIso));
  } catch {
    return null;
  }
}

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
        subtitle: fieldLookup(r, 'projektart')?.label,
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
        const datum = forms.zeiterfassung.get('datum') as string | null | undefined;
        return monthKeyFromIso(datum);
      },
      erfassungsjahr: forms => {
        const datum = forms.zeiterfassung.get('datum') as string | null | undefined;
        return yearFromIso(datum);
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
        description: tx('Geleistete Stunden eines Beraters für ein Projekt und eine Leistung erfassen.'),
        needs: [tx('Name des Beraters'), tx('Projektkürzel'), tx('Erbrachte Leistung'), tx('Datum und Stundenanzahl')],
      }}
    >
      {/* Step 1: Berater auswählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Für welchen Berater werden die Stunden erfasst?')}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          searchPlaceholder={tx('Name suchen …')}
          avatar="initials"
        />
      </WizardStep>

      {/* Step 2: Projekt auswählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Auf welches Projekt entfallen die Stunden?')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
        />
      </WizardStep>

      {/* Step 3: Leistung auswählen */}
      <WizardStep
        label={tx('Leistung')}
        description={tx('Welche Leistung wurde erbracht?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.leistung.select}
          {...flow.pick('leistung')}
          searchPlaceholder={tx('Leistung suchen …')}
        />
      </WizardStep>

      {/* Step 4: Datum, Stunden, Tätigkeit */}
      <WizardStep
        label={tx('Details')}
        description={tx('Datum, Anzahl Stunden und Tätigkeitsbeschreibung eintragen.')}
        needs={['leistung']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="datum" />
          <Bound form={flow.forms.zeiterfassung} name="stunden" hint={tx('Dezimalzahl, z. B. 1,5 für eineinhalb Stunden')} />
          <Bound form={flow.forms.zeiterfassung} name="taetigkeit" rows={3} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Abrechenbar')}
          />
        </div>
      </WizardStep>

      {/* Step 5: Abrechenbar */}
      <WizardStep
        label={tx('Abrechenbar')}
        description={tx('Können die Stunden dem Kunden berechnet werden?')}
        needs={['datum']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 6: Prüfen & speichern */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Eintrag wird sofort in der Zeiterfassung gespeichert. Abrechnungsmonat und -jahr werden automatisch aus dem Datum berechnet.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die Stunden sind erfasst und können für eine Rechnung herangezogen werden.')}
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
