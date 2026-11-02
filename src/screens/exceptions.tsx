import { useEffect, useState } from "react";
import {
  AppShell,
  DataTable,
  Masked,
  RecordDrawer,
  SampleDocuments,
  ScenarioBanner,
  StatusPill,
  useActivity,
  useDemo,
  useDemoState,
  type DataTableColumn,
} from "@kit";
import { BRAND, NAV, PERSONA } from "../nav";
import {
  REQUESTS,
  SAME_NAME_CHARTS,
  businessDayCountdown,
  effectiveExceptionReason,
  effectiveReleasedDate,
  effectiveStatus,
  releasedLabel,
  type RecordsRequest,
  type RequestOverrides,
} from "../seed";
import { useScrollTop } from "./_shared";

function fullDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Exceptions() {
  const { logAction } = useActivity();
  const { completed } = useDemo();
  const [overrides, setOverrides] = useDemoState<RequestOverrides>("requestOverrides", {});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useScrollTop();

  const edge = REQUESTS.find((r) => r.request_id === "5208") ?? REQUESTS[0];
  const sampleAttached = completed.has("attach-corrected-authorization");
  const attached = Boolean(overrides["5208"]?.attached) || sampleAttached;

  // Using the sample document is an attach too: stamp the moment so the
  // request history can show when the corrected form arrived.
  useEffect(() => {
    if (!sampleAttached) return;
    setOverrides((prev) => {
      const current = prev["5208"];
      if (current?.attached) return prev;
      return { ...prev, "5208": { ...current, attached: true, attachedAt: new Date().toISOString() } };
    });
  }, [sampleAttached, setOverrides]);

  const rows = REQUESTS.filter((r) => effectiveStatus(r, overrides[r.request_id]) === "exception");
  const selected = rows.find((r) => r.request_id === selectedId) ?? null;

  const edgeStatus = effectiveStatus(edge, overrides[edge.request_id]);
  const edgeReleasedAt = effectiveReleasedDate(edge, overrides[edge.request_id]);

  const columns: DataTableColumn<RecordsRequest>[] = [
    {
      key: "patient_name",
      header: "Patient",
      render: (r) => (
        <span>
          <span className="font-medium">{r.patient_name}</span>
          <span className="block text-xs text-[var(--pf-muted)]">Request {r.request_id}</span>
        </span>
      ),
    },
    { key: "request_id", header: "Request", render: (r) => `#${r.request_id}` },
    { key: "requesting_firm", header: "Law firm", render: (r) => r.requesting_firm },
    {
      key: "exception_reason",
      header: "Why it is held",
      render: (r) => {
        const cleared = r.request_id === "5208" && attached && !overrides[r.request_id]?.sentBack;
        if (cleared) {
          return (
            <span className="text-[var(--pf-muted)]">Corrected authorization attached; ready for release review</span>
          );
        }
        return effectiveExceptionReason(r, overrides[r.request_id]);
      },
    },
    {
      key: "due_date",
      header: "Firm due date",
      render: (r) => {
        const status = effectiveStatus(r, overrides[r.request_id]);
        const releasedAt = effectiveReleasedDate(r, overrides[r.request_id]);
        return (
          <span>
            {fullDate(r.due_date)}
            <span className="block text-xs text-[var(--pf-muted)]">
              {status === "released" ? releasedLabel(releasedAt) : businessDayCountdown(r.due_date)}
            </span>
          </span>
        );
      },
    },
    {
      key: "request_status",
      header: "Status",
      render: (r) => {
        const status = effectiveStatus(r, overrides[r.request_id]);
        if (status === "released") return <StatusPill label="Released" tone="primary" />;
        if (r.request_id === "5208" && attached && !overrides[r.request_id]?.sentBack) {
          return <StatusPill label="Ready for review" tone="primary" />;
        }
        return <StatusPill label="Exception" tone="accent" />;
      },
    },
  ];

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
          Exceptions
        </h1>
        <p className="mt-2 text-[var(--pf-muted)]">
          Requests that cannot be released yet because the authorization or the chart match has a problem. Each row
          shows the reason and the time left before the firm&apos;s due date.
        </p>
      </div>

      <section
        data-tour="appeal-countdown"
        className="mt-6 rounded-xl border border-[var(--pf-primary)]/30 bg-[var(--pf-primary)]/5 p-4"
      >
        <p className="text-xs text-[var(--pf-muted)]">Firm due date for request {edge.request_id}</p>
        <p className="mt-1 text-xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
          {edgeStatus === "released"
            ? releasedLabel(edgeReleasedAt)
            : edgeStatus === "in release review"
              ? "Moved to release review"
              : businessDayCountdown(edge.due_date)}
        </p>
        <p className="text-sm text-[var(--pf-muted)]">
          Packet needed by {fullDate(edge.due_date)}. Counted in business days from today.
        </p>
      </section>

      <div className="mt-4">
        {attached ? (
          <ScenarioBanner
            dataTour="exception-scenario"
            title="Corrected authorization attached"
            body={`The corrected form now shows ${fullDate(edge.chart_dob)} and matches chart ${edge.mrn}. The birth date exception is cleared; move the request to release review when you are ready.`}
          />
        ) : (
          <ScenarioBanner
            dataTour="exception-scenario"
            title="Two charts share this name"
            body="Request 5208 asks for Andre Salcedo. Two patients in the chart index have that name, and the signed authorization lists a birth date with the day and month swapped. Nothing is pulled from a chart until the corrected form arrives."
          />
        )}
      </div>

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.request_id}
          onRowClick={(r) => setSelectedId(r.request_id)}
          dataTour="denial"
          edgeCaseRow={(r) => r.request_id === "5208"}
          mobileStatusKey="request_status"
          mobileUrgencyKey="due_date"
        />
      </div>

      <div className="mt-8 max-w-3xl">
        <SampleDocuments screenId="exceptions" />
      </div>

      <RecordDrawer
        open={selected !== null}
        title={selected ? `Request ${selected.request_id}` : "Request"}
        onClose={() => setSelectedId(null)}
      >
        {selected && (() => {
          const isEdge = selected.request_id === "5208";
          const sentBack = Boolean(overrides[selected.request_id]?.sentBack);
          const cleared = isEdge && attached;
          const formDob = cleared ? selected.chart_dob : selected.authorization_dob;
          const charts = SAME_NAME_CHARTS[selected.request_id];
          return (
            <div className="space-y-5 text-sm">
              <div>
                <p className="text-xs text-[var(--pf-muted)]">Patient</p>
                <p className="font-medium">{selected.patient_name}</p>
                <p className="text-[var(--pf-muted)]">{selected.requesting_firm}</p>
              </div>

              <div>
                <p className="text-xs text-[var(--pf-muted)]">Why it is held</p>
                <p className="font-medium">
                  {sentBack
                    ? effectiveExceptionReason(selected, overrides[selected.request_id])
                    : cleared
                      ? "Corrected authorization attached; ready for release review"
                      : effectiveExceptionReason(selected, overrides[selected.request_id])}
                </p>
              </div>

              <div>
                <p className="text-xs text-[var(--pf-muted)]">Authorization check</p>
                <p>Birth date on the form: {fullDate(formDob)}</p>
                {cleared && <p className="text-[var(--pf-primary)]">matches chart {selected.mrn}</p>}
                <p>
                  Chart MRN: <Masked field="mrn">{selected.mrn}</Masked>
                </p>
                <p>
                  Birth date on that chart:{" "}
                  <Masked field="chart_dob">{fullDate(selected.chart_dob)}</Masked>
                </p>
              </div>

              {charts && (
                <div>
                  <p className="text-xs text-[var(--pf-muted)]">
                    Charts with this name:{" "}
                    <Masked field="same_name_charts">{charts.length}</Masked>
                  </p>
                  <div className="mt-2 grid gap-2">
                    {charts.map((chart) => {
                      const primary = chart.mrn === selected.mrn;
                      return (
                        <div
                          key={chart.mrn}
                          className={`rounded-lg border p-3 ${
                            cleared && primary
                              ? "border-[var(--pf-primary)]"
                              : "border-[var(--pf-accent)]"
                          }`}
                        >
                          <p className="font-medium">
                            Chart: <Masked field="mrn">{chart.mrn}</Masked>
                          </p>
                          <p>
                            Birth date: <Masked field="chart_dob">{fullDate(chart.dob)}</Masked>
                          </p>
                          <p className="mt-1 text-xs text-[var(--pf-muted)]">
                            {cleared
                              ? primary
                                ? "Matches the corrected authorization."
                                : "Not this patient. The corrected authorization matches DEMO-204417."
                              : chart.note}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-[var(--pf-muted)]">Firm due date</p>
                <p>
                  {fullDate(selected.due_date)} ({businessDayCountdown(selected.due_date)})
                </p>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-[var(--pf-muted)]/20 pt-4">
                {isEdge && !cleared && (
                  <button
                    type="button"
                    data-action="attach-corrected-authorization"
                    onClick={() => {
                      setOverrides((prev) => ({
                        ...prev,
                        "5208": {
                          ...prev["5208"],
                          attached: true,
                          attachedAt: new Date().toISOString(),
                        },
                      }));
                      logAction("Corrected authorization attached to request 5208", "attach-corrected-authorization");
                    }}
                    className="rounded-lg border border-[var(--pf-muted)]/30 px-3 py-1.5 text-sm"
                  >
                    Attach corrected authorization
                  </button>
                )}
                {isEdge && cleared && (
                  <p className="self-center text-sm text-[var(--pf-muted)]">
                    Corrected authorization attached
                  </p>
                )}
                <button
                  type="button"
                  data-action="move-to-release-review"
                  disabled={isEdge && !cleared}
                  onClick={() => {
                    setOverrides((prev) => ({
                      ...prev,
                      [selected.request_id]: {
                        ...prev[selected.request_id],
                        movedToReview: true,
                        movedAt: new Date().toISOString(),
                        sentBack: false,
                        sentBackReason: undefined,
                      },
                    }));
                    logAction("Request moved to release review", "move-to-release-review");
                    setSelectedId(null);
                  }}
                  className="rounded-lg bg-[var(--pf-primary)] px-3 py-1.5 text-sm font-medium text-[var(--pf-surface)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Move to release review
                </button>
              </div>
              {isEdge && !cleared && (
                <p className="text-xs text-[var(--pf-muted)]">
                  Attach the corrected authorization first. Nothing is matched or cleared automatically.
                </p>
              )}
              {cleared && (
                <p className="text-xs text-[var(--pf-muted)]">
                  Moving the request sends it to release review, where the packet is checked again before anything goes
                  to the firm.
                </p>
              )}
            </div>
          );
        })()}
      </RecordDrawer>
    </AppShell>
  );
}
