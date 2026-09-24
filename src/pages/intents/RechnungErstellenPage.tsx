/**
 * Rechnung erstellen — 9-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projekt auswählen → 3) Beteiligte Berater auswählen
 *        → 4) Zeiterfassungseinträge auswählen → 5) Rechnungsdatum & Fälligkeitsdatum
 *        → 6) Abrechnungsmonat & -jahr → 7) Nettobetrag & Mehrwertsteuer
 *        → 8) Notizen ergänzen → 9) Prüfen & anlegen.
 * Reads: kunden, projekte, berater, zeiterfassung.
 * Writes: rechnungen (rechnungsstatus=entwurf wird automatisch gesetzt).
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
import { fieldText, fieldNumber, fieldDate, fieldLookup, todayIso } from '@/lib/journey';
import { useRechnungErstellenFlow } from '@/lib/journey/flows/RechnungErstellen';
import { tx } from '@/i18n';
import { format, parseISO } from 'date-fns';

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
    initial: {
      rechnungsdatum: todayIso(),
    },
    items: {
      kunde: (r) => ({
        id: r.id,
        title: fieldText(r, 'kundenname'),
        subtitle: fieldText(r, 'email'),
        status: fieldLookup(r, 'kundentyp') ?? undefined,
      }),
      projekt: (r) => ({
        id: r.id,
        title: fieldText(r, 'projektkennung'),
        status: fieldLookup(r, 'projektstatus') ?? undefined,
        subtitle: fieldLookup(r, 'projektart')?.label,
      }),
      berater: (r) => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldLookup(r, 'status')?.label,
      }),
      zeiterfassungseintraege: (r) => {
        const datum = fieldDate(r, 'datum');
        const stunden = fieldNumber(r, 'stunden');
        const formattedDatum = datum
          ? format(parseISO(datum), 'dd.MM.yyyy')
          : tx('Kein Datum');
        return {
          id: r.id,
          title: tx`${formattedDatum} — ${stunden ?? '?'} Std.`,
          subtitle: fieldText(r, 'taetigkeit'),
        };
      },
    },
  });

  const gesamtbetrag = (() => {
    const netto = flow.forms.rechnungen.get('nettobetrag');
    const mwst = flow.forms.rechnungen.get('mehrwertsteuer');
    if (typeof netto === 'number' && typeof mwst === 'number') {
      return netto * (1 + mwst / 100);
    }
    return null;
  })();

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Erstellt eine Rechnung für einen Kunden zu einem Projekt.'),
        needs: [
          tx('Kundendaten'),
          tx('Projektzuordnung'),
          tx('Nettobetrag und Mehrwertsteuer'),
        ],
      }}
    >
      {/* Schritt 1: Kunde auswählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird die Rechnung gestellt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder E-Mail …')}
          avatar="none"
          create={{ fields: ['kundenname', 'email', 'kundentyp'] }}
          onSelect={(id) => {
            flow.forms.rechnungen.set('kunde', id, flow.picks.kunde.labelOf(id));
            setStep(2);
          }}
        />
      </WizardStep>

      {/* Schritt 2: Projekt auswählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welchem Projekt wird die Rechnung zugeordnet?')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...flow.picks.projekt.select}
          {...flow.pick('projekt')}
          searchPlaceholder={tx('Projektkennung …')}
          avatar="none"
          create={false}
          emptyText={tx('Kein passendes Projekt gefunden. Lege zuerst ein Projekt an.')}
          onSelect={(id) => {
            flow.forms.rechnungen.set('projekt', id, flow.picks.projekt.labelOf(id));
            setStep(3);
          }}
        />
      </WizardStep>

      {/* Schritt 3: Berater auswählen (multi) */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Welche Berater waren an diesem Projekt beteiligt?')}
        needs={['projekt']}
      >
        <Field form={flow.forms.rechnungen} name="berater">
          <EntitySelectStep
            {...flow.picks.berater.select}
            {...flow.pickMany('berater')}
            avatar="initials"
            searchPlaceholder={tx('Vor- oder Nachname …')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => flow.validateStep(3)}
          nextStepLabel={tx('Zeiterfassung')}
        />
      </WizardStep>

      {/* Schritt 4: Zeiterfassungseinträge auswählen (multi) */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Welche Zeiterfassungseinträge sollen abgerechnet werden?')}
        needs={['berater']}
      >
        <Field form={flow.forms.rechnungen} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...flow.picks.zeiterfassungseintraege.select}
            {...flow.pickMany('zeiterfassungseintraege')}
            avatar="none"
            searchPlaceholder={tx('Datum oder Tätigkeit …')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => flow.validateStep(4)}
          nextStepLabel={tx('Rechnungsdaten')}
        />
      </WizardStep>

      {/* Schritt 5: Rechnungsdatum & Fälligkeitsdatum */}
      <WizardStep
        label={tx('Rechnungsdatum')}
        description={tx('Wann wird die Rechnung ausgestellt, und bis wann ist sie fällig?')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="rechnungsdatum" />
          <Bound
            form={flow.forms.rechnungen}
            name="faelligkeitsdatum"
            hint={tx('Üblich: 14 oder 30 Tage nach Rechnungsdatum')}
          />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => flow.validateStep(5)}
            nextStepLabel={tx('Abrechnungszeitraum')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Abrechnungsmonat & -jahr */}
      <WizardStep
        label={tx('Abrechnungszeitraum')}
        description={tx('Für welchen Monat und welches Jahr wird abgerechnet?')}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.rechnungen} name="rechnungsmonat" />
          <Bound
            form={flow.forms.rechnungen}
            name="rechnungsjahr"
            hint={tx('z. B. 2026')}
          />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => flow.validateStep(6)}
            nextStepLabel={tx('Beträge')}
          />
        </div>
      </WizardStep>

      {/* Schritt 7: Nettobetrag & Mehrwertsteuer */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Nettobetrag und Mehrwertsteuersatz eingeben — der Gesamtbetrag wird berechnet.')}
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
            hint={tx('Prozentwert, z. B. 19')}
          />
          {gesamtbetrag !== null && (
            <div className="rounded-lg bg-secondary px-4 py-3">
              <p className="text-sm text-muted-foreground">{tx('Gesamtbetrag (berechnet)')}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {gesamtbetrag.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          )}
          <StepNav
            onBack={() => setStep(6)}
            onNext={() => flow.validateStep(7)}
            nextStepLabel={tx('Notizen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 8: Notizen */}
      <WizardStep
        label={tx('Notizen')}
        description={tx('Optionale Hinweise zur Rechnung ergänzen.')}
      >
        <div className="space-y-4">
          <Bound
            form={flow.forms.rechnungen}
            name="notizen"
            rows={4}
            hint={tx('Zahlungsbedingungen, Rabatte oder sonstige Anmerkungen')}
          />
          <StepNav
            onBack={() => setStep(7)}
            onNext={() => flow.validateStep(8)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 9: Zusammenfassung */}
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              {
                key: 'rechnungsstatus',
                label: tx('Status'),
                value: tx('Entwurf'),
              },
              ...(gesamtbetrag !== null
                ? [
                    {
                      key: 'gesamtbetrag',
                      label: tx('Gesamtbetrag (berechnet)'),
                      value: gesamtbetrag.toLocaleString('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                      }),
                    },
                  ]
                : []),
            ]}
            whatHappensNext={tx(
              'Die Rechnungsnummer vergibt das System. Der Gesamtbetrag wird automatisch aus Nettobetrag und Mehrwertsteuer berechnet.'
            )}
          />
        )}
      </WizardStep>

      {/* Erfolgseite */}
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx(
            'Die Rechnung ist als Entwurf angelegt. Du kannst sie nun weiterbearbeiten oder versenden.'
          )}
          next={[
            {
              label: tx('Weitere Rechnung erstellen'),
            },
            {
              label: tx('Stunden buchen'),
              href: '#/intents/zeit-buchen',
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
