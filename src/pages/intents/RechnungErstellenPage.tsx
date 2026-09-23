/**
 * Rechnung erstellen — 6-Schritt-Wizard.
 * Steps: 1) Kunde wählen → 2) Projekt wählen → 3) Zeiterfassung verknüpfen (opt.)
 *        → 4) Berater verknüpfen (opt.) → 5) Beträge & Details → 6) Prüfen & anlegen.
 * Reads: kunden, projekte, zeiterfassung, berater.
 * Writes: rechnungen (createRechnungenEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, StepNav, SummaryStep, SuccessStep,
 *           Field, Bound, useStepForm, useJourneySubmit, useRecordSearch.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { DatePicker } from '@/components/DatePicker';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldLookup,
  fieldDate,
  fieldNumber,
  combineFilters,
  refFilter,
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  // Step 1: Kunde
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: fieldText(k, 'email'),
      status: fieldLookup(k, 'kundentyp') ?? undefined,
    }),
    orderby: ['r.v_kundenname asc'],
  });

  // Step 2: Projekt (nur akquise oder in_bearbeitung)
  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    filter: "r.v_projektstatus in ['akquise', 'in_bearbeitung']",
    where: r => {
      const status = fieldLookup(r, 'projektstatus')?.key;
      return status === 'akquise' || status === 'in_bearbeitung';
    },
    toItem: (p, ctx) => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: ctx.ref('kunde'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
      stats: [{ label: tx('Art'), value: fieldLookup(p, 'projektart')?.label ?? '—' }],
    }),
    orderby: ['r.v_projektkennung asc'],
  });

  // Step 3: Zeiterfassungseinträge (nur abrechenbar=true)
  const zeiterfassung = useRecordSearch(servicePort, 'zeiterfassung', {
    searchFields: [],
    filter: "r.v_abrechenbar == True",
    where: r => r.fields.abrechenbar === true,
    toItem: (z, ctx) => ({
      id: z.id,
      title: ctx.ref('projekt') ?? tx('Ohne Projekt'),
      subtitle: [
        fieldDate(z, 'datum'),
        ctx.ref('berater'),
        fieldNumber(z, 'stunden') != null ? `${fieldNumber(z, 'stunden')} h` : null,
      ].filter(Boolean).join(' · '),
    }),
    orderby: ['r.v_datum desc'],
  });

  // Step 4: Berater
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    toItem: b => ({
      id: b.id,
      title: [fieldText(b, 'vorname'), fieldText(b, 'nachname')].filter(Boolean).join(' '),
      subtitle: fieldNumber(b, 'stundensatz') != null
        ? `${fieldNumber(b, 'stundensatz')} €/h`
        : undefined,
    }),
    orderby: ['r.v_nachname asc'],
  });

  // ONE form for the rechnung
  const rechnung = useStepForm('rechnungen', {
    fields: [
      'kunde', 'projekt',
      'zeiterfassungseintraege', 'berater',
      'rechnungsdatum', 'faelligkeitsdatum',
      'nettobetrag', 'mehrwertsteuer',
      'notizen',
    ],
    steps: {
      kunde: 1,
      projekt: 2,
      zeiterfassungseintraege: 3,
      berater: 4,
      rechnungsdatum: 5,
      faelligkeitsdatum: 5,
      nettobetrag: 5,
      mehrwertsteuer: 5,
      notizen: 5,
    },
    // rechnungsnummer is required on the entity but owned by a tool — never ask for it here
    required: { rechnungsnummer: false, gesamtbetrag: false },
    initial: { rechnungsdatum: todayIso() },
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'rechnung',
      entity: 'rechnungen',
      form: rechnung,
      primary: true,
      // rechnungsstatus: entwurf — not asked, set here
      values: { rechnungsstatus: 'entwurf' },
    },
  ], { draftKey: 'rechnung-erstellen' });

  const kundeId = rechnung.get('kunde') as string | undefined;
  const projektId = rechnung.get('projekt') as string | undefined;

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      subtitle={tx('Neue Rechnung für einen Kunden anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[rechnung]}
      draftKey="rechnung-erstellen"
      intro={{
        description: tx('Erstellt eine neue Rechnung für einen Kunden auf Basis eines Projekts.'),
        needs: [tx('Kundenname'), tx('Projekt'), tx('Nettobetrag und Mehrwertsteuer')],
      }}
    >
      {/* Step 1: Kunde wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird die Rechnung erstellt?')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={kundeId ?? null}
          onSelect={id => {
            rechnung.set('kunde', id, kunden.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Kunde suchen …')}
          avatar="initials"
          columns={2}
        />
      </WizardStep>

      {/* Step 2: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Welches Projekt wird in Rechnung gestellt? Nur aktive Projekte werden angezeigt.')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={projektId ?? null}
          onSelect={id => {
            rechnung.set('projekt', id, projekte.labelOf(id));
            setStep(3);
          }}
          searchPlaceholder={tx('Projekt suchen …')}
          emptyText={tx('Keine aktiven Projekte gefunden. Nur Projekte mit Status „Akquise" oder „In Bearbeitung" erscheinen hier.')}
          avatar="none"
          columns={2}
        />
      </WizardStep>

      {/* Step 3: Zeiterfassungseinträge verknüpfen (optional) */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Optional: Abrechenbare Zeiterfassungseinträge zur Rechnung hinzufügen.')}
        needs={['projekt']}
      >
        <Field form={rechnung} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...zeiterfassung.select}
            {...rechnung.records('zeiterfassungseintraege', zeiterfassung.labelOf)}
            searchPlaceholder={tx('Einträge suchen …')}
            emptyText={tx('Keine abrechenbaren Zeiterfassungseinträge vorhanden.')}
            avatar="none"
          />
        </Field>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => { setStep(4); }}
          nextStepLabel={tx('Berater')}
        />
      </WizardStep>

      {/* Step 4: Berater verknüpfen (optional) */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Optional: An der Rechnung beteiligte Berater auswählen.')}
        needs={['projekt']}
      >
        <Field form={rechnung} name="berater">
          <EntitySelectStep
            {...berater.select}
            {...rechnung.records('berater', berater.labelOf)}
            searchPlaceholder={tx('Berater suchen …')}
            emptyText={tx('Keine aktiven Berater gefunden.')}
            avatar="initials"
            columns={2}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => { setStep(5); }}
          nextStepLabel={tx('Beträge & Details')}
        />
      </WizardStep>

      {/* Step 5: Beträge & Details */}
      <WizardStep
        label={tx('Beträge & Details')}
        description={tx('Rechnungsdatum, Beträge und optionale Notizen eingeben.')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Field form={rechnung} name="rechnungsdatum">
            <DatePicker {...rechnung.date('rechnungsdatum')} />
          </Field>
          <Field form={rechnung} name="faelligkeitsdatum" hint={tx('Optional — Zahlungsziel')}>
            <DatePicker {...rechnung.date('faelligkeitsdatum')} />
          </Field>
          <Bound form={rechnung} name="nettobetrag" hint={tx('Nettobetrag in Euro')} />
          <Bound form={rechnung} name="mehrwertsteuer" hint={tx('z. B. 19 für 19 %')} />
          <Bound form={rechnung} name="notizen" rows={4} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() =>
              rechnung.validate(['rechnungsdatum', 'nettobetrag', 'mehrwertsteuer'])
            }
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 6: Prüfen & anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[rechnung]}
            submit={submit}
            whatHappensNext={tx(
              'Die Rechnung wird als Entwurf angelegt. Rechnungsnummer und Gesamtbetrag werden automatisch vergeben.',
            )}
            items={[
              { key: 'rechnungsstatus', label: tx('Status'), value: tx('Entwurf') },
            ]}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[rechnung]}
          submit={submit}
          whatHappensNext={tx(
            'Rechnungsnummer und Gesamtbetrag werden vom System automatisch berechnet und eingetragen.',
          )}
          next={[
            { label: tx('Weitere Rechnung erstellen') },
            { label: tx('Stunden erfassen'), href: '#/intents/stunden-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
