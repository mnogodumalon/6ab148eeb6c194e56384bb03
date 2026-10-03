/**
 * Stunden erfassen — 5-Schritt-Wizard.
 * Steps: 1) Berater wählen → 2) Projekt wählen → 3) Leistung wählen → 4) Datum, Stunden und Tätigkeit → 5) Prüfen & buchen.
 * Reads: berater, projekte, leistungskatalog. Writes: zeiterfassung (Abrechnungsmonat/-jahr aus dem Datum abgeleitet).
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
import { useZeitErfassenFlow } from '@/lib/journey/flows/ZeitErfassen';
import { tx } from '@/i18n';

const MONTH_KEYS = ['januar', 'februar', 'maerz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];

function parseDatum(value: unknown): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})-\d{2}/.exec(String(value ?? ''));
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

export default function ZeitErfassenPage() {
  const [step, setStep] = useState(1);
  const flow = useZeitErfassenFlow({
    steps: { berater: 1, projekt: 2, leistung: 3, datum: 4, stunden: 4, taetigkeit: 4, abrechenbar: 4 },
    items: {
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldLookup(r, 'status')?.label,
      }),
      projekt: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: ctx.ref('kunde'),
      }),
      leistung: r => ({
        id: r.id,
        title: fieldText(r, 'leistungsname'),
        subtitle: fieldLookup(r, 'leistungstyp')?.label,
      }),
    },
    compute: {
      erfassungsmonat: forms => {
        const d = parseDatum(forms.zeiterfassung.get('datum'));
        return d ? MONTH_KEYS[d.month - 1] : undefined;
      },
      erfassungsjahr: forms => parseDatum(forms.zeiterfassung.get('datum'))?.year,
    },
  });
  const f = flow.forms.zeiterfassung;

  return (
    <IntentWizardShell
      title={tx('Stunden erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Buche Stunden eines Beraters auf ein Projekt und eine Leistung.'),
        needs: [tx('Berater und Projekt'), tx('Leistung'), tx('Datum und Stunden')],
      }}
    >
      <WizardStep label={tx('Berater')} description={tx('Wer hat gearbeitet?')}>
        <EntitySelectStep {...flow.picks.berater.select} {...flow.pick('berater')} searchPlaceholder={tx('Name suchen …')} />
      </WizardStep>
      <WizardStep label={tx('Projekt')} description={tx('Auf welches Projekt werden die Stunden gebucht?')}>
        <EntitySelectStep {...flow.picks.projekt.select} {...flow.pick('projekt')} searchPlaceholder={tx('Projektkennung suchen …')} />
      </WizardStep>
      <WizardStep label={tx('Leistung')} description={tx('Welche Leistung wurde erbracht?')}>
        <EntitySelectStep {...flow.picks.leistung.select} {...flow.pick('leistung')} searchPlaceholder={tx('Leistung suchen …')} />
      </WizardStep>
      <WizardStep label={tx('Details')} description={tx('Wann, wie lange und was wurde getan?')}>
        <div className="space-y-4">
          <Bound form={f} name="datum" />
          <Bound form={f} name="stunden" hint={tx('z. B. 7,5')} />
          <Bound form={f} name="taetigkeit" rows={3} />
          <Bound form={f} name="abrechenbar" />
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
            whatHappensNext={tx('Abrechnungsmonat und -jahr werden aus dem Datum gesetzt.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Rechnung aus Zeiteinträgen erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
