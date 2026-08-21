"use client";

import { useRouter } from "next/navigation";
import { IoMdArrowBack } from "react-icons/io";
import "@/style/RefundCancellation.css";

export default function RefundCancellationClient() {
  const router = useRouter();

  return (
    <section className="refund-root">
      <div onClick={() => router.back()} className="BackBtn" title="Go Back">
        <IoMdArrowBack />
      </div>

      <div className="refund-container">
        <h1 className="refund-title">Refund & Cancellation Policy</h1>

        <p className="refund-meta">
          <strong>Effective Date:</strong> August 21, 2026
        </p>

        <div className="refund-content">
          <h2>1. No Guarantee Clause</h2>
          <p>
            SSB with ISV offers mentoring and guidance services for SSB preparation. Selection, recommendation, or
            commission into the Armed Forces is not guaranteed. Refunds are not linked to outcomes or results.
          </p>

          <h2>2. Refund Eligibility</h2>
          <p>Refunds may be considered only if all of the following conditions are met:</p>
          <ul>
            <li>
              Refund request is made <strong>before course commencement</strong>
            </li>
            <li>
              Request is submitted <strong>within 48 hours of payment</strong>
            </li>
            <li>
              No content, class, or mentoring session has been accessed
            </li>
          </ul>
          <p>All approved refunds are subject to applicable administrative deductions.</p>

          <h2>2a. Installment / Part-Payment Plans</h2>
          <p>Where a course is purchased under an installment plan:</p>
          <ul>
            <li>
              The 48-hour refund window (Clause 2) applies only to the <strong>first (initial) payment</strong>, and only if no installment beyond it has been paid and the course has not commenced.
            </li>
            <li>
              Installments already paid and reconciled are <strong>non-refundable</strong> once the corresponding period of access has begun, in line with Clause 3.
            </li>
            <li>
              If a student defaults on a due installment and access is revoked for non-payment, <strong>no refund is due</strong> for amounts already paid, and outstanding installments are not waived by the revocation.
            </li>
            <li>
              Cancelling a future (unpaid) installment does not entitle the student to a refund of installments already paid — it only stops further billing.
            </li>
          </ul>

          <h2>3. Non-Refundable Situations</h2>
          <p>No refunds shall be issued if:</p>
          <ul>
            <li>The course has commenced</li>
            <li>Any content, class, or mentoring session has been accessed</li>
            <li>Delay or absence is due to the candidate's personal reasons</li>
            <li>The candidate withdraws voluntarily</li>
            <li>The candidate is removed due to misconduct or violation of institute policy</li>
            <li>The candidate's access is revoked due to a missed/overdue installment payment</li>
          </ul>

          <h2>4. Cancellation by Institute</h2>
          <p>
            In the event a batch is cancelled by SSB with ISV, eligible candidates may receive a refund or credit
            adjustment towards another batch, at the discretion of the institute. For installment-plan students, any refund in this case is limited to installments actually paid.
          </p>

          <h2>5. Refund Processing</h2>
          <p>
            Approved refunds will be processed within <strong>7–14 working days</strong> via the original payment
            method used at the time of purchase.
          </p>

          <h2>6. Final Authority</h2>
          <p>
            All refund and cancellation decisions rest solely with the management of SSB with ISV and shall be final
            and binding.
          </p>

          <hr />

          <h2>Grievance & Contact Details</h2>
          <p>
            <strong>Grievance Officer:</strong> Lt Cdr Nikhil Kumar Chandrakala
            <br />
            <strong>Email:</strong> info@ssbwithisv.in
            <br />
            <strong>Jurisdiction:</strong> Bengaluru, Karnataka
          </p>
        </div>
      </div>
    </section>
  );
}
