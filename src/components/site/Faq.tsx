"use client";

import { useState } from "react";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  isOpen?: boolean;
}

export default function Faq({ data }: { data?: FaqItem[] }) {
  // Bootstrap's collapse JS toggles `show`/`collapsed` via direct DOM
  // manipulation, completely outside React. That's fine as long as nothing
  // ever re-renders this subtree — but the moment anything on the page does
  // (a sibling component's state update, a parent re-render, anything),
  // React reconciles the DOM back to match `item.isOpen`, which never
  // actually changed — silently closing whatever the user just opened. That
  // read as "the answer appears then disappears". Managing open/closed state
  // in React instead (and dropping the data-bs-* attributes so Bootstrap's
  // JS doesn't also try to toggle it) makes this reconcile-safe.
  const [openId, setOpenId] = useState<string | null>(() => data?.find((item) => item.isOpen)?.id ?? null);

  return (
    <section className="FAQ-section sectionspace80">
      <div className="container">
        <div className="sct-title">
          <h2>Frequently Asked Questions</h2>
        </div>
        <div className="row g-4">
          <div className="col-lg-9">
            <div className="accordion faq-accordion" id="faqAccordion">
              {data?.map((item) => {
                const isOpen = openId === item.id;
                return (
                  <div className="accordion-item" key={item.id}>
                    <h2 className="accordion-header">
                      <button
                        className={`accordion-button ${!isOpen ? "collapsed" : ""}`}
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        dangerouslySetInnerHTML={{ __html: item.question }}
                      />
                    </h2>

                    <div id={item.id} className={`accordion-collapse collapse ${isOpen ? "show" : ""}`}>
                      <div className="accordion-body" dangerouslySetInnerHTML={{ __html: item.answer }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
