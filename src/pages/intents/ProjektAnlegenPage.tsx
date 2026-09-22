/**
 * Projekt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projektart, Status & Startdaten → 3) Projektleitung wählen → 4) Ansprechpartner & letzter Schritt (optional) → Prüfen & anlegen.
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
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldLookup,
  optionsOf,
} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

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
    orderby: ['r.v_kundenname asc'],
  });

  const berater = useRecordSearch(servicePort, 'berater', {
    searchFields: ['vorname', 'nachname'],
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
    orderby: ['r.v_nachname asc'],
  });

  const projekt = useStepForm('projekte', {
    steps: {
      kunde: 1,
      projektart: 2,
      projektstart_monat: 2,
      projektstart_jahr: 2,
      projektleitung: 3,
      ansprechpartner_kunde: 4,
      letzter_schritt: 4,
    },
    required: {
      projektart: true,
      projektstart_jahr: true,
      // projektstatus is set via values, not asked
      projektstatus: false,
      // projektkennung and projektnummer are set by a tool, not this flow
      projektkennung: false,
      projektnummer: false,
    },
  });

  const submit = useJourneySubmit(
    servicePort,
    [
      {
        key: 'projekt',
        entity: 'projekte',
        form: projekt,
        primary: true,
        values: { projektstatus: 'akquise' },
      },
    ],
    { draftKey: 'projekt-anlegen' }
  );

  const projektartOptions = optionsOf('projekte', 'projektart');
  const projektMonatOptions = optionsOf('projekte', 'projektstart_monat');

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      subtitle={tx('Neues Projekt erfassen und mit einem Kunden verknüpfen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[projekt]}
      draftKey="projekt-anlegen"
      intro={{
        description: tx('Ein neues Projekt anlegen und mit einem Kunden verknüpfen.'),
        needs: [tx('Kundendaten'), tx('Projektart'), tx('Startjahr')],
      }}
    >
      {/* Step 1: Kunden auswählen */}
      <WizardStep
        label={tx('Kunde')}
        heading={tx('Kunden auswählen')}
        description={tx('Wähle den Kunden aus, für den das Projekt angelegt wird.')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={projekt.get('kunde') as string | null}
          onSelect={id => {
            projekt.set('kunde', id, kunden.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Kundenname oder E-Mail suchen …')}
          columns={1}
          avatar="none"
          create={{ fields: ['kundenname', 'kundentyp', 'email'] }}
          createLabel={tx('Neuen Kunden anlegen')}
        />
      </WizardStep>

      {/* Step 2: Projektart, Status, Startdaten */}
      <WizardStep
        label={tx('Projektdetails')}
        description={tx('Projektart und Startdatum festlegen — Projektnummer und Kennung werden automatisch vergeben.')}
        needs={['kunde']}
      >
        <div className="space-y-6">
          <Field form={projekt} name="projektart">
            <ChoiceGroup
              {...projekt.choice('projektart')}
              options={projektartOptions}
            />
          </Field>

          <Field form={projekt} name="projektstart_monat">
            <ChoiceGroup
              {...projekt.choice('projektstart_monat')}
              options={projektMonatOptions}
              allowClear
            />
          </Field>

          <Bound form={projekt} name="projektstart_jahr" hint={tx('z. B. 2025')} />

          <StepNav
            onBack={() => setStep(1)}
            onNext={() =>
              projekt.validate(['projektart', 'projektstart_jahr'])
            }
            nextStepLabel={tx('Projektleitung')}
          />
        </div>
      </WizardStep>

      {/* Step 3: Projektleitung auswählen */}
      <WizardStep
        label={tx('Projektleitung')}
        heading={tx('Projektleitung auswählen')}
        description={tx('Wähle die verantwortliche Beraterin oder den verantwortlichen Berater.')}
        needs={['projektart', 'projektstart_jahr']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={projekt.get('projektleitung') as string | null}
          onSelect={id => {
            projekt.set('projektleitung', id, berater.labelOf(id));
            setStep(4);
          }}
          searchPlaceholder={tx('Name suchen …')}
          avatar="initials"
          emptyText={tx('Kein aktiver Berater gefunden.')}
          create={false}
        />
        <div className="mt-4">
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextStepLabel={tx('Weitere Details')}
            nextLabel={tx('Überspringen')}
          />
        </div>
      </WizardStep>

      {/* Step 4: Ansprechpartner & letzter Schritt (optional) */}
      <WizardStep
        label={tx('Weitere Details')}
        description={tx('Ansprechpartner beim Kunden und aktuellen Stand optional ergänzen.')}
        needs={['projektart', 'projektstart_jahr']}
      >
        <div className="space-y-6">
          <Bound
            form={projekt}
            name="ansprechpartner_kunde"
            hint={tx('Name der Kontaktperson beim Kunden')}
          />
          <Bound
            form={projekt}
            name="letzter_schritt"
            rows={3}
            hint={tx('Kurze Beschreibung des aktuellen Stands')}
          />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => projekt.validate(['ansprechpartner_kunde', 'letzter_schritt'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Step 5: Prüfen & Bestätigen */}
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
            whatHappensNext={tx(
              'Das Projekt wird angelegt. Projektnummer und Kennung vergibt das System automatisch.'
            )}
            confirmLabel={tx('Projekt anlegen')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[projekt]}
          submit={submit}
          whatHappensNext={tx(
            'Du kannst jetzt ein Angebot für dieses Projekt erstellen.'
          )}
          next={[
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
