/**
 * Stunden buchen — 4-Schritt-Wizard.
 * Steps: 1) Berater wählen (nur aktiv) → 2) Projekt wählen (nur in_bearbeitung)
 *        → 3) Leistung wählen (alle) → 4) Datum, Stunden, Tätigkeit & Abrechenbarkeit → 5) Prüfen & anlegen.
 * Reads: berater (filter: aktiv), projekte (filter: in_bearbeitung), leistungskatalog (alle).
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
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

export default function StundenBuchenPage() {
  const [step, setStep] = useState(1);

  const berater = useRecordSearch(servicePort, 'berater', {
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
  });

  const projekte = useRecordSearch(servicePort, 'projekte', {
    filter: "r.v_projektstatus == 'in_bearbeitung'",
    where: r => fieldLookup(r, 'projektstatus')?.key === 'in_bearbeitung',
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  const leistungen = useRecordSearch(servicePort, 'leistungskatalog', {
    searchFields: ['leistungsname'],
    toItem: l => ({
      id: l.id,
      title: fieldText(l, 'leistungsname'),
      subtitle: fieldLookup(l, 'leistungstyp')?.label,
      status: fieldLookup(l, 'einheit') ?? undefined,
    }),
  });

  const f = useStepForm('zeiterfassung', {
    steps: {
      berater: 1,
      projekt: 2,
      leistung: 3,
      datum: 4,
      stunden: 4,
      taetigkeit: 4,
      abrechenbar: 4,
    },
    // erfassungsmonat and erfassungsjahr are owned by an external tool — never ask for them
    required: { erfassungsmonat: false, erfassungsjahr: false },
  });

  const submit = useJourneySubmit(servicePort, [
    { key: 'zeiterfassung', entity: 'zeiterfassung', form: f, primary: true },
  ], { draftKey: 'stunden-buchen' });

  return (
    <IntentWizardShell
      title={tx('Stunden buchen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="stunden-buchen"
      intro={{
        description: tx('Geleistete Stunden auf ein Projekt und eine Leistung erfassen.'),
        needs: [tx('Name des Beraters'), tx('Projektkennung'), tx('Leistung aus dem Katalog')],
      }}
    >
      <WizardStep
        label={tx('Berater')}
        description={tx('Nur aktive Berater stehen zur Auswahl.')}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={f.get('berater') as string | null}
          onSelect={id => {
            f.set('berater', id, berater.labelOf(id));
            setStep(2);
          }}
          emptyText={tx('Kein aktiver Berater gefunden.')}
          avatar="initials"
          create={false}
        />
      </WizardStep>

      <WizardStep
        label={tx('Projekt')}
        description={tx('Nur Projekte mit Status „In Bearbeitung" stehen zur Auswahl.')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={f.get('projekt') as string | null}
          onSelect={id => {
            f.set('projekt', id, projekte.labelOf(id));
            setStep(3);
          }}
          emptyText={tx('Kein Projekt mit Status „In Bearbeitung" gefunden.')}
          avatar="none"
          create={false}
        />
      </WizardStep>

      <WizardStep
        label={tx('Leistung')}
        description={tx('Erbrachte Leistung aus dem Katalog auswählen.')}
        needs={['berater', 'projekt']}
      >
        <EntitySelectStep
          {...leistungen.select}
          selectedId={f.get('leistung') as string | null}
          onSelect={id => {
            f.set('leistung', id, leistungen.labelOf(id));
            setStep(4);
          }}
          emptyText={tx('Keine Leistung im Katalog gefunden.')}
          avatar="none"
        />
      </WizardStep>

      <WizardStep
        label={tx('Details')}
        description={tx('Datum, Stunden und Tätigkeitsbeschreibung eintragen.')}
        needs={['berater', 'projekt', 'leistung']}
      >
        <div className="space-y-4">
          <Bound form={f} name="datum" />
          <Bound form={f} name="stunden" />
          <Bound form={f} name="taetigkeit" rows={3} />
          <Bound form={f} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => f.validate(['datum', 'stunden', 'taetigkeit', 'abrechenbar'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            whatHappensNext={tx('Der Zeiteintrag wird sofort gespeichert. Monat und Jahr werden automatisch vom System ergänzt.')}
          />
        )}
        {submit.result && (
          <SuccessStep
            result={submit.result}
            forms={[f]}
            submit={submit}
            whatHappensNext={tx('Monat und Jahr werden automatisch vom System abgeleitet.')}
            next={[
              { label: tx('Weitere Stunden buchen'), onClick: () => { submit.reset(); f.reset(); setStep(1); } },
              { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
              { label: tx('Zum Dashboard'), href: '#/' },
            ]}
          />
        )}
      </WizardStep>
    </IntentWizardShell>
  );
}
