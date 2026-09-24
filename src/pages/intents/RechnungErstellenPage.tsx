/**
 * Rechnung erstellen — 8-Schritt-Wizard.
 * Steps: 1) Kunde wählen → 2) Projekt wählen → 3) Zeiterfassungseinträge wählen →
 *        4) Berater wählen → 5) Beträge eingeben → 6) Abrechnungszeitraum & Fälligkeit →
 *        7) Notizen → 8) Prüfen & anlegen.
 * Reads: kunden, projekte, zeiterfassung, berater.
 * Writes: rechnungen (useRechnungErstellenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, Field, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber, fieldDate, fieldLookup } from '@/lib/journey';
import { useRechnungErstellenFlow } from '@/lib/journey/flows/RechnungErstellen';
import { tx } from '@/i18n';

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  const flow = useRechnungErstellenFlow({
    steps: {
      kunde: 1,
      projekt: 2,
      zeiterfassungseintraege: 3,
      berater: 4,
      nettobetrag: 5,
      mehrwertsteuer: 5,
      gesamtbetrag: 5,
      faelligkeitsdatum: 6,
      rechnungsmonat: 6,
      rechnungsjahr: 6,
      notizen: 7,
    },
    items: {
      kunde: r => ({
        id: r.id,
        title: fieldText(r, 'kundenname'),
        subtitle: fieldText(r, 'email'),
      }),
      projekt: r => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        subtitle: fieldLookup(r, 'projektstatus')?.label ?? '',
        status: fieldLookup(r, 'projektstatus') ?? undefined,
      }),
      zeiterfassungseintraege: (r, ctx) => ({
        id: r.id,
        title: tx`${fieldDate(r, 'datum') ?? '—'} · ${fieldNumber(r, 'stunden') ?? '?'} Std.`,
        subtitle: ctx.ref('berater') ?? fieldText(r, 'taetigkeit'),
      }),
      berater: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldLookup(r, 'status')?.label ?? '',
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
  });

  const f = flow.forms.rechnungen;

  // Live computation for display purposes — reads form state in render (no hook needed)
  const netto = Number(f.get('nettobetrag') ?? 0);
  const mwstProzent = Number(f.get('mehrwertsteuer') ?? 0);
  const gesamtComputed = netto > 0 ? netto + (netto * mwstProzent / 100) : 0;

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Neue Rechnung auf Basis eines Projekts anlegen und Zeiterfassung verknüpfen.'),
        needs: [tx('Kundendaten'), tx('Projektnummer'), tx('Zeiterfassungseinträge')],
      }}
    >
      {/* Step 1 — Kunde */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird diese Rechnung erstellt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder E-Mail …')}
          avatar="initials"
          create={{ fields: ['kundenname', 'email', 'kundentyp'] }}
        />
        <StepNav
          hideBack
          onNext={() => flow.validateStep(1)}
          nextStepLabel={tx('Projekt')}
        />
      </WizardStep>

      {/* Step 2 — Projekt */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt soll abgerechnet werden?')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung oder Nummer …')}
          create={false}
          emptyText={tx('Kein Projekt gefunden. Lege zuerst ein Projekt über „Projekt anlegen" an.')}
        />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Zeiterfassung')}
        />
      </WizardStep>

      {/* Step 3 — Zeiterfassungseinträge (multi-pick) */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Welche Zeiterfassungseinträge sollen in dieser Rechnung enthalten sein?')}
        needs={['projekt']}
      >
        <Field form={f} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...flow.picks.zeiterfassungseintraege.select}
            {...f.records('zeiterfassungseintraege', flow.picks.zeiterfassungseintraege.labelOf)}
            avatar="none"
            emptyText={tx('Keine Zeiterfassungseinträge gefunden. Buche zuerst Stunden.')}
            create={false}
          />
        </Field>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => f.validate(['zeiterfassungseintraege'])}
          nextStepLabel={tx('Berater')}
        />
      </WizardStep>

      {/* Step 4 — Berater (multi-pick) */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Welche Berater waren an diesem Projekt beteiligt?')}
        needs={['projekt']}
      >
        <Field form={f} name="berater">
          <EntitySelectStep
            {...flow.picks.berater.select}
            {...f.records('berater', flow.picks.berater.labelOf)}
            avatar="initials"
            create={false}
            emptyText={tx('Keine Berater gefunden.')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => f.validate(['berater'])}
          nextStepLabel={tx('Beträge')}
        />
      </WizardStep>

      {/* Step 5 — Beträge */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Nettobetrag und Mehrwertsteuer eingeben — der Gesamtbetrag wird errechnet.')}
        needs={['berater']}
      >
        <div className="space-y-4">
          <Bound form={f} name="nettobetrag" hint={tx('In Euro, ohne Mehrwertsteuer')} />
          <Bound form={f} name="mehrwertsteuer" hint={tx('Prozentsatz, z. B. 19')} />
          <Bound
            form={f}
            name="gesamtbetrag"
            hint={
              gesamtComputed > 0
                ? tx`Errechnet: ${gesamtComputed.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                : tx('Netto + Mehrwertsteuer')
            }
          />
        </div>
        <StepNav
          onBack={() => setStep(4)}
          onNext={() => f.validate(['nettobetrag', 'mehrwertsteuer', 'gesamtbetrag'])}
          nextStepLabel={tx('Zeitraum')}
        />
      </WizardStep>

      {/* Step 6 — Abrechnungszeitraum & Fälligkeit */}
      <WizardStep
        label={tx('Zeitraum')}
        description={tx('Abrechnungsmonat, -jahr und Fälligkeitsdatum festlegen.')}
        needs={['nettobetrag']}
      >
        <div className="space-y-4">
          <Bound form={f} name="rechnungsmonat" allowClear />
          <Bound form={f} name="rechnungsjahr" hint={tx('z. B. 2026')} />
          <Bound form={f} name="faelligkeitsdatum" />
        </div>
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => f.validate(['faelligkeitsdatum'])}
          nextStepLabel={tx('Notizen')}
        />
      </WizardStep>

      {/* Step 7 — Notizen */}
      <WizardStep
        label={tx('Notizen')}
        description={tx('Optionale Hinweise oder interne Anmerkungen zur Rechnung.')}
      >
        <Bound form={f} name="notizen" rows={4} hint={tx('Z. B. Zahlungskonditionen, interne Projektnummer')} />
        <StepNav
          onBack={() => setStep(6)}
          onNext={() => f.validate(['notizen'])}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Step 8 — Zusammenfassung */}
      <WizardStep label={tx('Prüfen')}>
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
              {
                key: 'rechnungsdatum',
                label: tx('Rechnungsdatum'),
                value: tx('Wird automatisch auf heute gesetzt'),
              },
            ]}
            whatHappensNext={tx('Die Rechnung wird als Entwurf angelegt. Rechnungsnummer und Datum vergibt das System automatisch.')}
          />
        )}
      </WizardStep>

      {/* Success */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die Rechnung ist jetzt als Entwurf gespeichert und kann versendet werden.')}
          next={[
            {
              label: tx('Stunden buchen'),
              href: '#/intents/stunden-buchen',
            },
            {
              label: tx('Weiteres Angebot erstellen'),
              href: '#/intents/angebot-erstellen',
            },
            {
              label: tx('Zum Dashboard'),
              href: '#/',
            },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
