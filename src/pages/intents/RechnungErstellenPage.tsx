/**
 * Rechnung erstellen — 5-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Abrechnungsmonat und -jahr → 3) Berater und Zeiteinträge auswählen
 *        → 4) Fälligkeit, Mehrwertsteuer und Notizen → 5) Prüfen & als Entwurf anlegen.
 * Reads: projekte, berater, zeiterfassung. Writes: rechnungen (Entwurf; Kunde, Datum, Status setzt der Ablauf,
 * Nummer und Beträge das System).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, Field, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldDate, fieldNumber, todayIso } from '@/lib/journey';
import { useRechnungErstellenFlow } from '@/lib/journey/flows/RechnungErstellen';
import { tx } from '@/i18n';

function shortDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'dd.MM.yyyy');
  } catch {
    return iso;
  }
}

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);
  const flow = useRechnungErstellenFlow({
    steps: {
      projekt: 1,
      rechnungsmonat: 2,
      rechnungsjahr: 2,
      berater: 3,
      zeiterfassungseintraege: 3,
      faelligkeitsdatum: 4,
      mehrwertsteuer: 4,
      notizen: 4,
    },
    items: {
      projekt: p => ({ id: p.id, title: fieldText(p, 'projektkennung'), subtitle: undefined }),
      berater: b => ({ id: b.id, title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim() }),
      zeiterfassungseintraege: (z, ctx) => ({
        id: z.id,
        title: tx`${shortDate(fieldDate(z, 'datum'))} — ${fieldNumber(z, 'stunden') ?? '?'} Std.`,
        subtitle: [ctx.ref('berater'), fieldText(z, 'taetigkeit')].filter(Boolean).join(' · ') || undefined,
      }),
    },
    // Zahlungsziel 14 Tage: Rechnungsdatum ist heute, Fälligkeit = heute + 14 Tage (von Hand überschreibbar)
    initial: {
      rechnungsjahr: new Date().getFullYear(),
      mehrwertsteuer: 19,
      faelligkeitsdatum: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    },
  });
  const f = flow.forms.rechnungen;

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Aus abrechenbaren Zeiteinträgen eine Rechnung im Entwurf anlegen.'),
        needs: [tx('Projekt'), tx('Abrechnungsmonat'), tx('Berater und erfasste Stunden')],
      }}
    >
      <WizardStep label={tx('Projekt')} description={tx('Für welches Projekt willst du abrechnen?')}>
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          avatar="none"
        />
      </WizardStep>

      <WizardStep
        label={tx('Zeitraum')}
        description={tx('Für welchen Monat und welches Jahr ist die Rechnung?')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Bound form={f} name="rechnungsmonat" />
          <Bound form={f} name="rechnungsjahr" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Zeiteinträge')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Zeiteinträge')}
        description={tx('Wähle die Berater und die Zeiteinträge, die abgerechnet werden.')}
        needs={['projekt']}
      >
        <div className="space-y-6">
          <Field form={f} name="berater">
            <EntitySelectStep
              {...flow.picks.berater.select}
              {...flow.pickMany('berater')}
              avatar="initials"
              create={false}
            />
          </Field>
          <Field form={f} name="zeiterfassungseintraege">
            <EntitySelectStep
              {...flow.picks.zeiterfassungseintraege.select}
              {...flow.pickMany('zeiterfassungseintraege')}
              avatar="none"
              create={false}
              columns={2}
            />
          </Field>
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Rechnungsdaten')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Rechnungsdaten')}
        description={tx('Wann ist die Rechnung fällig und wie hoch ist die Mehrwertsteuer?')}
        needs={['zeiterfassungseintraege']}
      >
        <div className="space-y-4">
          <Bound form={f} name="faelligkeitsdatum" hint={tx('Zahlungsziel: 14 Tage ab Rechnungsdatum, von Hand änderbar')} />
          <Bound form={f} name="mehrwertsteuer" hint={tx('In Prozent, z. B. 19')} />
          <Bound form={f} name="notizen" rows={3} />
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
              { key: 'rechnungsstatus', label: tx('Status'), value: tx('Entwurf') },
              { key: 'rechnungsdatum', label: tx('Rechnungsdatum'), value: shortDate(todayIso()) },
            ]}
            whatHappensNext={tx('Rechnungsnummer, Netto- und Gesamtbetrag vergibt das System. Die Rechnung bleibt ein Entwurf.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die Rechnung liegt als Entwurf vor. Als Nächstes kannst du sie versenden.')}
          next={[
            { label: tx('Rechnung versenden'), href: '#/intents/rechnung-versenden' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
