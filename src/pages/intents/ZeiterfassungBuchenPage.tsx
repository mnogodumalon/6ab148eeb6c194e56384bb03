/**
 * Zeiterfassung buchen — 3-Schritt-Wizard.
 * Steps: 1) Berater wählen → 2) Projekt + Leistung zuordnen → 3) Zeit + Tätigkeit eintragen.
 * Reads: berater (filter aktiv), projekte (filter in_bearbeitung|akquise), leistungskatalog.
 * Writes: zeiterfassung (createZeiterfassungEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
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
  todayIso,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

export default function ZeiterfassungBuchenPage() {
  const [step, setStep] = useState(1);

  // Schritt 1: Berater (nur aktive)
  const beraterSearch = useRecordSearch(servicePort, 'berater', {
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname', 'email_beruflich'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldText(b, 'email_beruflich'),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
  });

  // Schritt 2a: Projekt (nur in Bearbeitung oder Akquise)
  const projektSearch = useRecordSearch(servicePort, 'projekte', {
    filter: "r.v_projektstatus in ['in_bearbeitung', 'akquise']",
    where: r => {
      const key = fieldLookup(r, 'projektstatus')?.key;
      return key === 'in_bearbeitung' || key === 'akquise';
    },
    searchFields: ['projektkennung', 'ansprechpartner_kunde'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldText(p, 'ansprechpartner_kunde'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  // Schritt 2b: Leistung (Leistungskatalog)
  const leistungSearch = useRecordSearch(servicePort, 'leistungskatalog', {
    searchFields: ['leistungsname'],
    toItem: l => ({
      id: l.id,
      title: fieldText(l, 'leistungsname'),
      subtitle: fieldLookup(l, 'leistungstyp')?.label,
    }),
  });

  // Formular für den Zeiterfassungseintrag
  const zeitForm = useStepForm('zeiterfassung', {
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 2,
      datum: 3,
      stunden: 3,
      taetigkeit: 3,
      abrechenbar: 3,
      erfassungsmonat: 3,
      erfassungsjahr: 3,
    },
    initial: {
      datum: todayIso(),
      abrechenbar: true,
    },
    required: {
      leistung: false,
      taetigkeit: false,
      erfassungsmonat: false,
      erfassungsjahr: false,
    },
  });

  const submit = useJourneySubmit(
    servicePort,
    [{ key: 'zeiterfassung', entity: 'zeiterfassung', form: zeitForm, primary: true }],
    { draftKey: 'zeiterfassung-buchen' }
  );

  return (
    <IntentWizardShell
      title={tx('Zeiterfassung buchen')}
      subtitle={tx('Neuen Zeiterfassungseintrag anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[zeitForm]}
      draftKey="zeiterfassung-buchen"
      intro={{
        description: tx('Einen neuen Zeiterfassungseintrag in 3 Schritten anlegen.'),
        needs: [tx('Berater'), tx('Projekt'), tx('Anzahl Stunden')],
      }}
    >
      {/* Schritt 1: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den Berater, dessen Zeit erfasst werden soll.')}
      >
        <EntitySelectStep
          {...beraterSearch.select}
          selectedId={zeitForm.get('berater') as string}
          onSelect={id => {
            zeitForm.set('berater', id, beraterSearch.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Berater suchen …')}
          emptyText={tx('Keine aktiven Berater gefunden.')}
          create={false}
        />
      </WizardStep>

      {/* Schritt 2: Projekt + Leistung */}
      <WizardStep
        label={tx('Projekt & Leistung')}
        description={tx('Projekt und erbrachte Leistung für diesen Eintrag zuordnen.')}
        needs={['berater']}
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{tx('Projekt auswählen')}</p>
            <EntitySelectStep
              {...projektSearch.select}
              selectedId={zeitForm.get('projekt') as string}
              onSelect={id => {
                zeitForm.set('projekt', id, projektSearch.labelOf(id));
              }}
              searchPlaceholder={tx('Projekt suchen …')}
              emptyText={tx('Keine aktiven Projekte (in Bearbeitung oder Akquise) gefunden.')}
              create={false}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{tx('Leistung auswählen (optional)')}</p>
            <EntitySelectStep
              {...leistungSearch.select}
              selectedId={zeitForm.get('leistung') as string}
              onSelect={id => {
                zeitForm.set('leistung', id, leistungSearch.labelOf(id));
              }}
              searchPlaceholder={tx('Leistung suchen …')}
            />
          </div>
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => zeitForm.validate(['projekt'])}
            nextStepLabel={tx('Zeit & Tätigkeit')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Zeit + Tätigkeit */}
      <WizardStep
        label={tx('Zeit & Tätigkeit')}
        description={tx('Datum, Stundenanzahl und Tätigkeitsbeschreibung eintragen.')}
        needs={['berater', 'projekt']}
      >
        <div className="space-y-4">
          <Bound form={zeitForm} name="datum" />
          <Bound form={zeitForm} name="stunden" />
          <Bound form={zeitForm} name="taetigkeit" rows={4} />
          <Bound form={zeitForm} name="abrechenbar" />
          <Bound form={zeitForm} name="erfassungsmonat" />
          <Bound form={zeitForm} name="erfassungsjahr" />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => zeitForm.validate(['datum', 'stunden'])}
            nextStepLabel={tx('Prüfen & Anlegen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Zusammenfassung */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[zeitForm]}
            submit={submit}
            whatHappensNext={tx('Der Zeiterfassungseintrag wird sofort angelegt und steht für Abrechnungen zur Verfügung.')}
            confirmLabel={tx('Eintrag anlegen')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[zeitForm]}
          submit={submit}
          whatHappensNext={tx('Der Eintrag ist gespeichert und kann in der Zeiterfassungsübersicht eingesehen werden.')}
          next={[
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
