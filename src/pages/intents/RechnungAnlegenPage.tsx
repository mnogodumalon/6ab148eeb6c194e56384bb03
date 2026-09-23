/**
 * Rechnung anlegen — 7-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Kunden bestätigen → 3) Datumsangaben →
 *        4) Beträge → 5) Zeiterfassungseinträge → 6) Berater → 7) Notizen & Prüfen.
 * Reads: projekte, kunden, berater, zeiterfassung.
 * Writes: rechnungen (useRechnungAnlegenFlow).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, Field,
 *           ChoiceGroup, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldDate, fieldNumber, todayIso } from '@/lib/journey';
import { useRechnungAnlegenFlow } from '@/lib/journey/flows/RechnungAnlegen';
import { tx } from '@/i18n';
import { format, parseISO } from 'date-fns';

// Monatsnamen-Map von ISO-Monatsnummer zu Lookup-Key
const MONAT_KEYS: Record<string, string> = {
  '01': 'januar', '02': 'februar', '03': 'maerz', '04': 'april',
  '05': 'mai', '06': 'juni', '07': 'juli', '08': 'august',
  '09': 'september', '10': 'oktober', '11': 'november', '12': 'dezember',
};

function monthKeyFromDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return MONAT_KEYS[format(parseISO(iso), 'MM')] ?? null;
  } catch {
    return null;
  }
}

function yearFromDate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    return parseInt(format(parseISO(iso), 'yyyy'), 10);
  } catch {
    return null;
  }
}

export default function RechnungAnlegenPage() {
  const [step, setStep] = useState(1);

  const flow = useRechnungAnlegenFlow({
    steps: {
      projekt: 1,
      kunde: 2,
      rechnungsdatum: 3,
      faelligkeitsdatum: 3,
      nettobetrag: 4,
      mehrwertsteuer: 4,
      zeiterfassungseintraege: 5,
      berater: 6,
      notizen: 7,
    },
    items: {
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldLookup(r, 'projektstatus')?.label,
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      kunde: r => ({
        id: r.id,
        title: fieldText(r, 'kundenname'),
        subtitle: fieldText(r, 'email'),
      }),
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldLookup(r, 'status')?.label,
        status: fieldLookup(r, 'status') ?? undefined,
      }),
      zeiterfassungseintraege: (r, ctx) => ({
        id: r.id,
        title: tx`${fieldDate(r, 'datum') ?? '—'} — ${String(fieldNumber(r, 'stunden') ?? '?')} Std.`,
        subtitle: ctx.ref('berater'),
        stats: fieldNumber(r, 'stunden') !== null
          ? [{ label: tx('Stunden'), value: fieldNumber(r, 'stunden')! }]
          : undefined,
      }),
    },
    initial: { rechnungsdatum: todayIso() },
    compute: {
      rechnungsmonat: forms => monthKeyFromDate(forms.rechnungen.get('rechnungsdatum') as string),
      rechnungsjahr: forms => yearFromDate(forms.rechnungen.get('rechnungsdatum') as string),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Rechnung anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine neue Rechnung zu einem Projekt anlegen und Zeiterfassungseinträge verknüpfen.'),
        needs: [tx('Projektkennung'), tx('Nettobetrag und Mehrwertsteuersatz'), tx('Rechnungsdatum')],
        estimatedMinutes: 5,
      }}
    >
      {/* Schritt 1: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Für welches Projekt wird die Rechnung erstellt?')}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          avatar="none"
          onSelect={id => {
            flow.pick('projekt').onSelect(id);
            // Kunde aus dem Projekt vorbelegen, wenn ein Kunde verknüpft ist
            const projektRecord = flow.picks.projekt.recordOf(id);
            if (projektRecord) {
              const kundeId = (projektRecord.fields.kunde as { id?: string } | null)?.id
                ?? String(projektRecord.fields.kunde ?? '').split('/').pop();
              if (kundeId && kundeId.length === 24) {
                // Nur vorbelegen — der Benutzer bestätigt auf Schritt 2
                flow.forms.rechnungen.set('kunde', kundeId, flow.picks.kunde.labelOf(kundeId) ?? '');
              }
            }
            setStep(2);
          }}
        />
      </WizardStep>

      {/* Schritt 2: Kunden bestätigen / wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird die Rechnung ausgestellt? (Wird automatisch aus dem Projekt vorbelegt.)')}
        needs={['projekt']}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder E-Mail …')}
          avatar="none"
          onSelect={id => {
            flow.pick('kunde').onSelect(id);
            setStep(3);
          }}
        />
      </WizardStep>

      {/* Schritt 3: Datumsangaben */}
      <WizardStep
        label={tx('Datumsangaben')}
        description={tx('Rechnungsdatum und Fälligkeitsdatum eingeben.')}
        needs={['projekt', 'kunde']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="rechnungsdatum" />
          <Bound
            form={flow.forms.rechnungen}
            name="faelligkeitsdatum"
            hint={tx('Optional — z. B. 30 Tage nach Rechnungsdatum')}
          />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Beträge')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Nettobetrag und Mehrwertsteuer */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Nettobetrag und Mehrwertsteuersatz angeben.')}
        needs={['rechnungsdatum']}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.rechnungen}
            name="nettobetrag"
            hint={tx('In Euro, z. B. 2500')}
          />
          <Bound
            form={flow.forms.rechnungen}
            name="mehrwertsteuer"
            hint={tx('In Prozent, z. B. 19')}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Zeiterfassungseinträge')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Zeiterfassungseinträge verknüpfen */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Welche Zeiterfassungseinträge gehören zu dieser Rechnung?')}
        needs={['nettobetrag', 'mehrwertsteuer']}
      >
        <div className="space-y-4">
          <Field form={flow.forms.rechnungen} name="zeiterfassungseintraege">
            <EntitySelectStep
              {...flow.picks.zeiterfassungseintraege.select}
              {...flow.pickMany('zeiterfassungseintraege')}
              avatar="none"
              searchPlaceholder={tx('Datum oder Berater suchen …')}
              emptyText={tx('Noch keine Zeiterfassungseinträge vorhanden. Erfasse zuerst Zeit im Ablauf „Zeit erfassen".')}
              create={false}
            />
          </Field>
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => { setStep(6); }}
            nextStepLabel={tx('Berater')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Beteiligte Berater auswählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Welche Berater waren an diesem Projekt beteiligt?')}
      >
        <div className="space-y-4">
          <Field form={flow.forms.rechnungen} name="berater">
            <EntitySelectStep
              {...flow.picks.berater.select}
              {...flow.pickMany('berater')}
              avatar="initials"
              searchPlaceholder={tx('Vor- oder Nachname suchen …')}
            />
          </Field>
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => flow.validateStep(6)}
            nextStepLabel={tx('Notizen & Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 7: Notizen & Zusammenfassung */}
      <WizardStep
        label={tx('Prüfen')}
        description={tx('Optionale Notizen ergänzen und alles prüfen.')}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.rechnungen}
            name="notizen"
            rows={3}
            hint={tx('Interne Hinweise zur Rechnung (optional)')}
          />
        </div>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              {
                key: 'rechnungsstatus',
                label: tx('Rechnungsstatus'),
                value: tx('Entwurf'),
              },
            ]}
            whatHappensNext={tx('Rechnungsnummer und Gesamtbetrag werden automatisch vom System vergeben.')}
            confirmLabel={tx('Rechnung anlegen')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Rechnungsnummer und Gesamtbetrag werden durch das System berechnet und eingetragen.')}
          next={[
            { label: tx('Weitere Rechnung anlegen') },
            { label: tx('Zeit erfassen'), href: '#/intents/zeit-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
