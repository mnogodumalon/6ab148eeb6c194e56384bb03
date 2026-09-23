/**
 * Stunden buchen — 8-Schritt-Wizard.
 * Steps: 1) Berater:in wählen → 2) Projekt wählen → 3) Leistung wählen (optional)
 *        → 4) Datum eingeben → 5) Stunden eingeben → 6) Tätigkeitsbeschreibung (optional)
 *        → 7) Abrechenbar markieren → 8) Prüfen & anlegen.
 * Reads: berater, projekte, leistungskatalog. Writes: zeiterfassung (createZeiterfassungEntry).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 * Computed: erfassungsmonat (JS month index → lookup key), erfassungsjahr (getFullYear).
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldDate, fieldNumber } from '@/lib/journey';
import { useStundenBuchenFlow } from '@/lib/journey/flows/StundenBuchen';
import { tx } from '@/i18n';

const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

export default function StundenBuchenPage() {
  const [step, setStep] = useState(1);

  const flow = useStundenBuchenFlow({
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 3,
      datum: 4,
      stunden: 5,
      taetigkeit: 6,
      abrechenbar: 7,
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
      erfassungsmonat: (forms) => {
        const datum = forms.zeiterfassung.get('datum') as string | null | undefined;
        if (!datum) return null;
        const d = new Date(datum);
        if (isNaN(d.getTime())) return null;
        return MONTH_KEYS[d.getMonth()] ?? null;
      },
      erfassungsjahr: (forms) => {
        const datum = forms.zeiterfassung.get('datum') as string | null | undefined;
        if (!datum) return null;
        const d = new Date(datum);
        if (isNaN(d.getTime())) return null;
        return d.getFullYear();
      },
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
        description: tx('Geleistete Stunden auf ein Projekt und eine Leistung buchen.'),
        needs: [tx('Name der Beraterin / des Beraters'), tx('Projektkürzel'), tx('Datum und Anzahl Stunden')],
      }}
    >
      {/* Step 1 — Berater:in wählen */}
      <WizardStep
        label={tx('Berater:in')}
        description={tx('Für wen werden die Stunden gebucht?')}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          avatar="initials"
          searchPlaceholder={tx('Name suchen …')}
          onSelect={id => {
            flow.pick('berater').onSelect(id);
            setStep(2);
          }}
        />
      </WizardStep>

      {/* Step 2 — Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Auf welches Projekt werden die Stunden gebucht?')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          onSelect={id => {
            flow.pick('projekt').onSelect(id);
            setStep(3);
          }}
        />
      </WizardStep>

      {/* Step 3 — Leistung wählen (optional) */}
      <WizardStep
        label={tx('Leistung')}
        description={tx('Welche Leistung aus dem Katalog wurde erbracht? (optional)')}
        needs={['berater', 'projekt']}
      >
        <EntitySelectStep
          {...flow.picks.leistung.select}
          {...flow.pick('leistung')}
          searchPlaceholder={tx('Leistungsname suchen …')}
          onSelect={id => {
            flow.pick('leistung').onSelect(id);
            setStep(4);
          }}
          emptyText={tx('Noch kein Eintrag im Leistungskatalog vorhanden.')}
        />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => { setStep(4); }}
          nextStepLabel={tx('Datum')}
          nextLabel={tx('Überspringen')}
        />
      </WizardStep>

      {/* Step 4 — Datum eingeben */}
      <WizardStep
        label={tx('Datum')}
        description={tx('An welchem Tag wurde die Leistung erbracht?')}
        needs={['berater', 'projekt']}
      >
        <Bound form={flow.forms.zeiterfassung} name="datum" />
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Stunden')}
        />
      </WizardStep>

      {/* Step 5 — Stunden eingeben */}
      <WizardStep
        label={tx('Stunden')}
        description={tx('Wie viele Stunden wurden geleistet?')}
        needs={['berater', 'projekt', 'datum']}
      >
        <Bound
          form={flow.forms.zeiterfassung}
          name="stunden"
          hint={tx('Dezimalzahl, z. B. 7.5 für 7 Stunden 30 Minuten')}
        />
        <StepNav
          onBack={() => setStep(4)}
          onNext={() => flow.validateStep(5)}
          nextStepLabel={tx('Beschreibung')}
        />
      </WizardStep>

      {/* Step 6 — Tätigkeitsbeschreibung (optional) */}
      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Was wurde konkret getan? (optional)')}
        needs={['berater', 'projekt', 'datum', 'stunden']}
      >
        <Bound
          form={flow.forms.zeiterfassung}
          name="taetigkeit"
          rows={4}
          hint={tx('Kurze Beschreibung der erbrachten Tätigkeiten')}
        />
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => { setStep(7); }}
          nextStepLabel={tx('Abrechenbar')}
          nextLabel={tx('Weiter')}
        />
      </WizardStep>

      {/* Step 7 — Abrechenbar markieren */}
      <WizardStep
        label={tx('Abrechenbar')}
        description={tx('Können diese Stunden dem Kunden in Rechnung gestellt werden?')}
        needs={['berater', 'projekt', 'datum', 'stunden']}
      >
        <Bound form={flow.forms.zeiterfassung} name="abrechenbar" />
        <StepNav
          onBack={() => setStep(6)}
          onNext={() => flow.validateStep(7)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Step 8 — Prüfen & anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Eintrag wird sofort in der Zeiterfassung sichtbar. Abrechnungsmonat und -jahr werden aus dem Datum abgeleitet.')}
          />
        )}
      </WizardStep>

      {/* Success */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die gebuchten Stunden fließen in die Projektabrechnung ein.')}
          next={[
            { label: tx('Weitere Stunden buchen'), onClick: flow.reset },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
