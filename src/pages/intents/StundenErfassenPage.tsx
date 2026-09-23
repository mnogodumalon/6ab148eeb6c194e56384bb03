/**
 * Stunden erfassen — 5-Schritt-Wizard.
 * Steps: 1) Berater wählen → 2) Projekt wählen → 3) Leistung wählen (optional) →
 *        4) Details (Datum, Stunden, Tätigkeit, Abrechenbar) → 5) Prüfen & anlegen.
 * Reads: berater (nur aktiv), projekte (nur in_bearbeitung), leistungskatalog (alle).
 * Writes: zeiterfassung (createZeiterfassungEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav,
 *            SummaryStep, SuccessStep.
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

export default function StundenErfassenPage() {
  const [step, setStep] = useState(1);

  // Berater — nur aktiv
  const berater = useRecordSearch(servicePort, 'berater', {
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
    orderby: ['r.v_nachname asc'],
  });

  // Projekte — nur in_bearbeitung
  const projekte = useRecordSearch(servicePort, 'projekte', {
    filter: "r.v_projektstatus == 'in_bearbeitung'",
    where: r => fieldLookup(r, 'projektstatus')?.key === 'in_bearbeitung',
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektart')?.label,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
  });

  // Leistungskatalog — alle
  const leistungen = useRecordSearch(servicePort, 'leistungskatalog', {
    searchFields: ['leistungsname'],
    toItem: l => ({
      id: l.id,
      title: fieldText(l, 'leistungsname'),
      subtitle: fieldLookup(l, 'leistungstyp')?.label,
    }),
  });

  // Formular für zeiterfassung
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
    required: {
      leistung: false,
      taetigkeit: false,
      abrechenbar: false,
    },
    initial: {
      datum: todayIso(),
    },
  });

  const submit = useJourneySubmit(servicePort, [
    { key: 'eintrag', entity: 'zeiterfassung', form: f, primary: true },
  ], { draftKey: 'stunden-erfassen' });

  return (
    <IntentWizardShell
      title={tx('Stunden erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="stunden-erfassen"
      intro={{
        description: tx('Arbeitsstunden eines Beraters für ein Projekt erfassen.'),
        needs: [tx('Name des Beraters'), tx('Projektkürzel'), tx('Datum und Stundenanzahl')],
      }}
    >
      {/* Schritt 1: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Aktiven Berater auswählen, für den die Stunden erfasst werden.')}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={f.get('berater') as string}
          emptyText={tx('Kein aktiver Berater gefunden. Nur Berater mit Status „Aktiv" können ausgewählt werden.')}
          create={{ fields: ['vorname', 'nachname', 'email_beruflich', 'status'] }}
          onSelect={id => {
            f.set('berater', id, berater.labelOf(id));
            setStep(2);
          }}
        />
      </WizardStep>

      {/* Schritt 2: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Projekt auswählen, auf das die Stunden gebucht werden.')}
        needs={['berater']}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={f.get('projekt') as string}
          emptyText={tx('Kein aktives Projekt gefunden. Nur Projekte mit Status „In Bearbeitung" stehen zur Auswahl.')}
          create={false}
          onSelect={id => {
            f.set('projekt', id, projekte.labelOf(id));
            setStep(3);
          }}
        />
      </WizardStep>

      {/* Schritt 3: Leistung wählen (optional) */}
      <WizardStep
        label={tx('Leistung')}
        description={tx('Leistungsart aus dem Katalog wählen — optional, kann übersprungen werden.')}
        needs={['berater', 'projekt']}
      >
        <EntitySelectStep
          {...leistungen.select}
          selectedId={f.get('leistung') as string}
          avatar="none"
          onSelect={id => {
            f.set('leistung', id, leistungen.labelOf(id));
            setStep(4);
          }}
        />
        <StepNav
          onBack={() => setStep(2)}
          onNext={() => { setStep(4); }}
          nextStepLabel={tx('Details')}
          nextLabel={tx('Überspringen')}
        />
      </WizardStep>

      {/* Schritt 4: Details (Datum, Stunden, Tätigkeit, Abrechenbar) */}
      <WizardStep
        label={tx('Details')}
        description={tx('Datum und Stundenanzahl eingeben sowie Tätigkeit beschreiben.')}
        needs={['berater', 'projekt']}
      >
        <div className="space-y-4">
          <Bound form={f} name="datum" />
          <Bound form={f} name="stunden" />
          <Bound form={f} name="taetigkeit" rows={4} hint={tx('Was wurde gemacht? (optional)')} />
          <Bound form={f} name="abrechenbar" />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => f.validate(['datum', 'stunden'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Prüfen & Bestätigen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            whatHappensNext={tx('Der Zeiteintrag wird sofort im Projekt sichtbar und kann für die Abrechnung verwendet werden.')}
          />
        )}
      </WizardStep>

      {/* Erfolgsseite */}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          whatHappensNext={tx('Erfassungsmonat und -jahr werden automatisch vom System gesetzt.')}
          next={[
            { label: tx('Weitere Stunden erfassen'), onClick: () => { submit.reset(); f.reset(); setStep(1); } },
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
