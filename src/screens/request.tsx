import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AppShell,
  AuditLog,
  DocumentViewer,
  Masked,
  StatusPill,
  Timeline,
  useActivity,
  useDemo,
  useDemoState,
  type TimelineEntry,
} from "@kit";
import { BRAND, NAV, PERSONA } from "../nav";
import {
  REQUESTS,
  SAME_NAME_CHARTS,
  effectiveAuthorizationStatus,
  effectiveExceptionReason,
  effectiveStatus,
  eventsForRequest,
  ledgerForRequest,
  usd,
  type RequestOverrides,
} from "../seed";
import { useScrollTop } from "./_shared";

function fullDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function fullStamp(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const TONE: Record<string, "primary" | "accent" | "muted"> = {
  released: "primary",
  "in release review": "accent",
  exception: "accent",
  "in progress": "muted",
  received: "muted",
};

export default function RequestDetail() {
  const [params] = useSearchParams();
  const requestedId = params.get("case") ?? "5208";
  const request = REQUESTS.find((r) => r.request_id === requestedId) ?? REQUESTS[0];
  const { logAction } = useActivity();
  const { completed } = useDemo();
  const [overrides] = useDemoState<RequestOverrides>("requestOverrides", {});
  const [notes, setNotes] = useDemoState<Record<string, TimelineEntry[]>>("requestNotes", {});
  const [noteText, setNoteText] = useState("");
  useScrollTop();

  const override = overrides[request.request_id];
  const status = effectiveStatus(request, override);
  const attached =
    request.request_id === "5208" &&
    (Boolean(override?.attached) || completed.has("attach-corrected-authorization"));
  const authorizationStatus = effectiveAuthorizationStatus(request, override, attached);
  const ledger = ledgerForRequest(request.request_id);
  const sameName = SAME_NAME_CHARTS[request.request_id];
  const billingLead = "Joaquin Reyes (PI billing lead)";
  const formDob = attached ? request.chart_dob : request.authorization_dob;

  const baseEntries: TimelineEntry[] = eventsForRequest(request.request_id).map((e) => ({
    id: e.id,
    timestamp: e.timestamp.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    author: e.author,
    text: e.event_text,
  }));

  // The visitor's own steps on this request, kept so the history still shows
  // them after a reload.
  const derivedEntries: (TimelineEntry & { at: number })[] = [];
  if (attached) {
    derivedEntries.push({
      id: `${request.request_id}-attached`,
      at: override?.attachedAt ? new Date(override.attachedAt).getTime() : Date.now(),
      timestamp: fullStamp(override?.attachedAt),
      author: PERSONA.name,
      text: `Corrected authorization attached, birth date matches ${request.mrn}.`,
    });
  }
  if (override?.movedToReview || override?.movedAt) {
    derivedEntries.push({
      id: `${request.request_id}-moved`,
      at: override.movedAt ? new Date(override.movedAt).getTime() : Date.now(),
      timestamp: fullStamp(override.movedAt),
      author: PERSONA.name,
      text: "Moved to release review.",
    });
  }
  if (override?.sentBack) {
    derivedEntries.push({
      id: `${request.request_id}-sent-back`,
      at: override.sentBackAt ? new Date(override.sentBackAt).getTime() : Date.now(),
      timestamp: fullStamp(override.sentBackAt),
      author: PERSONA.name,
      text: `Sent back to exceptions: ${effectiveExceptionReason(request, override)}.`,
    });
  }
  if (override?.released) {
    derivedEntries.push({
      id: `${request.request_id}-released`,
      at: override.releasedAt ? new Date(override.releasedAt).getTime() : Date.now(),
      timestamp: fullStamp(override.releasedAt),
      author: PERSONA.name,
      text: `Packet released to ${request.requesting_firm}.`,
    });
  }
  derivedEntries.sort((a, b) => a.at - b.at);

  const entries = [
    ...baseEntries,
    ...derivedEntries.map(({ at: _at, ...entry }) => entry),
    ...(notes[request.request_id] ?? []),
  ];

  function appendNote(text: string) {
    const entry: TimelineEntry = {
      id: `${request.request_id}-note-${Date.now()}`,
      timestamp: new Date().toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      author: PERSONA.name,
      text,
    };
    setNotes((prev) => ({ ...prev, [request.request_id]: [...(prev[request.request_id] ?? []), entry] }));
  }

  return (
    <AppShell
      brandName={BRAND.name}
      brandUrl={BRAND.url}
      brandEmail={BRAND.email}
      personaName={PERSONA.name}
      personaRole={PERSONA.role}
      nav={NAV}
    >
      <div className="max-w-4xl">
        <p className="text-sm text-[var(--pf-muted)]">Records request</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
            Request {request.request_id}
          </h1>
          <StatusPill label={status} tone={TONE[status] ?? "muted"} />
        </div>
        <p className="mt-2 text-[var(--pf-muted)]">
          From {request.requesting_firm} for {request.patient_name}. {request.request_type} requested on{" "}
          {fullDate(request.received_date)} through the {request.received_via.toLowerCase()}.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4">
          <p className="text-xs text-[var(--pf-muted)]">Firm due date</p>
          <p className="mt-1 font-medium">{fullDate(request.due_date)}</p>
        </div>
        <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4">
          <p className="text-xs text-[var(--pf-muted)]">Authorization</p>
          <p className="mt-1 font-medium">{authorizationStatus}</p>
        </div>
        <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4">
          <p className="text-xs text-[var(--pf-muted)]">Date range requested</p>
          <p className="mt-1 font-medium">{request.date_range_requested}</p>
        </div>
        <div className="rounded-xl border border-[var(--pf-muted)]/20 p-4">
          <p className="text-xs text-[var(--pf-muted)]">Chart pages</p>
          <p className="mt-1 font-medium">
            {request.pages_count} pages
            {request.request_id === "5208" && !attached && (
              <span className="block text-xs font-normal text-[var(--pf-muted)]">Not pulled while the exception is open</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--pf-muted)]/20 p-4">
          <h2 className="text-sm font-medium">Chart match</h2>
          <div className="mt-2 space-y-2 text-sm">
            <p>
              Chart MRN: <Masked field="mrn">{request.mrn}</Masked>
            </p>
            <p>
              Birth date on the chart: <Masked field="chart_dob">{fullDate(request.chart_dob)}</Masked>
            </p>
            <p>Birth date on the authorization: {fullDate(formDob)}</p>
            <p>
              Charts with this name:{" "}
              <Masked field="same_name_charts">
                {request.same_name_charts === 1
                  ? "One patient in the chart index has this name."
                  : `${request.same_name_charts} patients in the chart index have this name.`}
              </Masked>
            </p>
            <p>
              Clinical summary:{" "}
              <Masked field="clinical_summary">
                <span className="text-[var(--pf-muted)]">{request.clinical_summary}</span>
              </Masked>
            </p>
          </div>
          {sameName && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {sameName.map((chart) => {
                const primary = chart.mrn === request.mrn;
                return (
                  <div
                    key={chart.mrn}
                    className={`rounded-lg border p-3 text-sm ${
                      attached && primary ? "border-[var(--pf-primary)]" : "border-[var(--pf-accent)]"
                    }`}
                  >
                    <p>
                      Chart: <Masked field="mrn">{chart.mrn}</Masked>
                    </p>
                    <p>
                      Birth date: <Masked field="chart_dob">{fullDate(chart.dob)}</Masked>
                    </p>
                    <p className="mt-1 text-xs text-[var(--pf-muted)]">
                      {attached
                        ? primary
                          ? "Matches the corrected authorization."
                          : "Not this patient. The corrected authorization matches DEMO-204417."
                        : chart.note}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <DocumentViewer
          title={attached ? "Corrected authorization on file" : "Signed authorization on file"}
          field="chart_dob"
          lines={[
            `Patient: ${request.patient_name}`,
            `Date of birth listed: ${fullDate(formDob)}`,
            `Requesting firm: ${request.requesting_firm}`,
            `Records allowed: ${request.request_type}`,
            `Date range: ${request.date_range_requested}`,
            attached
              ? `Signature: corrected form signed by the patient and matches chart ${request.mrn}`
              : request.request_id === "5208"
                ? "Signature: signed by the patient, but the birth date does not match either chart"
                : "Signature: signed by the patient and in date range",
          ]}
        />
      </div>

      <section className="mt-8 rounded-xl border border-[var(--pf-muted)]/20 p-4">
        <h2 className="text-sm font-medium">Itemized bill and balance from the ledger</h2>

        <div className="mt-3 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-[var(--pf-muted)]/20 text-left text-[var(--pf-muted)]">
                <th className="py-2 pr-3 font-medium">Date of service</th>
                <th className="py-2 pr-3 font-medium">Service</th>
                <th className="py-2 pr-3 font-medium">Charge</th>
                <th className="py-2 pr-3 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((line) => (
                <tr key={line.id} className="border-b border-[var(--pf-muted)]/10">
                  <td className="py-2 pr-3">{fullDate(line.date_of_service)}</td>
                  <td className="py-2 pr-3">
                    {line.service_label}
                    <span className="block text-xs text-[var(--pf-muted)]">
                      CPT {line.cpt_code}, {line.payer_type}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{usd(line.charge)}</td>
                  <td className="py-2 pr-3">{usd(line.payment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="mt-3 space-y-3 sm:hidden">
          {ledger.map((line) => (
            <li key={line.id} className="rounded-lg border border-[var(--pf-muted)]/20 p-3 text-sm">
              <p className="font-medium">{line.service_label}</p>
              <p className="mt-1 text-xs text-[var(--pf-muted)]">
                CPT {line.cpt_code}, {line.payer_type}
              </p>
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--pf-muted)]">Date of service</dt>
                  <dd>{fullDate(line.date_of_service)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--pf-muted)]">Charge</dt>
                  <dd>{usd(line.charge)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--pf-muted)]">Payment</dt>
                  <dd>{usd(line.payment)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <dl className="mt-3 flex flex-wrap gap-6 text-sm">
          <div>
            <dt className="text-xs text-[var(--pf-muted)]">Billed total</dt>
            <dd className="font-medium">{usd(request.billed_total)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--pf-muted)]">Payments posted</dt>
            <dd className="font-medium">{usd(request.payments_posted)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--pf-muted)]">Balance due</dt>
            <dd className="font-medium">{usd(request.balance_due)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2 className="text-sm font-medium">Request history</h2>
        <div className="mt-3">
          <Timeline entries={entries} dataTour="case-timeline" />
        </div>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2 className="text-sm font-medium">Add to the history</h2>
        <label className="mt-2 block text-sm">
          <span className="text-xs text-[var(--pf-muted)]">Note (optional)</span>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            aria-label="Note text"
            rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--pf-muted)]/30 bg-[var(--pf-surface)] p-2 text-sm"
            placeholder="What did you check or ask for?"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            data-action="add-request-note"
            onClick={() => {
              const text = noteText.trim() || "Note added by Tessa Brannigan";
              appendNote(text);
              setNoteText("");
              logAction("Note added to the request", "add-request-note");
            }}
            className="rounded-lg bg-[var(--pf-primary)] px-3 py-1.5 text-sm font-medium text-[var(--pf-surface)]"
          >
            Add note
          </button>
          <button
            type="button"
            data-action="ask-billing-balance"
            onClick={() => {
              appendNote(
                `Balance check sent to ${billingLead}. Ledger balance beside it: ${usd(request.balance_due)}.`
              );
              logAction("Balance check sent to PI billing", "ask-billing-balance");
            }}
            className="rounded-lg border border-[var(--pf-muted)]/30 px-3 py-1.5 text-sm"
          >
            Ask billing to confirm balance
          </button>
        </div>
      </section>

      <section className="mt-8 max-w-3xl">
        <h2 className="text-sm font-medium">Actions taken in this demo</h2>
        <div className="mt-2">
          <AuditLog />
        </div>
      </section>
    </AppShell>
  );
}
