/**
 * Projekt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projektart, Startdatum & Ansprechpartner → 3) Projektleitung wählen → 4) Prüfen & anlegen.
 * Reads: kunden, berater. Writes: projekte (createProjekteEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useStepForm, useJourneySubmit, useRecordSearch, fieldText, fieldLookup } from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { tx } from '@/i18n';

export default function ProjektAnlegenPage() {
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
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      status: fieldLookup(b, 'status') ?? undefined,
    }),
    orderby: ['r.v_nachname asc'],
  });

  const [step, setStep] = useState(1);

  const f = useStepForm('projekte', {
    steps: {
      kunde: 1,
      projektart: 2,
      projektstart_jahr: 2,
      projektstart_monat: 2,
      ansprechpartner_kunde: 2,
      projektleitung: 3,
    },
    required: {
      projektart: true,
      projektstart_jahr: true,
    },
    // Fields owned by a tool — never show them in the form
    fields: ['kunde', 'projektart', 'projektstart_jahr', 'projektstart_monat', 'ansprechpartner_kunde', 'projektleitung'],
  });

  const submit = useJourneySubmit(servicePort, [
    {
      key: 'projekt',
      entity: 'projekte',
      form: f,
      primary: true,
      values: {
        projektstatus: 'akquise',
      },
    },
  ], { draftKey: 'projekt-anlegen' });

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[f]}
      draftKey="projekt-anlegen"
      intro={{
        description: tx('Legt ein neues Projekt an und weist es einem Kunden und einer Projektleitung zu.'),
        needs: [tx('Kundendaten'), tx('Projektart'), tx('Startjahr')],
      }}
    >
      <WizardStep
        label={tx('Kunde')}
        description={tx('Wähle den Kunden, für den dieses Projekt angelegt wird.')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={f.get('kunde') as string}
          onSelect={id => {
            f.set('kunde', id, kunden.labelOf(id));
            setStep(2);
          }}
          create={{ fields: ['kundenname', 'email', 'kundentyp'] }}
          searchPlaceholder={tx('Kunde suchen …')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Projektdaten')}
        description={tx('Projektart, Startjahr und Ansprechpartner beim Kunden angeben.')}
        needs={['kunde']}
      >
        <div className="space-y-4">
          <Bound form={f} name="projektart" />
          <Bound form={f} name="projektstart_jahr" />
          <Bound form={f} name="projektstart_monat" />
          <Bound form={f} name="ansprechpartner_kunde" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => f.validate(['projektart', 'projektstart_jahr'])}
            nextStepLabel={tx('Projektleitung')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Projektleitung')}
        description={tx('Wähle den Berater, der die Projektleitung übernimmt.')}
        needs={['projektart', 'projektstart_jahr']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={f.get('projektleitung') as string}
          onSelect={id => {
            f.set('projektleitung', id, berater.labelOf(id));
            setStep(4);
          }}
          create={false}
          searchPlaceholder={tx('Berater suchen …')}
          emptyText={tx('Kein Berater gefunden. Bitte zuerst einen Berater anlegen.')}
        />
        <div className="mt-4">
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => f.validate(['projektleitung'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[f]}
            submit={submit}
            items={[
              { key: 'projektstatus', label: tx('Projektstatus'), value: tx('Akquise') },
            ]}
            whatHappensNext={tx('Das Projekt wird mit Status „Akquise" angelegt. Projektkennung und Projektnummer vergibt das System.')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          whatHappensNext={tx('Das Projekt ist angelegt. Als nächstes kannst du ein Angebot erstellen oder Zeit erfassen.')}
          next={[
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
