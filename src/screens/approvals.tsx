import { useState } from "react";
import {
  AppShell,
  ApprovalQueue,
  AuditLog,
  DocumentViewer,
  useActivity,
  useDemo,
  useDemoState,
  type ApprovalItem,
} from "@kit";
import { BRAND, NAV, PERSONA } from "../nav";
import {
  REQUESTS,
  effectiveExceptionReason,
  effectiveStatus,
  usd,
  type RecordsRequest,
  type RequestOverrides,
} from "../seed";
import { useScrollTop } from "./_shared";

function fullDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Approvals() {
  const { logAction } = useActivity();
  const { completed } = useDemo();
  const [overrides, setOverrides] = useDemoState<RequestOverrides>("requestOverrides", {});
  const [held, setHeld] = useState<string | null>(null);
  useScrollTop();

  const attached = Boolean(overrides["5208"]?.attached) || completed.has("attach-corrected-authorization");

  function openReason(r: RecordsRequest): string {
    if (r.request_id === "5208" && attached) return "";
    return effectiveExceptionReason(r, overrides[r.request_id]);
  }

  // Only packets whose exception is cleared reach the approval buttons. The
  // edge case stays on Exceptions until the corrected authorization is
  // attached and it is moved here by the specialist.
  const queue: RecordsRequest[] = REQUESTS.filter((r) => {
    if (effectiveStatus(r, overrides[r.request_id]) !== "in release review") return false;
    if (openReason(r)) return false;
    return true;
  });

  // Every packet's own card carries what Tessa has to check: the chart, the
  // date range and record types, the page count, the itemized bill and the
  // balance. No packet is approved on its title alone.
  const items: ApprovalItem[] = queue.map((r) => {
    const detail = [
      `Chart ${r.mrn}.`,
      `Date range ${r.date_range_requested}.`,
      `Record types: ${r.request_type}.`,
      `${r.pages_count} pages.`,
      `Itemized bill ${usd(r.billed_total)} from the ledger.`,
      `Payments ${usd(r.payments_posted)}.`,
      `Balance ${usd(r.balance_due)}.`,
      `Firm due ${fullDate(r.due_date)}.`,
    ].join(" ");
    return {
      id: r.request_id,
      title: `Request ${r.request_id}: ${r.patient_name}`,
      subtitle:
        r.request_id === "5208" && attached
          ? `Corrected authorization attached, birth date matches chart ${r.mrn}. ${detail}`
          : detail,
      edgeCase: r.request_id === "5208",
    };
  });

  const heldRequests = REQUESTS.filter(
    (r) =>
      effectiveStatus(r, overrides[r.request_id]) === "exception" &&
      r.request_id !== "5208" &&
      Boolean(effectiveExceptionReason(r, overrides[r.request_id]))
  );

  function approve(item: ApprovalItem) {
    const r = REQUESTS.find((x) => x.request_id === item.id);
    if (r && openReason(r)) {
      setHeld(`Request ${r.request_id} is still held: ${openReason(r)}. Clear it on Exceptions first.`);
      return;
    }
    setHeld(null);
    setOverrides((prev) => ({
      ...prev,
      [item.id]: {
        ...prev[item.id],
        released: true,
        releasedAt: new Date().toISOString(),
        sentBack: false,
        sentBackReason: undefined,
      },
    }));
    logAction("Records packet released to the requesting firm", "approve-release");
  }

  function sendBack(item: ApprovalItem) {
    setHeld(null);
    setOverrides((prev) => ({
      ...prev,
      [item.id]: {
        ...prev[item.id],
        sentBack: true,
        sentBackAt: new Date().toISOString(),
        sentBackReason: "Sent back from release review",
      },
    }));
    logAction("Request sent back to exceptions", "send-back-to-exceptions");
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
      <div className="max-w-3xl">
        <h1 className="text-3xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
          Release review
        </h1>
        <p className="mt-2 text-[var(--pf-muted)]">
          Records packets waiting for the specialist&apos;s approval before they are released to the requesting firm.
          Each card shows the chart, the date range and record types, the page count, the itemized bill and the balance
          from the ledger. No packet goes out without Tessa&apos;s click, and a packet with an open exception stays on
          Exceptions until it is cleared.
        </p>
      </div>

      {held && (
        <p className="mt-4 max-w-3xl rounded-lg bg-[var(--pf-accent)] px-4 py-3 text-sm text-[var(--pf-ink)]">
          {held}
        </p>
      )}

      <div className="mt-6">
        {items.length > 0 ? (
          <ApprovalQueue
            items={items}
            primaryLabel="Approve and release packet"
            secondaryLabel="Send back to exceptions"
            onPrimary={approve}
            onSecondary={sendBack}
            dataTour="approval-queue"
            primaryActionId="approve-release"
            secondaryActionId="send-back-to-exceptions"
          />
        ) : (
          <p className="rounded-xl border border-[var(--pf-muted)]/20 p-4 text-sm text-[var(--pf-muted)]">
            No packets are waiting for release review. A packet appears here after its exception is cleared on
            Exceptions and the specialist moves it over.
          </p>
        )}
      </div>

      {heldRequests.length > 0 && (
        <p className="mt-4 max-w-3xl text-xs text-[var(--pf-muted)]">
          {heldRequests.length} request{heldRequests.length === 1 ? " has" : "s have"} an open exception and{" "}
          {heldRequests.length === 1 ? "is" : "are"} held on Exceptions, so{" "}
          {heldRequests.length === 1 ? "it cannot" : "they cannot"} be approved here until the exception is cleared.
        </p>
      )}

      <section className="mt-8 max-w-3xl">
        <h2 className="text-sm font-medium">What Tessa checks before any packet is released</h2>
        <div className="mt-3">
          <DocumentViewer
            title="Release review checklist"
            lines={[
              "The chart the packet was pulled from matches the patient named in the request.",
              "The authorization's date range and record types cover everything in the packet.",
              "The page count matches the pages listed for the request.",
              "The itemized bill and the final balance come from the practice billing ledger, not a typed figure.",
              "The packet is addressed to the requesting law firm, then released only on Tessa's click.",
            ]}
          />
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
