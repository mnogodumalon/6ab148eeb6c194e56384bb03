/**
 * Projekt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Kunde wählen → 2) Projektdetails (Art, Status, Start) → 3) Ansprechpartner & Projektleitung → 4) Prüfen & anlegen.
 * Reads: kunden (kundenname, kundentyp), berater (vorname, nachname, status).
 * Writes: projekte (createProjekteEntry) — projektstatus wird automatisch auf 'akquise' gesetzt.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useProjektAnlegenFlow } from '@/lib/journey/flows/ProjektAnlegen';
import { tx } from '@/i18n';

export default function ProjektAnlegenPage() {
  const [step, setStep] = useState(1);

  const flow = useProjektAnlegenFlow({
    steps: {
      kunde: 1,
      projektart: 2,
      projektstart_monat: 2,
      projektstart_jahr: 2,
      ansprechpartner_kunde: 3,
      projektleitung: 3,
      letzter_schritt: 3,
    },
    items: {
      kunde: r => ({
        id: r.id,
        title: fieldText(r, 'kundenname'),
        subtitle: fieldLookup(r, 'kundentyp')?.label,
      }),
      projektleitung: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: fieldLookup(r, 'status')?.label,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Neues Projekt anlegen und Kunde, Art und Projektleitung festlegen.'),
        needs: [tx('Kunde aus der Kundenliste'), tx('Projektart und Startdatum'), tx('Ansprechpartner und Berater als Projektleitung')],
      }}
    >
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird dieses Projekt angelegt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder Firmenname …')}
          avatar="none"
          create={{ fields: ['kundenname', 'kundentyp', 'email'] }}
        />
      </WizardStep>

      <WizardStep
        label={tx('Projektdetails')}
        description={tx('Projektart und Startdatum festlegen.')}
        needs={['kunde']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.projekte} name="projektart" />
          <Bound form={flow.forms.projekte} name="projektstart_monat" />
          <Bound form={flow.forms.projekte} name="projektstart_jahr" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Ansprechpartner')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Ansprechpartner')}
        description={tx('Ansprechpartner beim Kunden und Projektleitung (Berater) auswählen.')}
        needs={['projektart']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.projekte} name="ansprechpartner_kunde" hint={tx('Name der Ansprechperson beim Kunden')} />
          <div className="pt-2">
            <EntitySelectStep
              {...flow.picks.projektleitung.select}
              {...flow.pick('projektleitung')}
              searchPlaceholder={tx('Berater suchen …')}
              avatar="initials"
              create={false}
            />
          </div>
          <Bound form={flow.forms.projekte} name="letzter_schritt" rows={3} hint={tx('Optional: aktueller Stand oder erster Schritt')} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'projektstatus', label: tx('Projektstatus'), value: tx('Akquise') },
            ]}
            whatHappensNext={tx('Projektkennung und Projektnummer werden automatisch vergeben.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Das Projekt ist jetzt in der Kundenliste verfügbar.')}
          next={[
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Stunden buchen'), href: '#/intents/stunden-buchen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
