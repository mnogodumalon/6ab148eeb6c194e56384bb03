/**
 * Projekt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Kunden wählen → 2) Projektart und Start → 3) Projektleitung wählen → 4) Ansprechpartner eintragen → Prüfen & anlegen.
 * Reads: kunden, berater. Writes: projekte (via useProjektAnlegenFlow; Status „Akquise“ fix, Kennung berechnet).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText } from '@/lib/journey';
import { useProjektAnlegenFlow } from '@/lib/journey/flows/ProjektAnlegen';
import { tx } from '@/i18n';

const KUERZEL: Record<string, string> = {
  it_beratung: 'IT',
  entwicklung: 'EN',
  schulung: 'SC',
  konzeption: 'KO',
  support: 'SU',
  sonstiges: 'SO',
};

export default function ProjektAnlegenPage() {
  const [step, setStep] = useState(1);
  const flow = useProjektAnlegenFlow({
    steps: {
      kunde: 1,
      projektart: 2,
      projektstart_monat: 2,
      projektstart_jahr: 2,
      projektleitung: 3,
      ansprechpartner_kunde: 4,
      letzter_schritt: 4,
    },
    items: {
      kunde: k => ({
        id: k.id,
        title: fieldText(k, 'kundenname'),
        subtitle: [fieldText(k, 'kundentyp'), fieldText(k, 'ort')].filter(Boolean).join(' · '),
      }),
      projektleitung: b => ({
        id: b.id,
        title: `${fieldText(b, 'vorname')} ${fieldText(b, 'nachname')}`.trim(),
      }),
    },
    compute: {
      // Startjahr + Kürzel der Projektart; die laufende Nummer vergibt das System separat.
      projektkennung: forms => {
        const jahr = String(forms.projekte.get('projektstart_jahr') ?? '');
        const art = String(forms.projekte.get('projektart') ?? '');
        const kuerzel = KUERZEL[art] ?? '';
        return [jahr, kuerzel].filter(Boolean).join('-');
      },
    },
  });
  const f = flow.forms.projekte;

  return (
    <IntentWizardShell
      title={tx('Projekt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Ein neues Projekt für einen Kunden mit Art, Start und Projektleitung anlegen.'),
        needs: [tx('Kunde'), tx('Projektart und Startjahr'), tx('Projektleitung')],
      }}
    >
      <WizardStep label={tx('Kunde')} description={tx('Für welchen Kunden ist das Projekt?')}>
        <EntitySelectStep
          {...flow.picks.kunde.select}
          {...flow.pick('kunde')}
          searchPlaceholder={tx('Kundenname suchen …')}
        />
      </WizardStep>

      <WizardStep label={tx('Art und Start')} description={tx('Projektart und Startmonat/-jahr festlegen.')}>
        <div className="space-y-4">
          <Bound form={f} name="projektart" />
          <Bound form={f} name="projektstart_monat" />
          <Bound form={f} name="projektstart_jahr" hint={tx('z. B. 2026')} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => f.validate(['projektart', 'projektstart_monat', 'projektstart_jahr'])}
            nextStepLabel={tx('Projektleitung')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Projektleitung')} description={tx('Wer leitet das Projekt?')}>
        <EntitySelectStep
          {...flow.picks.projektleitung.select}
          {...flow.pick('projektleitung')}
          avatar="initials"
          searchPlaceholder={tx('Berater suchen …')}
        />
      </WizardStep>

      <WizardStep label={tx('Ansprechpartner')} description={tx('Wer ist beim Kunden zuständig und wie ist der Stand?')}>
        <div className="space-y-4">
          <Bound form={f} name="ansprechpartner_kunde" />
          <Bound form={f} name="letzter_schritt" rows={3} />
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
            items={[{ key: 'projektstatus', label: tx('Projektstatus'), value: tx('Akquise') }]}
            whatHappensNext={tx('Das Projekt startet in der Akquise; die Projektnummer vergibt das System.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Angebot erstellen'), href: '#/intents/angebot-erstellen' },
            { label: tx('Stunden erfassen'), href: '#/intents/zeit-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
