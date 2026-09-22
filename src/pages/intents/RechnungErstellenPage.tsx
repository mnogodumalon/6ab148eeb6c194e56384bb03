/**
 * Rechnung erstellen — 7-Schritt-Wizard.
 * Steps: 1) Kunden wählen → 2) Projekt wählen → 3) Berater wählen (mehrere) →
 *        4) Zeiterfassungseinträge wählen (mehrere) → 5) Daten & Fälligkeit →
 *        6) Beträge → 7) Prüfen & anlegen.
 * Reads: kunden, projekte, berater, zeiterfassung.
 * Writes: rechnungen (createRechnungenEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Field, Bound, StepNav,
 *            SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Field } from '@/components/blocks/Field';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldLookup,
  fieldDate,
  fieldNumber,
  fieldRef,
  refFilter,
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

/** Map JS Date month index (0-based) to rechnungsmonat lookup key */
const MONTH_KEYS = [
  'januar', 'februar', 'maerz', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'dezember',
] as const;

export default function RechnungErstellenPage() {
  const [step, setStep] = useState(1);

  // Step 1: Kunden
  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: fieldText(k, 'email'),
    }),
  });

  // Step 2: Projekte — prefer in_bearbeitung but show all
  const projekte = useRecordSearch(servicePort, 'projekte', {
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
    orderby: ["r.v_projektstatus asc"],
  });

  // Step 3: Berater (multiple)
  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
  });

  // Step 4: Zeiterfassungseinträge — no text search field; list all
  const zeiterfassung = useRecordSearch(servicePort, 'zeiterfassung', {
    searchFields: [],
    toItem: (z, ctx) => {
      const datum = fieldDate(z, 'datum') ?? '';
      const stunden = fieldNumber(z, 'stunden');
      const datumFormatted = datum
        ? format(parseISO(datum), 'dd.MM.yyyy')
        : tx('Kein Datum');
      const beraterName = ctx.ref('berater') ?? tx('Unbekannt');
      return {
        id: z.id,
        title: tx`${datumFormatted} — ${stunden != null ? stunden : '?'} Std.`,
        subtitle: beraterName,
      };
    },
  });

  // ONE form for the rechnungen entity
  const f = useStepForm('rechnungen', {
    steps: {
      kunde: 1,
      projekt: 2,
      berater: 3,
      zeiterfassungseintraege: 4,
      rechnungsdatum: 5,
      faelligkeitsdatum: 5,
      nettobetrag: 6,
      mehrwertsteuer: 6,
      notizen: 6,
    },
    required: {
      // rechnungsnummer is set by tool — not asked, not required from user
      rechnungsnummer: false,
      // gesamtbetrag is calculated by tool
      gesamtbetrag: false,
      // rechnungsmonat and rechnungsjahr derived — not asked
      rechnungsmonat: false,
      rechnungsjahr: false,
      // rechnungsstatus set by plan
      rechnungsstatus: false,
    },
    initial: {
      rechnungsdatum: todayIso(),
    },
  });

  // Derive rechnungsmonat key and rechnungsjahr from rechnungsdatum
  const rechnungsdatumVal = f.get('rechnungsdatum') as string | null;
  const derivedMonthKey = rechnungsdatumVal
    ? MONTH_KEYS[parseISO(rechnungsdatumVal).getMonth()]
    : null;
  const derivedJahr = rechnungsdatumVal
    ? parseISO(rechnungsdatumVal).getFullYear()
    : null;

  // The submit plan: creates one rechnungen record
  const submit = useJourneySubmit(
    servicePort,
    [
      {
        key: 'rechnung',
        entity: 'rechnungen',
        form: f,
        primary: true,
        values: (_ctx) => ({
          rechnungsstatus: 'entwurf',
          rechnungsmonat: derivedMonthKey ?? undefined,
          rechnungsjahr: derivedJahr ?? undefined,
        }),
      },
    ],
    { draftKey: 'rechnung-erstellen' }
  );

  return (
    <IntentWizardShell
      title={tx('Rechnung erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="rechnung-erstellen"
      intro={{
        description: tx('Neue Rechnung auf Basis eines Projekts und Zeiterfassungseinträgen anlegen.'),
        needs: [tx('Kundendaten'), tx('Projektzuordnung'), tx('Nettobetrag und Mehrwertsteuer')],
      }}
    >
      {/* Step 1: Kunden wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden soll die Rechnung erstellt werden?')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={f.get('kunde') as string | null}
          onSelect={id => {
            f.set('kunde', id, kunden.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Name oder E-Mail suchen …')}
          create={{ fields: ['kundenname', 'email', 'kundentyp', 'anlagedatum'] }}
        />
      </WizardStep>

      {/* Step 2: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt, auf das sich diese Rechnung bezieht.')}
        needs={['kunde']}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={f.get('projekt') as string | null}
          onSelect={id => {
            f.set('projekt', id, projekte.labelOf(id));
            setStep(3);
          }}
          searchPlaceholder={tx('Projektkennung suchen …')}
          create={{ fields: ['projektkennung', 'projektnummer', 'projektart', 'projektstatus'] }}
        />
        <StepNav onBack={() => setStep(1)} />
      </WizardStep>

      {/* Step 3: Berater wählen (multiple) */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Welche Berater sind an dieser Rechnung beteiligt?')}
        needs={['projekt']}
      >
        <Field form={f} name="berater">
          <EntitySelectStep
            {...berater.select}
            {...f.records('berater', berater.labelOf)}
            searchPlaceholder={tx('Berater suchen …')}
            create={false}
          />
        </Field>
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => f.validate(['berater'])}
          nextStepLabel={tx('Zeiterfassung')}
        />
      </WizardStep>

      {/* Step 4: Zeiterfassungseinträge wählen (multiple) */}
      <WizardStep
        label={tx('Zeiterfassung')}
        description={tx('Wähle die abzurechnenden Zeiterfassungseinträge aus.')}
        needs={['berater']}
      >
        <Field form={f} name="zeiterfassungseintraege">
          <EntitySelectStep
            {...zeiterfassung.select}
            {...f.records('zeiterfassungseintraege', zeiterfassung.labelOf)}
            searchPlaceholder={tx('Eintrag suchen …')}
            create={false}
            emptyText={tx('Keine Zeiterfassungseinträge vorhanden.')}
          />
        </Field>
        <StepNav
          onBack={() => setStep(3)}
          onNext={() => true}
          nextStepLabel={tx('Daten')}
        />
      </WizardStep>

      {/* Step 5: Rechnungsdatum und Fälligkeitsdatum */}
      <WizardStep
        label={tx('Daten')}
        description={tx('Rechnungsdatum ist Pflicht; Fälligkeitsdatum ist optional.')}
        needs={['zeiterfassungseintraege']}
      >
        <div className="space-y-4">
          <Bound form={f} name="rechnungsdatum" />
          <Bound form={f} name="faelligkeitsdatum" />
          {derivedMonthKey && derivedJahr && (
            <p className="text-sm text-muted-foreground">
              {tx('Abrechnungsmonat')}: <strong>{derivedMonthKey.charAt(0).toUpperCase() + derivedMonthKey.slice(1)} {derivedJahr}</strong>
            </p>
          )}
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => f.validate(['rechnungsdatum'])}
            nextStepLabel={tx('Beträge')}
          />
        </div>
      </WizardStep>

      {/* Step 6: Nettobetrag, Mehrwertsteuer, Notizen */}
      <WizardStep
        label={tx('Beträge')}
        description={tx('Nettobetrag und Mehrwertsteuer eintragen. Gesamtbetrag wird automatisch berechnet.')}
        needs={['rechnungsdatum']}
      >
        <div className="space-y-4">
          <Bound form={f} name="nettobetrag" hint={tx('In Euro, z. B. 2500')} />
          <Bound form={f} name="mehrwertsteuer" hint={tx('Prozentsatz, z. B. 19')} />
          <Bound form={f} name="notizen" rows={3} />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => f.validate(['nettobetrag', 'mehrwertsteuer'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 7: Zusammenfassung & Bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            items={[
              {
                key: 'rechnungsstatus',
                label: tx('Status'),
                value: tx('Entwurf'),
              },
              ...(derivedMonthKey && derivedJahr
                ? [
                    {
                      key: 'rechnungsmonat_jahr',
                      label: tx('Abrechnungszeitraum'),
                      value: `${derivedMonthKey.charAt(0).toUpperCase() + derivedMonthKey.slice(1)} ${derivedJahr}`,
                    },
                  ]
                : []),
            ]}
            whatHappensNext={tx('Die Rechnung wird als Entwurf angelegt. Rechnungsnummer und Gesamtbetrag werden automatisch vergeben.')}
          />
        )}
      </WizardStep>

      {/* Success */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          restartLabel={tx('Weitere Rechnung erstellen')}
          next={[
            { label: tx('Stunden buchen'), href: '#/intents/stunden-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Rechnungsnummer und Gesamtbetrag werden automatisch vom System befüllt. Du kannst die Rechnung anschließend in der Rechnungsübersicht einsehen.')}
        />
      )}
    </IntentWizardShell>
  );
}
