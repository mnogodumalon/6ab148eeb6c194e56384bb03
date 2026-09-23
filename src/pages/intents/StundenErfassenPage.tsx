/**
 * Stunden erfassen — 5-Schritt-Wizard.
 * Steps: 1) Berater:in wählen → 2) Projekt wählen → 3) Leistung wählen → 4) Datum & Stunden eingeben → 5) Prüfen & anlegen.
 * Reads: berater (nur aktive), projekte (nur in Bearbeitung), leistungskatalog (alle).
 * Writes: zeiterfassung (createZeiterfassungEntry) — inklusive berechneter Felder erfassungsmonat und erfassungsjahr.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldDate, todayIso } from '@/lib/journey';
import { useStundenErfassenFlow } from '@/lib/journey/flows/StundenErfassen';
import { tx } from '@/i18n';
import { format, parseISO } from 'date-fns';

const MONAT_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

function monatKeyFromDatum(datum: unknown): string | null {
  if (typeof datum !== 'string' || !datum) return null;
  try {
    const d = parseISO(datum);
    const monatIndex = d.getMonth(); // 0-based
    return MONAT_KEYS[monatIndex] ?? null;
  } catch {
    return null;
  }
}

function jahrFromDatum(datum: unknown): number | null {
  if (typeof datum !== 'string' || !datum) return null;
  try {
    const d = parseISO(datum);
    return d.getFullYear();
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
        subtitle: fieldLookup(r, 'projektart')?.label,
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      leistung: r => ({
        id: r.id,
        title: fieldText(r, 'leistungsname'),
        subtitle: fieldLookup(r, 'leistungstyp')?.label,
      }),
    },
    initial: {
      datum: todayIso(),
    },
    compute: {
      erfassungsmonat: forms => monatKeyFromDatum(forms.zeiterfassung.get('datum')),
      erfassungsjahr: forms => jahrFromDatum(forms.zeiterfassung.get('datum')),
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
        description: tx('Geleistete Stunden einer Berater:in für ein Projekt und eine Leistung erfassen.'),
        needs: [tx('Name der Berater:in'), tx('Projektkürzel'), tx('Datum und Stundenzahl')],
      }}
    >
      {/* Schritt 1: Berater:in wählen */}
      <WizardStep
        label={tx('Berater:in')}
        description={tx('Für wen werden die Stunden erfasst? Nur aktive Berater:innen stehen zur Auswahl.')}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          avatar="initials"
          searchPlaceholder={tx('Name suchen …')}
          emptyText={tx('Keine aktiven Berater:innen gefunden.')}
          create={false}
        />
      </WizardStep>

      {/* Schritt 2: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Für welches Projekt werden die Stunden gebucht? Nur Projekte in Bearbeitung werden angezeigt.')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkürzel suchen …')}
          emptyText={tx('Keine Projekte in Bearbeitung gefunden.')}
          create={false}
        />
      </WizardStep>

      {/* Schritt 3: Leistung wählen */}
      <WizardStep
        label={tx('Leistung')}
        description={tx('Welche Leistung aus dem Katalog wurde erbracht?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.leistung.select}
          {...flow.pick('leistung')}
          searchPlaceholder={tx('Leistungsname suchen …')}
          create={false}
        />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Datum & Stunden')}
        />
      </WizardStep>

      {/* Schritt 4: Datum und Stundenzahl */}
      <WizardStep
        label={tx('Datum & Stunden')}
        description={tx('Datum und Anzahl der geleisteten Stunden eingeben.')}
        needs={['leistung']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="datum" />
          <Bound
            form={flow.forms.zeiterfassung}
            name="stunden"
            hint={tx('Dezimalzahl möglich, z. B. 1,5 für eineinhalb Stunden')}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Tätigkeit')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Tätigkeit und Abrechenbarkeit */}
      <WizardStep
        label={tx('Tätigkeit')}
        description={tx('Tätigkeit beschreiben und festlegen, ob die Stunden abrechenbar sind.')}
        needs={['datum', 'stunden']}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.zeiterfassung}
            name="taetigkeit"
            rows={4}
            hint={tx('Optional — kurze Beschreibung der geleisteten Arbeit')}
          />
          <Bound form={flow.forms.zeiterfassung} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Prüfen & Bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Erfassungsmonat und -jahr werden automatisch aus dem Datum berechnet und gespeichert.')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die Stunden sind jetzt dem Projekt und der Berater:in zugeordnet.')}
          next={[
            { label: tx('Weitere Stunden erfassen'), onClick: () => { flow.reset(); setStep(1); } },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
