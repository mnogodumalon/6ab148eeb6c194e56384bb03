/**
 * Angebot erstellen — 8-Schritt-Wizard.
 * Steps: 1) Projekt wählen → 2) Angebotstyp wählen → 3) Zeitrahmen eingeben →
 *        4) Dauer eingeben → 5) Kostentyp & -betrag → 6) Beschreibung → 7) Berater wählen →
 *        8) Anhang hochladen (optional) → Prüfen & anlegen.
 * Reads: projekte (nur akquise/in_bearbeitung), berater (nur aktiv).
 * Writes: angebote (createAngeboteEntry). angebotsstatus=entwurf wird als fixer Wert gesetzt.
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, StepNav,
 *           SummaryStep, SuccessStep, Bound, Field, DatePicker.
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
import { Input } from '@/components/ui/input';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldLookup,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

const DRAFT_KEY = 'angebot-erstellen';

export default function AngebotErstellenPage() {
  const [step, setStep] = useState(1);

  // Projekte: nur akquise oder in_bearbeitung
  const projekte = useRecordSearch(servicePort, 'projekte', {
    filter: "r.v_projektstatus in ['akquise', 'in_bearbeitung']",
    where: r => {
      const key = fieldLookup(r, 'projektstatus')?.key;
      return key === 'akquise' || key === 'in_bearbeitung';
    },
    searchFields: ['projektkennung'],
    toItem: p => ({
      id: p.id,
      title: fieldText(p, 'projektkennung'),
      subtitle: fieldLookup(p, 'projektart')?.label,
      status: fieldLookup(p, 'projektstatus') ?? undefined,
    }),
    orderby: ['r.v_projektkennung asc'],
  });

  // Berater: nur aktiv
  const berater = useRecordSearch(servicePort, 'berater', {
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldLookup(b, 'status')?.label,
    }),
    orderby: ['r.v_nachname asc'],
  });

  // Formular für das Angebot
  const angebot = useStepForm('angebote', {
    steps: {
      projekt: 1,
      angebotstyp: 2,
      zeitrahmen_anfang: 3,
      zeitrahmen_ende: 3,
      dauer: 4,
      kostentyp: 5,
      kostenbetrag: 5,
      beschreibung: 6,
      berater: 7,
    },
    // angebotsstatus wird als fixer Wert im Plan gesetzt — nie vom Nutzer abgefragt
    required: { angebotsstatus: false, angebotsnummer: false, angebotsjahr: false },
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'angebot',
      entity: 'angebote',
      form: angebot,
      primary: true,
      values: { angebotsstatus: 'entwurf' },
    },
  ], { draftKey: DRAFT_KEY });

  return (
    <IntentWizardShell
      title={tx('Angebot erstellen')}
      subtitle={tx('Neues Angebot zu einem Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[angebot]}
      draftKey={DRAFT_KEY}
      intro={{
        description: tx('Erstellt ein neues Angebot zu einem bestehenden Projekt.'),
        needs: [tx('Projektkennung'), tx('Angebotstyp'), tx('Zeitrahmen'), tx('Kostenbetrag')],
      }}
    >
      {/* Schritt 1: Projekt wählen */}
      <WizardStep
        label={tx('Projekt')}
        description={tx('Wähle das Projekt, für das das Angebot erstellt werden soll.')}
      >
        <EntitySelectStep
          {...projekte.select}
          selectedId={angebot.get('projekt') as string}
          emptyText={tx('Keine Projekte in Bearbeitung oder Akquise-Phase gefunden.')}
          onSelect={id => {
            angebot.set('projekt', id, projekte.labelOf(id));
            setStep(2);
          }}
        />
      </WizardStep>

      {/* Schritt 2: Angebotstyp wählen */}
      <WizardStep
        label={tx('Angebotstyp')}
        description={tx('Wähle die Art des Angebots.')}
        needs={['projekt']}
      >
        <div className="space-y-4">
          <Bound form={angebot} name="angebotstyp" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => angebot.validate(['angebotstyp'])}
            nextStepLabel={tx('Zeitrahmen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Zeitrahmen */}
      <WizardStep
        label={tx('Zeitrahmen')}
        description={tx('Gib Anfang und Ende des Angebotszeitraums ein.')}
        needs={['projekt', 'angebotstyp']}
      >
        <div className="space-y-4">
          <Field form={angebot} name="zeitrahmen_anfang">
            <DatePicker {...angebot.date('zeitrahmen_anfang')} />
          </Field>
          <Field form={angebot} name="zeitrahmen_ende">
            <DatePicker {...angebot.date('zeitrahmen_ende')} />
          </Field>
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => angebot.validate(['zeitrahmen_anfang'])}
            nextStepLabel={tx('Dauer')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Dauer */}
      <WizardStep
        label={tx('Dauer')}
        description={tx('Gib die geplante Dauer des Projekts ein (z. B. „3 Monate" oder „40 Stunden").')}
        needs={['zeitrahmen_anfang']}
      >
        <div className="space-y-4">
          <Bound form={angebot} name="dauer" placeholder={tx('z. B. 3 Monate oder 40 Stunden')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => angebot.validate(['dauer'])}
            nextStepLabel={tx('Kosten')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Kostentyp & Kostenbetrag */}
      <WizardStep
        label={tx('Kosten')}
        description={tx('Wähle den Kostentyp und gib den Kostenbetrag ein.')}
        needs={['dauer']}
      >
        <div className="space-y-4">
          <Bound form={angebot} name="kostentyp" />
          <Field form={angebot} name="kostenbetrag" hint={tx('Betrag in Euro')}>
            <Input {...angebot.number('kostenbetrag')} />
          </Field>
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => angebot.validate(['kostentyp', 'kostenbetrag'])}
            nextStepLabel={tx('Beschreibung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Beschreibung */}
      <WizardStep
        label={tx('Beschreibung')}
        description={tx('Beschreibe den Leistungsumfang des Angebots.')}
        needs={['kostenbetrag']}
      >
        <div className="space-y-4">
          <Bound form={angebot} name="beschreibung" rows={5} />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => angebot.validate(['beschreibung'])}
            nextStepLabel={tx('Berater')}
          />
        </div>
      </WizardStep>

      {/* Schritt 7: Berater wählen */}
      <WizardStep
        label={tx('Berater')}
        description={tx('Wähle den zuständigen Berater für dieses Angebot.')}
        needs={['beschreibung']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={angebot.get('berater') as string}
          emptyText={tx('Keine aktiven Berater gefunden.')}
          onSelect={id => {
            angebot.set('berater', id, berater.labelOf(id));
            setStep(8);
          }}
        />
      </WizardStep>

      {/* Schritt 8: Anhang (optional) */}
      <WizardStep
        label={tx('Anhang')}
        description={tx('Optional: Lade ein Angebots-Template oder ein Dokument hoch.')}
        needs={['berater']}
      >
        <div className="space-y-4">
          <StepNav
            onBack={() => setStep(7)}
            onNext={() => true}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 9: Prüfen & anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[angebot]}
            submit={submit}
            items={[
              {
                key: 'angebotsstatus_fixed',
                label: tx('Status'),
                value: tx('Entwurf'),
              },
            ]}
            whatHappensNext={tx('Das Angebot wird als Entwurf angelegt. Angebotsnummer und -jahr werden automatisch vergeben.')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[angebot]}
          submit={submit}
          whatHappensNext={tx('Das Angebot wurde als Entwurf gespeichert. Angebotsnummer und Jahr wurden automatisch zugewiesen.')}
          next={[
            { label: tx('Stunden erfassen'), href: '#/intents/stunden-erfassen' },
            { label: tx('Rechnung erstellen'), href: '#/intents/rechnung-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
