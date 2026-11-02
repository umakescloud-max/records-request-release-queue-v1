# Releasing records without pulling the wrong chart

Injury practices paid through PIP, letters of protection and workers' comp answer records and bill requests from law firms all week, often about 70 of them. Each one means finding the chart, checking the authorization, pulling pages and getting an itemized bill and balance from billing.

## Why it keeps happening

Requests arrive through retrieval portals, fax and email, so there is no single list and due dates live on sticky notes. Authorization problems, like a wrong birth date or a missing signature, turn up halfway through pulling the chart. Balances are typed in by hand. Paralegals call for status because nobody tells them a packet went out.

At about 32 minutes a request, that is roughly 37 specialist hours a week. A late packet holds up a settlement demand on a balance averaging about $9,000. A packet from the wrong chart is a reportable privacy breach.

## What the prototype does

We built a records request desk with 140 synthetic requests from invented law firms, each with its channel and the firm's due date.

On Requests, open the newest row to see its history: arrival, chart match, authorization check, pages, bill and balance.

On Exceptions, request 5208 sits at the top. Two patients share the name Andre Salcedo, and the authorization's birth date has the day and month swapped, so it matches neither. The desk flags "Authorization date of birth does not match chart", shows both charts and counts down to the firm's due date. No pages are pulled. Attach the corrected authorization from the sample document, then move it to release review.

On Release review, check the chart, date range, pages, bill and balance, and click "Approve and release packet". Nothing leaves without that click.

A Costs screen takes your own volume, minutes and staff rate. A clickable "How it works" diagram shows where each piece runs and which parts hold patient data.

## How a real version would be built

A production desk would connect to the portals firms already use, such as ChartSwap, MRO, Ciox (Datavant) and Verisma, plus the fax and email inbox, the EHR and the billing ledger. An AI reader would see authorization text only, never the chart. It would run on the practice's own cloud with role-based access, audit logs for every release, encryption and signed BAAs.

This is a concept prototype with synthetic data. A real build runs on your own cloud, HIPAA-ready, and you own it.

If your team fights this every week, book a free workflow audit at umakes.cloud or reply to umakescloud@gmail.com.
