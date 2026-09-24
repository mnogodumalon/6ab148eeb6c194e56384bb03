/**
 * Zeit buchen — 8-Schritt-Wizard.
 * Steps: 1) Berater auswählen → 2) Projekt auswählen → 3) Leistung auswählen →
 *        4) Datum, Stunden, Tätigkeitsbeschreibung, Abrechenbar → 5) Prüfen & anlegen.
 * Reads: berater, projekte, leistungskatalog. Writes: zeiterfassung (createZeiterfassungEntry).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 * Derived values: erfassungsmonat (month key from datum), erfassungsjahr (year from datum).
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldDate, todayIso } from '@/lib/journey';
import { useZeitBuchenFlow } from '@/lib/journey/flows/ZeitBuchen';
import { tx } from '@/i18n';
import { parseISO, getMonth, getYear } from 'date-fns';

const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

function monthKeyFromDatum(datum: unknown): string | null {
  if (!datum || typeof datum !== 'string') return null;
  try {
    const idx = getMonth(parseISO(datum));
    return MONTH_KEYS[idx] ?? null;
  } catch {
    return null;
  }
}

function yearFromDatum(datum: unknown): number | null {
  if (!datum || typeof datum !== 'string') return null;
  try {
    return getYear(parseISO(datum));
  } catch {
    return null;
  }
}

export default function ZeitBuchenPage() {
  const [step, setStep] = useState(1);

  const flow = useZeitBuchenFlow({
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
        subtitle: fieldLookup(r, 'status')?.label,
      }),
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldLookup(r, 'projektstatus')?.label,
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
      erfassungsmonat: forms => monthKeyFromDatum(forms.zeiterfassung.get('datum')),
      erfassungsjahr: forms => yearFromDatum(forms.zeiterfassung.get('datum')),
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
        needs: [tx('Name des Beraters'), tx('Projektkennung'), tx('Leistung aus dem Katalog')],
      }}
    >
      <WizardStep
        label={tx('Berater')}
        description={tx('Welcher Berater hat die Stunden geleistet?')}
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

      <WizardStep
        label={tx('Projekt')}
        description={tx('Auf welches Projekt werden die Stunden gebucht?')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung oder Status …')}
          onSelect={id => {
            flow.pick('projekt').onSelect(id);
            setStep(3);
          }}
        />
      </WizardStep>

      <WizardStep
        label={tx('Leistung')}
        description={tx('Welche Leistung wurde erbracht?')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.leistung.select}
          {...flow.pick('leistung')}
          searchPlaceholder={tx('Leistungsname suchen …')}
          onSelect={id => {
            flow.pick('leistung').onSelect(id);
            setStep(4);
          }}
        />
      </WizardStep>

      <WizardStep
        label={tx('Details')}
        description={tx('Datum, Stunden und Tätigkeitsbeschreibung eingeben.')}
        needs={['leistung']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.zeiterfassung} name="datum" />
          <Bound form={flow.forms.zeiterfassung} name="stunden" hint={tx('In Stunden, z. B. 7.5')} />
          <Bound form={flow.forms.zeiterfassung} name="taetigkeit" rows={4} hint={tx('Kurze Beschreibung der durchgeführten Tätigkeiten')} />
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
            items={[
              {
                key: 'erfassungsmonat',
                label: tx('Abrechnungsmonat'),
                value: (() => {
                  const key = monthKeyFromDatum(flow.forms.zeiterfassung.get('datum'));
                  const datum = flow.forms.zeiterfassung.get('datum');
                  if (!datum || !key) return tx('—');
                  const d = parseISO(datum as string);
                  return `${key.charAt(0).toUpperCase()}${key.slice(1)} ${getYear(d)}`;
                })(),
              },
            ]}
            whatHappensNext={tx('Die Zeiterfassung wird sofort gespeichert und kann in der Rechnungsstellung berücksichtigt werden.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die Stunden sind erfasst. Du kannst weitere Stunden buchen oder eine Rechnung für dieses Projekt erstellen.')}
          next={[
            { label: tx('Weitere Stunden buchen'), onClick: () => { flow.reset(); setStep(1); } },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
