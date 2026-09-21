/**
 * Projekt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Kunden wählen → 2) Projektdaten eingeben → 3) Projektleitung wählen → 4) Prüfen & anlegen.
 * Reads: kunden, berater. Writes: projekte (port.create via useJourneySubmit).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
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
    searchFields: ['kundenname', 'email', 'ort'],
    toItem: k => ({
      id: k.id,
      title: fieldText(k, 'kundenname'),
      subtitle: [fieldText(k, 'ort'), fieldText(k, 'email')].filter(Boolean).join(' · '),
    }),
    orderby: ['r.v_kundenname asc'],
  });

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

  const [step, setStep] = useState(1);

  const projekt = useStepForm('projekte', {
    steps: {
      kunde: 1,
      projektart: 2,
      projektstart_monat: 2,
      projektstart_jahr: 2,
      ansprechpartner_kunde: 2,
      letzter_schritt: 2,
      projektleitung: 3,
    },
    required: {
      projektkennung: false,
      projektnummer: false,
      letzter_schritt: false,
      ansprechpartner_kunde: false,
      projektstart_monat: false,
      projektstart_jahr: false,
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

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[projekt]}
      draftKey="projekt-anlegen"
      intro={{
        description: tx('Neues Projekt für einen bestehenden Kunden anlegen und eine Projektleitung zuweisen.'),
        needs: [tx('Bestehender Kunde'), tx('Projektart und geplanter Start')],
      }}
    >
      <WizardStep
        label={tx('Kunde')}
        description={tx('Wähle den Kunden, für den dieses Projekt angelegt wird.')}
      >
        <EntitySelectStep
          {...kunden.select}
          selectedId={projekt.get('kunde') as string}
          onSelect={id => {
            projekt.set('kunde', id, kunden.labelOf(id));
            setStep(2);
          }}
          searchPlaceholder={tx('Kunden suchen …')}
          avatar="initials"
          create={{ fields: ['kundenname', 'email', 'ort', 'strasse'] }}
          createLabel={tx('Neuen Kunden anlegen')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Projektdaten')}
        description={tx('Projektart, Startmonat und Ansprechpartner beim Kunden angeben.')}
        needs={['kunde']}
      >
        <div className="space-y-5">
          <Bound form={projekt} name="projektart" />
          <Bound form={projekt} name="projektstart_monat" />
          <Bound form={projekt} name="projektstart_jahr" />
          <Bound form={projekt} name="ansprechpartner_kunde" />
          <Bound form={projekt} name="letzter_schritt" rows={3} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => projekt.validate(['projektart'])}
            nextStepLabel={tx('Projektleitung')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Projektleitung')}
        description={tx('Wähle den Berater, der dieses Projekt leiten wird.')}
        needs={['projektart']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={projekt.get('projektleitung') as string}
          onSelect={id => {
            projekt.set('projektleitung', id, berater.labelOf(id));
            setStep(4);
          }}
          searchPlaceholder={tx('Berater suchen …')}
          avatar="initials"
          emptyText={tx('Alle aktiven Berater wurden gefunden. Kein passender Berater verfügbar.')}
          create={false}
        />
        <div className="mt-4">
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

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
            whatHappensNext={tx('Das Projekt wird angelegt. Projektnummer und Projektkennung vergibt das System automatisch.')}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[projekt]}
          submit={submit}
          whatHappensNext={tx('Im nächsten Schritt kannst du ein Angebot für dieses Projekt erstellen.')}
          next={[
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
