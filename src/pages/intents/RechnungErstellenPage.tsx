/**
 * Rechnung erstellen — 9-Schritt-Wizard.
 * Steps: 1) Kunde wählen → 2) Projekt wählen → 3) Berater:innen wählen →
 *        4) Zeiterfassungseinträge wählen → 5) Rechnungs- & Fälligkeitsdatum →
 *        6) Abrechnungsmonat & -jahr → 7) Nettobetrag & Mehrwertsteuer →
 *        8) Notizen → 9) Prüfen & anlegen (SummaryStep).
 * Reads: kunden, projekte, berater, zeiterfassung.
 * Writes: rechnungen (rechnungsstatus='entwurf' automatisch).
 * Composes: IntentWizardShell, EntitySelectStep, Field, Bound, StepNav,
 *           SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Field } from '@/components/blocks/Field';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useRechnungErstellenFlow } from '@/lib/journey/flows/RechnungErstellen';
import { fieldText, fieldNumber, fieldDate, todayIso } from '@/lib/journey';
import { tx } from '@/i18n';

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  const flow = useRechnungErstellenFlow({
    steps: {
      kunde: 1,
      projekt: 2,
      berater: 3,
      zeiterfassungseintraege: 4,
      rechnungsdatum: 5,
      faelligkeitsdatum: 5,
      rechnungsmonat: 6,
      rechnungsjahr: 6,
      nettobetrag: 7,
      mehrwertsteuer: 7,
      notizen: 8,
    },
    items: {
      kunde: (k) => ({
        id: k.id,
        title: fieldText(k, 'kundenname'),
        subtitle: fieldText(k, 'email'),
      }),
      projekt: (p) => ({
        id: p.id,
        title: fieldText(p, 'projektkennung'),
        status: (() => {
          const raw = p.fields['projektstatus'];
          if (raw && typeof raw === 'object' && 'key' in raw && 'label' in raw) {
            return raw as { key: string; label: string };
          }
          return undefined;
        })(),
      }),
      berater: (b) => ({
        id: b.id,
        title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
        subtitle: fieldNumber(b, 'stundensatz') != null
          ? tx`${fieldNumber(b, 'stundensatz')} €/h`
          : undefined,
      }),
      zeiterfassungseintraege: (z, ctx) => ({
        id: z.id,
        title: fieldDate(z, 'datum')
          ? tx`${fieldDate(z, 'datum') ?? ''} — ${String(fieldNumber(z, 'stunden') ?? '?')} Std.`
          : tx`${String(fieldNumber(z, 'stunden') ?? '?')} Std.`,
        subtitle: ctx.ref('berater') ?? ctx.ref('projekt'),
      }),
    },
    initial: {
      rechnungsdatum: todayIso(),
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
        description: tx('Erstelle eine Rechnung auf Basis von Zeiterfassungseinträgen für einen Kunden und ein Projekt.'),
        needs: [tx('Kundendaten'), tx('Projektzuordnung'), tx('Zeiterfassungseinträge'), tx('Nettobetrag')],
      }}
    >
      {/* Schritt 1: Kunde wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird die Rechnung erstellt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder E-Mail des Kunden …')}
          avatar="none"
          create={{ fields: ['kundenname', 'email', 'kundentyp'] }}
        />
        <StepNav
          hideBack
          onNext={() => flow.validateStep(1)}
          nextStepLabel={tx('Projekt')}
        />
      </WizardStep>

      {/* Schritt 2: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welchem Projekt soll die Rechnung zugeordnet werden?')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung suchen …')}
          avatar="none"
          create={false}
          emptyText={tx('Noch kein Projekt vorhanden. Bitte zuerst ein Projekt anlegen.')}
        />
        <StepNav
          onBack={() => setStep(1)}
          onNext={() => flow.validateStep(2)}
          nextStepLabel={tx('Berater:innen')}
        />
      </WizardStep>

      {/* Schritt 3: Berater:innen wählen (multipleapplookup) */}
      <WizardStep
        label={tx('Berater:innen')}
        description={tx('Welche Berater:innen waren an diesem Auftrag beteiligt?')}
        needs={['projekt']}
      >
        <Field form={f} name="berater">
          <EntitySelectStep
            {...flow.picks.berater.select}
            {...flow.pickMany('berater')}
            avatar="initials"
            searchPlaceholder={tx('Name suchen …')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Zeiterfassung')}
        />
      </WizardStep>

      {/* Schritt 4: Zeiterfassungseinträge wählen (multipleapplookup) */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Welche Zeiterfassungseinträge sollen abgerechnet werden?')}
        needs={['berater']}
      >
        <Field form={f} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...flow.picks.zeiterfassungseintraege.select}
            {...flow.pickMany('zeiterfassungseintraege')}
            avatar="none"
            searchPlaceholder={tx('Datum oder Tätigkeit suchen …')}
            emptyText={tx('Keine Zeiterfassungseinträge gefunden. Bitte zuerst Stunden buchen.')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Datum')}
        />
      </WizardStep>

      {/* Schritt 5: Rechnungs- und Fälligkeitsdatum */}
      <WizardStep
        label={tx('Datum')}
        description={tx('Rechnungsdatum und Fälligkeitsdatum festlegen.')}
        needs={['zeiterfassungseintraege']}
      >
        <div className="space-y-4">
          <Bound form={f} name="rechnungsdatum" />
          <Bound form={f} name="faelligkeitsdatum" />
        </div>
        <StepNav
          onBack={() => setStep(4)}
          onNext={() => flow.validateStep(5)}
          nextStepLabel={tx('Abrechnungszeitraum')}
        />
      </WizardStep>

      {/* Schritt 6: Abrechnungsmonat und -jahr */}
      <WizardStep
        label={tx('Abrechnungszeitraum')}
        description={tx('Für welchen Monat und welches Jahr wird abgerechnet?')}
      >
        <div className="space-y-4">
          <Bound form={f} name="rechnungsmonat" />
          <Bound form={f} name="rechnungsjahr" />
        </div>
        <StepNav
          onBack={() => setStep(5)}
          onNext={() => flow.validateStep(6)}
          nextStepLabel={tx('Beträge')}
        />
      </WizardStep>

      {/* Schritt 7: Nettobetrag und Mehrwertsteuer */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Nettobetrag und Mehrwertsteuer eingeben — der Gesamtbetrag wird automatisch berechnet.')}
      >
        <div className="space-y-4">
          <Bound form={f} name="nettobetrag" hint={tx('In Euro, z. B. 2500')} />
          <Bound form={f} name="mehrwertsteuer" hint={tx('In Prozent, z. B. 19')} />
        </div>
        <StepNav
          onBack={() => setStep(6)}
          onNext={() => flow.validateStep(7)}
          nextStepLabel={tx('Notizen')}
        />
      </WizardStep>

      {/* Schritt 8: Notizen */}
      <WizardStep
        label={tx('Notizen')}
        description={tx('Optionale Anmerkungen zur Rechnung.')}
      >
        <Bound form={f} name="notizen" rows={4} />
        <StepNav
          onBack={() => setStep(7)}
          onNext={() => flow.validateStep(8)}
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      {/* Schritt 9: Prüfen & anlegen */}
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
            ]}
            whatHappensNext={tx('Rechnungsnummer und Gesamtbetrag werden automatisch vom System vergeben.')}
            confirmLabel={tx('Rechnung erstellen')}
          />
        )}
      </WizardStep>

      {/* Erfolgsmeldung */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Die Rechnung wurde als Entwurf angelegt. Rechnungsnummer und Gesamtbetrag sind nun vergeben.')}
          next={[
            {
              label: tx('Stunden buchen'),
              href: '#/intents/stunden-buchen',
            },
            {
              label: tx('Angebot erstellen'),
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
