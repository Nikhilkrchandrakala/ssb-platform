export interface RedistributableInstallment {
  seq: number;
  amount: number;
  status: string;
}

export type RedistributeResult = { ok: true } | { ok: false; message: string };

/**
 * After one or more installment amounts have been directly edited, spreads
 * whatever's left of the plan's totalAmount evenly across the remaining
 * not-yet-paid, not-just-edited installments — so a sales person changing
 * one EMI's amount never has to also hand-edit every other installment to
 * keep the plan summing back to totalAmount. Mutates `installments` in place
 * (only the untouched entries in `remaining`); the caller still owns saving.
 */
export function redistributeRemaining(
  installments: RedistributableInstallment[],
  totalAmount: number,
  editedSeqs: Set<number>
): RedistributeResult {
  const paidTotal = installments.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);
  const editedTotal = installments.filter((i) => editedSeqs.has(i.seq)).reduce((sum, i) => sum + i.amount, 0);
  const remaining = installments.filter((i) => i.status !== "paid" && !editedSeqs.has(i.seq));

  const remainingBudget = Math.round((totalAmount - paidTotal - editedTotal) * 100) / 100;

  if (remaining.length === 0) {
    if (Math.abs(remainingBudget) > 0.01) {
      return {
        ok: false,
        message: `This change leaves ₹${remainingBudget.toFixed(2)} unaccounted for and there are no other installments left to absorb it.`,
      };
    }
    return { ok: true };
  }

  if (remainingBudget <= 0) {
    return {
      ok: false,
      message: `The edited amount(s) already cover the full remaining balance (or more) — nothing would be left for the other ${remaining.length} installment(s).`,
    };
  }

  const base = Math.floor((remainingBudget / remaining.length) * 100) / 100;
  let allocated = 0;
  remaining.forEach((inst, idx) => {
    if (idx === remaining.length - 1) {
      // Last one absorbs the rounding remainder so the total is always exact.
      inst.amount = Math.round((remainingBudget - allocated) * 100) / 100;
    } else {
      inst.amount = base;
      allocated = Math.round((allocated + base) * 100) / 100;
    }
  });

  return { ok: true };
}
