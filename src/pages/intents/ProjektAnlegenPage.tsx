/**
 * Projekt anlegen — 6-Schritt-Wizard.
 * Steps: 1) Kunden auswählen → 2) Projektart wählen → 3) Projektstart (Jahr + Monat) →
 *        4) Projektleitung aus Beratern wählen → 5) Ansprechpartner beim Kunden → 6) Prüfen & anlegen.
 * Reads: kunden (alle), berater (nur status='aktiv').
 * Writes: projekte (createProjekteEntry).
 * Composes: IntentWizardShell, WizardStep, EntitySelectStep, ChoiceGroup, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { ChoiceGroup } from '@/components/blocks/ChoiceGroup';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
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
    filter: "r.v_status == 'aktiv'",
    where: r => fieldLookup(r, 'status')?.key === 'aktiv',
    searchFields: ['vorname', 'nachname'],
    toItem: b => ({
      id: b.id,
      title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      subtitle: fieldLookup(b, 'status')?.label,
    }),
  });

  const projekt = useStepForm('projekte', {
    fields: [
      'kunde',
      'projektart',
      'projektstart_jahr',
      'projektstart_monat',
      'projektleitung',
      'ansprechpartner_kunde',
      'letzter_schritt',
    ],
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
      projektart: true,
      projektstart_jahr: true,
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
    { draftKey: 'projekt-anlegen' },
  );

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      subtitle={tx('Neues Projekt für einen Kunden erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={[projekt]}
      draftKey="projekt-anlegen"
      intro={{
        description: tx('Legt ein neues Projekt an — Projektnummer und -kennung werden automatisch vergeben.'),
        needs: [tx('Kundendaten'), tx('Projektart'), tx('Startjahr')],
      }}
    >
      {/* Schritt 1: Kunden auswählen */}
      <WizardStep
        label={tx('Kunde')}
        heading={tx('Kunden auswählen')}
        description={tx('Für welchen Kunden wird das Projekt angelegt?')}
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

      {/* Schritt 2: Projektart wählen */}
      <WizardStep
        label={tx('Projektart')}
        heading={tx('Projektart wählen')}
        description={tx('Um welche Art von Projekt handelt es sich?')}
        needs={['kunde']}
      >
        <div className="space-y-6">
          <Field form={projekt} name="projektart">
            <ChoiceGroup {...projekt.choice('projektart')} />
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
        description={tx('In welchem Jahr und Monat startet das Projekt?')}
        needs={['projektart']}
      >
        <div className="space-y-4">
          <Field form={projekt} name="projektstart_jahr" hint={tx('z. B. 2026')}>
            <Input {...projekt.number('projektstart_jahr')} />
          </Field>
          <Field form={projekt} name="projektstart_monat">
            <ChoiceGroup {...projekt.choice('projektstart_monat')} allowClear />
          </Field>
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
        heading={tx('Projektleitung wählen')}
        description={tx('Wähle einen aktiven Berater als Projektleitung.')}
        needs={['projektstart_jahr']}
      >
        <EntitySelectStep
          {...berater.select}
          selectedId={projekt.get('projektleitung') as string}
          onSelect={id => {
            projekt.set('projektleitung', id, berater.labelOf(id));
            setStep(5);
          }}
          emptyText={tx('Keine aktiven Berater gefunden.')}
          create={false}
          avatar="initials"
        />
      </WizardStep>

      {/* Schritt 5: Ansprechpartner beim Kunden */}
      <WizardStep
        label={tx('Ansprechpartner')}
        description={tx('Wer ist beim Kunden die Ansprechperson für dieses Projekt?')}
        needs={['projektleitung']}
      >
        <div className="space-y-4">
          <Bound
            form={projekt}
            name="ansprechpartner_kunde"
            hint={tx('Name der Kontaktperson beim Kunden')}
          />
          <StepNav
            onBack={() => setStep(4)}
            onNext={() => true}
            nextStepLabel={tx('Letzter Schritt')}
          />
        </div>
      </WizardStep>

      {/* Schritt 6: Letzter Schritt / Notiz */}
      <WizardStep
        label={tx('Notiz')}
        description={tx('Optionale Notiz zum aktuellen Stand oder nächsten Schritt.')}
      >
        <div className="space-y-4">
          <Bound form={projekt} name="letzter_schritt" rows={4} />
          <StepNav
            onBack={() => setStep(5)}
            onNext={() => projekt.validate(['letzter_schritt'])}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      {/* Schritt 7: Zusammenfassung & Anlegen */}
      <WizardStep label={tx('Prüfen')}>
        {!submit.done && (
          <SummaryStep
            forms={[projekt]}
            submit={submit}
            items={[
              { key: 'projektstatus', label: tx('Projektstatus'), value: tx('Akquise') },
            ]}
            whatHappensNext={tx(
              'Projektnummer und Projektkennung werden automatisch vom System vergeben.',
            )}
          />
        )}
      </WizardStep>

      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[projekt]}
          submit={submit}
          facts={[
            {
              label: tx('Projektkennung'),
              value: String(submit.result.primary.fields.projektkennung ?? '—'),
            },
            {
              label: tx('Projektnummer'),
              value: String(submit.result.primary.fields.projektnummer ?? '—'),
            },
          ]}
          whatHappensNext={tx(
            'Das Projekt ist jetzt angelegt. Als nächstes kannst du ein Angebot erstellen.',
          )}
          next={[
            {
              label: tx('Angebot erstellen'),
              href: '#/intents/angebot-erstellen',
            },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
