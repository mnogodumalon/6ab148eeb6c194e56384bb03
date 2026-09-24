/**
 * Projekt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Kunde wählen → 2) Projektart, Startmonat, Startjahr eingeben
 *        → 3) Projektleitung (Berater) wählen → 4) Ansprechpartner & letzter Stand → 5) Prüfen & anlegen.
 * Reads: kunden (kundenname, kundentyp, email), berater (vorname, nachname, status).
 * Writes: projekte (createProjekteEntry) — setzt projektstatus='akquise' automatisch.
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
      projektkennung: 2,
      projektleitung: 3,
      ansprechpartner_kunde: 4,
      letzter_schritt: 4,
    },
    items: {
      kunde: r => ({
        id: r.id,
        title: fieldText(r, 'kundenname'),
        subtitle: fieldText(r, 'email'),
        status: fieldLookup(r, 'kundentyp') ?? undefined,
      }),
      projektleitung: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        status: fieldLookup(r, 'status') ?? undefined,
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
        description: tx('Neues Projekt erfassen — die Projektkennung wird vom System vergeben.'),
        needs: [tx('Kunde'), tx('Projektart'), tx('Projektleitung')],
      }}
    >
      <WizardStep
        label={tx('Kunde')}
        description={tx('Für welchen Kunden wird das Projekt angelegt?')}
      >
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Name oder E-Mail …')}
          avatar="none"
          columns={2}
        />
      </WizardStep>

      <WizardStep
        label={tx('Projektdaten')}
        description={tx('Projektart, Starttermin und die vorläufige Projektkennung eingeben.')}
        needs={['kunde']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.projekte} name="projektart" />
          <Bound form={flow.forms.projekte} name="projektstart_monat" />
          <Bound form={flow.forms.projekte} name="projektstart_jahr" hint={tx('Vierstellige Jahreszahl, z. B. 2025')} />
          <Bound form={flow.forms.projekte} name="projektkennung" hint={tx('Wird vom System automatisch gesetzt — du kannst hier einen Vorschlag eintragen.')} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Projektleitung')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Projektleitung')}
        description={tx('Welcher Berater leitet dieses Projekt?')}
        needs={['projektart']}
      >
        <EntitySelectStep
          {...flow.picks.projektleitung.select}
          {...flow.pick('projektleitung')}
          searchPlaceholder={tx('Name …')}
          avatar="initials"
        />
      </WizardStep>

      <WizardStep
        label={tx('Ansprechpartner & Stand')}
        description={tx('Ansprechpartner beim Kunden und aktuellen Stand erfassen.')}
        needs={['projektleitung']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.projekte} name="ansprechpartner_kunde" hint={tx('Name der Ansprechperson beim Kunden')} />
          <Bound form={flow.forms.projekte} name="letzter_schritt" rows={3} hint={tx('Kurze Notiz zum aktuellen Stand oder nächsten Schritt')} />
          <StepNav
            onBack={() => setStep(3)}
            onNext={() => flow.validateStep(4)}
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
            whatHappensNext={tx('Die Projektkennung wird nach dem Anlegen automatisch vom System gesetzt.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          whatHappensNext={tx('Erstelle jetzt ein Angebot oder erfasse Stunden für dieses Projekt.')}
          next={[
            { label: tx('Angebot anlegen'), href: '#/intents/angebot-anlegen' },
            { label: tx('Stunden erfassen'), href: '#/intents/stunden-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
