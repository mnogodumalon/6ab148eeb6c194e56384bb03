/**
 * Projekt anlegen — 6-Schritt-Wizard.
 * Steps: 1) Kunden wählen → 2) Projektart & -status → 3) Projektstart → 4) Projektleitung wählen → 5) Ansprechpartner → 6) Prüfen & anlegen.
 * Reads: kunden, berater. Writes: projekte (createProjekteEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { ChoiceGroup } from '@/components/blocks/ChoiceGroup';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Field } from '@/components/blocks/Field';
import { useStepForm, useJourneySubmit, useRecordSearch, fieldText, fieldLookup } from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';
import { LOOKUP_OPTIONS } from '@/types/app';

export default function ProjektAnlegenPage() {
  const [step, setStep] = useState(1);

  const kunden = useRecordSearch(servicePort, 'kunden', {
    searchFields: ['kundenname', 'email'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: fieldText(k, 'email'),
      status: fieldLookup(k, 'kundentyp') ?? undefined,
    }),
  });

  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldText(b, 'email_beruflich'),
    }),
  });

  const projekt = useStepForm('projekte', {
    steps: {
      kunde: 1,
      projektart: 2,
      projektstart_jahr: 3,
      projektstart_monat: 3,
      projektleitung: 4,
      ansprechpartner_kunde: 5,
      letzter_schritt: 6,
    },
    required: {
      projektkennung: false,
      projektnummer: false,
      projektstart_monat: false,
      ansprechpartner_kunde: false,
      letzter_schritt: false,
      projektleitung: false,
    },
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'projekt',
      entity: 'projekte',
      form: projekt,
      primary: true,
      values: { projektstatus: 'akquise' },
    },
  ], { draftKey: 'projekt-anlegen' });

  const projektartOptions = LOOKUP_OPTIONS['projekte']?.['projektart'] ?? [];

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      subtitle={tx('Neues Projekt mit Kunde und Projektleitung verknüpfen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[projekt]}
      draftKey="projekt-anlegen"
      intro={{
        description: tx('Legt ein neues Projekt an und verknüpft es mit einem Kunden sowie einer Projektleitung.'),
        needs: [tx('Kundendaten'), tx('Projektart'), tx('Startjahr'), tx('Projektleitung')],
      }}
    >
      {/* Schritt 1: Kunde wählen */}
      <WizardStep
        label={tx('Kunde')}
        description={tx('Den Kunden auswählen, für den das Projekt angelegt wird.')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={projekt.get('kunde') as string}
          onSelect={id => {
            projekt.set('kunde', id, kunden.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Name oder E-Mail suchen …')}
          avatar="initials"
        />
      </WizardStep>

      {/* Schritt 2: Projektart festlegen */}
      <WizardStep
        label={tx('Projektart')}
        description={tx('Wähle die Art des Projekts. Der Status wird automatisch auf „Akquise" gesetzt.')}
        needs={['kunde']}
      >
        <div className="space-y-6">
          <Field form={projekt} name="projektart">
            <ChoiceGroup {...projekt.choice('projektart')} options={projektartOptions} />
          </Field>
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => projekt.validate(['projektart'])}
            nextStepLabel={tx('Projektstart')}
          />
        </div>
      </WizardStep>

      {/* Schritt 3: Projektstart */}
      <WizardStep
        label={tx('Projektstart')}
        description={tx('Startjahr (Pflicht) und optional den Startmonat angeben.')}
        needs={['projektart']}
      >
        <div className="space-y-6">
          <Bound form={projekt} name="projektstart_jahr" hint={tx('Vierstellige Jahreszahl, z. B. 2026')} />
          <Bound form={projekt} name="projektstart_monat" allowClear />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => projekt.validate(['projektstart_jahr'])}
            nextStepLabel={tx('Projektleitung')}
          />
        </div>
      </WizardStep>

      {/* Schritt 4: Projektleitung wählen */}
      <WizardStep
        label={tx('Projektleitung')}
        description={tx('Den verantwortlichen Berater als Projektleitung auswählen.')}
        needs={['projektstart_jahr']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={projekt.get('projektleitung') as string}
          onSelect={id => {
            projekt.set('projektleitung', id, berater.labelOf(id));
            setStep(5);
          }}
          searchPlaceholder={tx('Name suchen …')}
          avatar="initials"
          emptyText={tx('Keine aktiven Berater gefunden.')}
        />
        <div className="mt-4">
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
            nextLabel={tx('Überspringen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 5: Ansprechpartner beim Kunden */}
      <WizardStep
        label={tx('Ansprechpartner')}
        description={tx('Den Ansprechpartner beim Kunden und optionale Notizen zum letzten Stand eingeben.')}
        needs={['kunde']}
      >
        <div className="space-y-6">
          <Bound form={projekt} name="ansprechpartner_kunde" placeholder={tx('Name des Ansprechpartners')} />
          <Bound form={projekt} name="letzter_schritt" rows={3} placeholder={tx('Aktueller Stand oder letzter Schritt …')} />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => setStep(6)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Prüfen & anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[projekt]}
            submit={submit}
            items={[
              {
                key: 'projektstatus',
                label: tx('Projektstatus'),
                value: tx('Akquise'),
              },
            ]}
            whatHappensNext={tx('Das Projekt wird angelegt. Projektkennung und Projektnummer vergibt das System automatisch.')}
            confirmLabel={tx('Projekt anlegen')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[projekt]}
          submit={submit}
          whatHappensNext={tx('Projektkennung und Projektnummer wurden automatisch vergeben. Du kannst jetzt ein Angebot erstellen oder Stunden buchen.')}
          next={[
            {
              label: tx('Angebot erstellen'),
              href: '#/intents/angebot-erstellen',
            },
            {
              label: tx('Stunden buchen'),
              href: '#/intents/stunden-buchen',
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
