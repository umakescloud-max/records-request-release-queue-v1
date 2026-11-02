import { AppShell, SavingsCalculator } from "@kit";
import { BRAND, NAV, PERSONA } from "../nav";
import { useScrollTop } from "./_shared";

// Costs: what this work costs with people today versus with the tool. SavingsCalculator reads the brief's costs.
export default function Costs() {
  useScrollTop();
  return (
    <AppShell
      brandName={BRAND.name}
      brandUrl={BRAND.url}
      brandEmail={BRAND.email}
      personaName={PERSONA.name}
      personaRole={PERSONA.role}
      nav={NAV}
    >
      <h1 className="text-3xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
        What this work costs today
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--pf-muted)]">
        Put in your own request volume, minutes and staff rate. Nothing you type leaves this page.
      </p>
      <div className="mt-6">
        <SavingsCalculator />
      </div>
    </AppShell>
  );
}
