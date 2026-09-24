/**
 * ZeitBuchen — 7-Schritt-Wizard zum Erfassen eines Zeiterfassungseintrags.
 * Steps: 1) Berater auswählen → 2) Projekt auswählen → 3) Leistung wählen →
 *         4) Datum & Stunden → 5) Tätigkeitsbeschreibung → 6) Abrechenbar → 7) Prüfen & anlegen.
 * Reads: berater, projekte, leistungskatalog.
 * Writes: zeiterfassung (creates one entry; erfassungsmonat + erfassungsjahr computed from datum).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, todayIso } from '@/lib/journey';
import { useZeitBuchenFlow } from '@/lib/journey/flows/ZeitBuchen';
import { tx } from '@/i18n';

/** Month lookup keys matching the erfassungsmonat options (januar … dezember). */
const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

export default function ZeitBuchenPage() {
  const [step, setStep] = useState(1);

  const flow = useZeitBuchenFlow({
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 3,
      datum: 4,
      stunden: 4,
      taetigkeit: 5,
      abrechenbar: 6,
    },
    items: {
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldLookup(r, 'status')?.label ?? undefined,
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
        subtitle: fieldLookup(r, 'leistungstyp')?.label ?? undefined,
        status: fieldLookup(r, 'einheit') ?? undefined,
      }),
    },
    initial: {
      datum: todayIso(),
    },
    compute: {
      erfassungsmonat: (forms) => {
        const datum = forms.zeiterfassung.get('datum') as string | null | undefined;
        if (!datum) return null;
        try {
          const d = parseISO(datum);
          return MONTH_KEYS[d.getMonth()] ?? null;
        } catch {
          return null;
        }
      },
      erfassungsjahr: (forms) => {
        const datum = forms.zeiterfassung.get('datum') as string | null | undefined;
        if (!datum) return null;
        try {
          const d = parseISO(datum);
          return d.getFullYear();
        } catch {
          return null;
        }
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
        description: tx('Einen Zeiterfassungseintrag für einen Berater auf einem Projekt anlegen.'),
        needs: [tx('Name des Beraters'), tx('Projektkennung'), tx('Datum und Stundenanzahl')],
      }}
    >
      {/* Step 1 — Berater */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Welcher Berater hat die Zeit erbracht?')}
      >
        <EntitySelectStep
          {...flow.picks.berater.select}
          {...flow.pick('berater')}
          avatar="initials"
          searchPlaceholder={tx('Vor- oder Nachname …')}
          onSelect={(id) => {
            flow.pick('berater').onSelect(id);
            setStep(2);
          }}
        />
      </WizardStep>

      {/* Step 2 — Projekt */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Auf welches Projekt werden die Stunden gebucht?')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung …')}
          onSelect={(id) => {
            flow.pick('projekt').onSelect(id);
            setStep(3);
          }}
        />
      </WizardStep>

      {/* Step 3 — Leistung */}
      <WizardStep
        label={tx('Leistung')}
        description={tx('Welche Leistungsart wurde erbracht?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.leistung.select}
          {...flow.pick('leistung')}
          searchPlaceholder={tx('Leistungsname …')}
          create={{ fields: ['leistungsname', 'leistungstyp', 'einheit'] }}
          onSelect={(id) => {
            flow.pick('leistung').onSelect(id);
            setStep(4);
          }}
        />
      </WizardStep>

      {/* Step 4 — Datum & Stunden */}
      <WizardStep
        label={tx('Datum & Stunden')}
        description={tx('An welchem Datum und wie viele Stunden wurden geleistet?')}
        needs={['leistung']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="datum" />
          <Bound form={flow.forms.zeiterfassung} name="stunden" hint={tx('z. B. 7,5 für sieben Stunden dreißig')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Beschreibung')}
          />
        </div>
      </WizardStep>

      {/* Step 5 — Tätigkeitsbeschreibung */}
      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Was wurde in dieser Zeit erledigt?')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="taetigkeit" rows={4} hint={tx('Kurze Zusammenfassung der erbrachten Tätigkeiten')} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Abrechenbar?')}
          />
        </div>
      </WizardStep>

      {/* Step 6 — Abrechenbar */}
      <WizardStep
        label={tx('Abrechenbar')}
        description={tx('Können diese Stunden dem Kunden in Rechnung gestellt werden?')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => flow.validateStep(6)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 7 — Prüfen & Bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Eintrag erscheint sofort in der Zeiterfassung. Abrechnungsmonat und -jahr werden automatisch aus dem Datum abgeleitet.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Du kannst weitere Stunden buchen oder direkt eine Rechnung erstellen.')}
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
