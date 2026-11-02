import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppShell,
  OneClickLogin,
  StoryPanel,
  TaskList,
  TourRunner,
  startTour,
  useActivity,
} from "@kit";
import { BRAND, NAV, PERSONA, PRACTICE } from "../nav";
import tour from "../tour.json";
import { useScrollTop } from "./_shared";

const LOGIN_KEY = "pf-login-records-request-release-queue-v1";
const TOUR_KEY = "pf-tour-records-request-release-queue-v1";

const BEFORE =
  "Tuesday, 7:45am. Tessa logs into four portals and the fax inbox and works 9 new requests one by one. At 11:20 she reaches request 5208 from Fenwright & Sallow Injury Law for Andre Salcedo. The chart index shows two patients with that name, and the birth date on the authorization matches neither: the day and month are swapped. She almost pulls the wrong chart, emails the firm and leaves a sticky note. The firm's due date is Thursday. On Friday a paralegal calls asking where the records are.";

const AFTER =
  "Tuesday, 7:45am. Tessa opens the request desk. All 9 overnight requests are matched to a chart, and 7 already have their authorization checked and are waiting for release review. Request 5208 sits at the top of Exceptions, flagged for an authorization birth date that matches no chart, with both same-name charts shown and the days left before the firm's due date. The firm sent a corrected authorization at 8:05. She attaches it, moves the request to release review, checks the pages, date range, itemized bill and balance, and approves the release. The firm gets the packet that morning.";

function hasLogin(): boolean {
  try {
    return window.localStorage.getItem(LOGIN_KEY) === "1";
  } catch {
    return false;
  }
}

export default function Story() {
  const [loggedIn, setLoggedIn] = useState(hasLogin);
  const navigate = useNavigate();
  const { logAction } = useActivity();
  useScrollTop();

  if (!loggedIn) {
    return (
      <OneClickLogin
        personaName={PERSONA.name}
        personaRole={PERSONA.role}
        practiceName={PRACTICE.name}
        onLogin={() => {
          try {
            window.localStorage.setItem(LOGIN_KEY, "1");
          } catch {
            // Private browsing: the demo still opens for this visit.
          }
          setLoggedIn(true);
        }}
      />
    );
  }

  const startFullTour = () => {
    logAction("Tour started", "take-full-tour");
    startTour(tour, navigate);
  };

  return (
    <AppShell
      brandName={BRAND.name}
      brandUrl={BRAND.url}
      brandEmail={BRAND.email}
      personaName={PERSONA.name}
      personaRole={PERSONA.role}
      nav={NAV}
    >
      <div className="max-w-3xl">
        <h1 className="text-3xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
          Records request and release desk
        </h1>
        <p className="mt-3 text-[var(--pf-muted)]">
          Tessa Brannigan is the medical records specialist at Larkfield Injury &amp; Spine Group, an injury-first
          multi-specialty practice paid mostly through PIP, letters of protection and workers&apos; comp.
        </p>
      </div>

      <section className="mt-8 max-w-3xl">
        <h2 className="text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>
          Try these three tasks
        </h2>
        <div className="mt-4">
          <TaskList tour={tour} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="max-w-3xl text-lg" style={{ fontFamily: "var(--pf-font-heading)" }}>
          Why this exists
        </h2>
        <div className="mt-4">
          {/*
            StoryPanel is a fixed kit component: it renders its own before/after
            cards and its own tour button. The page keeps a single tour control
            ("Take the full tour" below) and its own collapsible before/after, so
            those two pieces of the kit panel are hidden here.
          */}
          <div className="[&_button]:hidden [&_div.grid]:hidden">
            <StoryPanel
              practiceName={PRACTICE.name}
              practiceType={PRACTICE.type}
              personaName={PERSONA.name}
              dayInTheLife="Tessa starts at 7:45am with 23 open records requests, 9 of them new overnight, spread across four retrieval portals, the fax inbox and email. For each one she finds the patient in the chart index by name and birth date, reads the authorization for a signature, expiry and date range, pulls the visit notes and imaging reports, and asks Joaquin in billing for an itemized bill and final balance. Between requests she takes 6 to 10 calls a day from paralegals asking whether their records went out."
              painPoints={[
                "No single list of open requests across portals, fax and email, so due dates are tracked on sticky notes",
                "Authorization problems such as a wrong birth date, an expired form or a missing signature are found halfway through pulling the chart",
                "Balances sent to firms are typed in by hand and sometimes miss the latest visits or payments",
                "Paralegals call to ask for status because nobody tells them when a packet is released",
              ]}
              costOfPain="About 32 minutes per request at 70 requests a week is roughly 37 specialist hours a week. A late packet holds up the firm's settlement demand on a balance that averages about $9,000, and one packet released from the wrong chart is a reportable privacy breach."
              before={BEFORE}
              after={AFTER}
              onStartTour={startFullTour}
            />
          </div>
          <details open className="mx-auto mt-6 max-w-3xl rounded-xl border border-[var(--pf-muted)]/20 p-4">
            <summary className="cursor-pointer text-sm font-medium">Before this desk, and after</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4">
                <h3 className="text-sm font-medium text-[var(--pf-muted)]">Before</h3>
                <p className="mt-2 text-sm">{BEFORE}</p>
              </div>
              <div className="rounded-xl border border-[var(--pf-primary)]/30 bg-[var(--pf-primary)]/5 p-4">
                <h3 className="text-sm font-medium text-[var(--pf-primary)]">After</h3>
                <p className="mt-2 text-sm">{AFTER}</p>
              </div>
            </div>
          </details>
        </div>
      </section>

      <div className="mt-8">
        <button
          type="button"
          onClick={startFullTour}
          data-action="take-full-tour"
          className="rounded-lg bg-[var(--pf-primary)] px-4 py-2 text-sm font-medium text-[var(--pf-surface)]"
        >
          Take the full tour
        </button>
      </div>

      <TourRunner steps={tour} storageKey={TOUR_KEY} />
    </AppShell>
  );
}
