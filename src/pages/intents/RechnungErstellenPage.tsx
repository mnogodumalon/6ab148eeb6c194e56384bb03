/**
 * Rechnung erstellen — 6-Schritt-Wizard.
 * Steps: 1) Kunden wählen → 2) Projekt wählen → 3) Rechnungsdatum & Fälligkeitsdatum →
 *        4) Zeiterfassungseinträge zuordnen → 5) Nettobetrag & Mehrwertsteuer → 6) Prüfen & speichern.
 * Reads: kunden, projekte, zeiterfassung, berater.
 * Writes: rechnungen (createRechnungenEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldLookup,
  fieldRef,
  fieldNumber,
  refFilter,
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  // Kunden-Suche
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email', 'ort'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: [fieldText(k, 'ort'), fieldText(k, 'email')].filter(Boolean).join(' · '),
    }),
    orderby: ['r.v_kundenname asc'],
  });

  // Form für die Rechnung
  const rechnung = useStepForm('rechnungen', {
    steps: {
      kunde: 1,
      projekt: 2,
      rechnungsdatum: 3,
      faelligkeitsdatum: 3,
      rechnungsmonat: 3,
      rechnungsjahr: 3,
      zeiterfassungseintraege: 4,
      berater: 4,
      nettobetrag: 5,
      mehrwertsteuer: 5,
      notizen: 5,
    },
    initial: {
      rechnungsdatum: todayIso(),
      rechnungsstatus: 'entwurf',
    },
    required: {
      // rechnungsnummer wird vom System vergeben — nicht im Wizard fragen
      rechnungsnummer: false,
      faelligkeitsdatum: false,
      rechnungsmonat: false,
      rechnungsjahr: false,
      zeiterfassungseintraege: false,
      berater: false,
      notizen: false,
      gesamtbetrag: false,
      nettobetrag: false,
      mehrwertsteuer: false,
    },
  });

  // Projekt-Suche — gefiltert nach gewähltem Kunden
  const kundeId = rechnung.get('kunde') as string | undefined;
  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    filter: kundeId ? refFilter('kunde', kundeId) : undefined,
    where: kundeId ? (r => fieldRef(r, 'kunde') === kundeId) : undefined,
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
    orderby: ['r.v_projektkennung asc'],
  });

  // Zeiterfassungs-Suche — gefiltert nach gewähltem Projekt
  const projektId = rechnung.get('projekt') as string | undefined;
  const zeiterfassung = useRecordSearch(servicePort, 'zeiterfassung', {
    searchFields: ['taetigkeit'],
    filter: projektId ? refFilter('projekt', projektId) : undefined,
    where: projektId ? (r => fieldRef(r, 'projekt') === projektId) : undefined,
    toItem: (ze, ctx) => ({
      id: ze.id,
      title: ctx.ref('berater') ?? tx('Unbekannter Berater'),
      subtitle: [
        fieldText(ze, 'datum') ? fieldText(ze, 'datum') : null,
        fieldNumber(ze, 'stunden') != null ? `${fieldNumber(ze, 'stunden')} h` : null,
        fieldText(ze, 'taetigkeit') || null,
      ].filter(Boolean).join(' · '),
    }),
  });

  // Berater-Suche — nach gewähltem Projekt
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldLookup(b, 'status')?.label,
    }),
    orderby: ['r.v_nachname asc'],
  });

  // Plan: eine Rechnung anlegen
  const submit = useJourneySubmit(
    servicePort,
    [
      {
        key: 'rechnung',
        entity: 'rechnungen',
        form: rechnung,
        primary: true,
        values: { rechnungsstatus: 'entwurf' },
      },
    ],
    { draftKey: 'rechnung-erstellen' }
  );

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[rechnung]}
      draftKey="rechnung-erstellen"
      intro={{
        description: tx('Erstelle eine Rechnung für einen Kunden auf Basis eines Projekts.'),
        needs: [tx('Kunde und Projekt'), tx('Rechnungsdatum'), tx('Nettobetrag und Mehrwertsteuer')],
      }}
    >
      {/* Schritt 1: Kunden wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird die Rechnung ausgestellt?')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={rechnung.get('kunde') as string | null}
          onSelect={id => {
            rechnung.set('kunde', id, kunden.labelOf(id));
            // Projekt-Auswahl zurücksetzen bei Kundenwechsel
            rechnung.set('projekt', null, undefined);
            setStep(2);
          }}
          avatar="initials"
          searchPlaceholder={tx('Kunden suchen …')}
          create={false}
        />
      </WizardStep>

      {/* Schritt 2: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt liegt dieser Rechnung zugrunde?')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={rechnung.get('projekt') as string | null}
          onSelect={id => {
            rechnung.set('projekt', id, projekte.labelOf(id));
            setStep(3);
          }}
          avatar="none"
          searchPlaceholder={tx('Projekt suchen …')}
          emptyText={tx('Für diesen Kunden wurden noch keine Projekte angelegt.')}
          create={false}
        />
      </WizardStep>

      {/* Schritt 3: Rechnungsdaten */}
      <WizardStep
        label={tx('Datum')}
        description={tx('Rechnungsdatum, Fälligkeitsdatum und Abrechnungszeitraum festlegen.')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="rechnungsdatum" />
          <Bound form={rechnung} name="faelligkeitsdatum" />
          <Bound form={rechnung} name="rechnungsmonat" />
          <Bound form={rechnung} name="rechnungsjahr" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => rechnung.validate(['rechnungsdatum'])}
            nextStepLabel={tx('Zeiterfassung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Zeiterfassungseinträge und Berater */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Wähle die Zeiterfassungseinträge und beteiligten Berater für diese Rechnung aus.')}
        needs={['rechnungsdatum']}
      >
        <div className="space-y-6">
          <Field form={rechnung} name="zeiterfassungseintraege">
            <EntitySelectStep
              {...zeiterfassung.select}
              {...rechnung.records('zeiterfassungseintraege', zeiterfassung.labelOf)}
              avatar="none"
              searchPlaceholder={tx('Einträge suchen …')}
              emptyText={tx('Für dieses Projekt wurden noch keine Zeiterfassungseinträge angelegt.')}
              create={false}
            />
          </Field>
          <Field form={rechnung} name="berater">
            <EntitySelectStep
              {...berater.select}
              {...rechnung.records('berater', berater.labelOf)}
              avatar="initials"
              searchPlaceholder={tx('Berater suchen …')}
            />
          </Field>
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
            nextStepLabel={tx('Beträge')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Beträge */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Nettobetrag und Mehrwertsteuer eingeben.')}
      >
        <div className="space-y-4">
          <Bound form={rechnung} name="nettobetrag" hint={tx('In Euro (€)')} />
          <Bound form={rechnung} name="mehrwertsteuer" hint={tx('Prozentsatz, z. B. 19')} />
          <Bound form={rechnung} name="notizen" rows={3} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => rechnung.validate(['nettobetrag'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Prüfen & Speichern */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done ? (
          <SummaryStep
            forms={[rechnung]}
            submit={submit}
            whatHappensNext={tx('Die Rechnung wird mit dem Status „Entwurf" angelegt. Die Rechnungsnummer vergibt das System automatisch.')}
            confirmLabel={tx('Rechnung anlegen')}
            items={[
              {
                key: 'rechnungsstatus',
                label: tx('Status'),
                value: tx('Entwurf'),
              },
            ]}
          />
        ) : null}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[rechnung]}
          submit={submit}
          restartLabel={tx('Weitere Rechnung erstellen')}
          whatHappensNext={tx('Die Rechnungsnummer wurde automatisch vergeben. Du kannst die Rechnung jetzt bearbeiten oder versenden.')}
          next={[
            { label: tx('Zum Dashboard'), href: '#/' },
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
