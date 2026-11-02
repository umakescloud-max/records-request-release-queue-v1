import { AppShell, ArchitectureView, IntegrationTiles } from "@kit";
import type { ArchEdge, ArchNode } from "@kit";
import { BRAND, NAV, PERSONA } from "../nav";
import { useScrollTop } from "./_shared";

// The brief's architecture, passed through unchanged.
const NODES: ArchNode[] = [
  {
    id: "retrieval-portals",
    label: "Records retrieval portals",
    kind: "system",
    does: "Deliver law firm records requests and authorizations, and carry released packets back to the firm.",
    data: "Request details, authorizations, released records packets",
    stores_patient_data: true,
    runs_in: "vendor-system",
  },
  {
    id: "fax-email-inbox",
    label: "Records fax and email inbox",
    kind: "system",
    does: "Receives requests and authorizations that firms send outside the portals.",
    data: "Request letters, authorization PDFs",
    stores_patient_data: true,
    runs_in: "vendor-system",
  },
  {
    id: "ehr",
    label: "Practice EHR",
    kind: "system",
    does: "Holds the chart index and the visit notes, imaging reports and therapy notes to release.",
    data: "Patient name, birth date, chart documents",
    stores_patient_data: true,
    runs_in: "vendor-system",
  },
  {
    id: "billing-ledger",
    label: "Practice billing ledger",
    kind: "system",
    does: "Supplies the charges and payments that make up the itemized bill and final balance.",
    data: "Dates of service, charges, payments",
    stores_patient_data: true,
    runs_in: "vendor-system",
  },
  {
    id: "request-desk",
    label: "Records request desk (this prototype)",
    kind: "app",
    does: "Collects every request, matches it to a chart, checks the authorization, flags problems and holds packets for approval. In this demo it runs in your browser with synthetic data.",
    data: "Request status, chart match, authorization checks, packet contents",
    stores_patient_data: true,
    runs_in: "client-cloud",
  },
  {
    id: "document-reader",
    label: "Document reader (AI)",
    kind: "model",
    does: "Reads each authorization for the patient name, birth date, signature, expiry and records allowed.",
    data: "Authorization text only, no chart data",
    stores_patient_data: false,
    runs_in: "client-cloud",
  },
  {
    id: "records-specialist",
    label: "Tessa (medical records specialist)",
    kind: "human",
    does: "Fixes exceptions and approves every packet before it is released.",
    data: "Everything in the desk for her requests",
    stores_patient_data: false,
    runs_in: "person",
  },
  {
    id: "law-firms",
    label: "Requesting law firms and their case software (CasePeer)",
    kind: "external",
    does: "Send requests and receive the released records, itemized bills and balances.",
    data: "Released packets and status updates only",
    stores_patient_data: true,
    runs_in: "outside-party",
  },
];

const EDGES: ArchEdge[] = [
  { from: "retrieval-portals", to: "request-desk", label: "New requests and authorizations" },
  { from: "fax-email-inbox", to: "request-desk", label: "Requests sent by fax or email" },
  { from: "ehr", to: "request-desk", label: "Chart index and documents" },
  { from: "billing-ledger", to: "request-desk", label: "Charges and payments" },
  { from: "request-desk", to: "document-reader", label: "Authorization text" },
  { from: "document-reader", to: "request-desk", label: "Name, birth date, signature, expiry, scope" },
  { from: "request-desk", to: "records-specialist", label: "Exceptions and packets to approve" },
  { from: "records-specialist", to: "retrieval-portals", label: "Approved packet release" },
  { from: "retrieval-portals", to: "law-firms", label: "Released records and bills" },
];

const COMPLIANCE_NOTES = [
  "A real build runs in the practice's own cloud account, with patient data encrypted at rest and in transit and access limited by role.",
  "Each release is logged with who approved it, what was sent and to whom, so the practice can account for every disclosure.",
  "Only the record types and date range named in the authorization go into a packet.",
  "The document reader sees authorization text only, never the chart, and no patient data goes to a model or portal vendor without a signed BAA.",
  "This prototype uses synthetic data and simulated roles.",
];

const TOOLS = ["ChartSwap", "ChartSwap Insights", "MRO", "Ciox (Datavant)", "Verisma", "CasePeer"];

export default function Architecture() {
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
      <div className="max-w-3xl">
        <h1 className="text-3xl" style={{ fontFamily: "var(--pf-font-heading)" }}>
          How it works
        </h1>
        <p className="mt-2 text-[var(--pf-muted)]">
          Where each piece runs, what data passes through it and which parts hold patient data. Click any box to see
          the details.
        </p>
      </div>

      <div className="mt-6">
        <ArchitectureView nodes={NODES} edges={EDGES} complianceNotes={COMPLIANCE_NOTES} />
      </div>

      <div className="mt-8">
        <IntegrationTiles tools={TOOLS} title="Connected tools named in this design" />
      </div>
    </AppShell>
  );
}
