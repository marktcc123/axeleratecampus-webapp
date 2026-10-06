import {
  INSTANT_FEE_MIN_USD,
  INSTANT_FEE_RATE,
  STANDARD_DAYS,
  W9_THRESHOLD_USD,
  W9_WARNING_USD,
} from '../app/payout.js';
import { LIVE_MIN_USD } from '../lib/withdrawals.js';

// IRS Instructions for Forms 1099-MISC and 1099-NEC (Rev. December 2026):
// for payments made after 2025, the nonemployee-compensation filing line is
// $2,000. Backup withholding on a reportable payment with a missing or
// mismatched TIN stays at 24% (IRC §3406).
const NEC_FILING_USD = 2000;
const BACKUP_WITHHOLDING_RATE = 0.24;

const usd = (n) => '$' + Number(n).toLocaleString('en-US', {
  minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2,
  maximumFractionDigits: 2,
});
const pct = (n) => `${Math.round(n * 1000) / 10}%`;

// Headings the owner will fill stay strings. A section with a body is published.
export const LEGAL = {
  terms: {
    title: 'Terms of service',
    sections: ['Acceptance', 'Eligibility', 'Missions and payment', 'Content and disclosure', 'Account standing', 'Changes to these terms'],
  },
  privacy: {
    title: 'Privacy',
    sections: ['What we collect', 'How we use it', 'Verification data', 'Sharing', 'Your choices', 'Contact'],
  },
  payouts: {
    title: 'Payout terms',
    updated: 'September 26, 2026',
    lede: 'These terms cover cash paid out of an Axelerate wallet. They are the rules we apply. They are not personal tax advice.',
    sections: [
      {
        title: 'How you are paid',
        paragraphs: [
          'Mission pay is paid to you as an independent contractor, not as wages to an employee. Axelerate does not withhold income tax or payroll tax from a payout, and a payout does not include employee benefits.',
          'You set the hours, method, and place for the work a mission describes. These terms describe that relationship. If a statute would treat a particular engagement as employment, that statute controls.',
          'Cash moves only after a withdrawal request is approved and sent to the PayPal, Venmo, or bank account you name. Submitting a request records it. The wallet balance stays until the payout is sent.',
        ],
      },
      {
        title: 'What you can request',
        paragraphs: [
          `The smallest request is ${usd(LIVE_MIN_USD)}. You cannot request more cash than the wallet holds.`,
          `Standard has no fee and is sent within ${STANDARD_DAYS} business days after it is approved. Instant, when it is offered, costs ${pct(INSTANT_FEE_RATE)} of the amount, and at least ${usd(INSTANT_FEE_MIN_USD)}. The fee comes out of the amount, and you receive the rest.`,
          'A request stays pending until it is sent or declined. A declined request is not a payout and does not count toward the totals below.',
        ],
      },
      {
        title: 'Taxes you still owe',
        paragraphs: [
          'You are responsible for federal, state, and local tax on this income, including self-employment tax when it applies. Net earnings from self-employment of $400 or more are a common federal line for that tax. The income is taxable whether or not a form is issued.',
          'The year in this page is the calendar year. It counts cash payouts that are pending or completed. Credits and XP are not cash, and credits cannot be withdrawn as dollars. A product given for a mission can still be income you must report. Its value is not added to the wallet’s W-9 line.',
        ],
      },
      {
        title: 'Form 1099-NEC',
        paragraphs: [
          `For payments made in 2026, Axelerate files Form 1099-NEC when nonemployee compensation paid to you is at least ${usd(NEC_FILING_USD)}. That is the threshold in the IRS instructions for Forms 1099-MISC and 1099-NEC (Rev. December 2026). The IRS may adjust it for inflation in later years. The same form is filed when federal backup withholding was taken, even if the year’s total is lower.`,
          'We furnish the form to you and file it with the IRS. PayPal, Venmo, or another payment company may have its own duty to file Form 1099-K. That form is theirs.',
        ],
      },
      {
        title: 'Form W-9',
        paragraphs: [
          `We collect Form W-9 — your legal name, address, and taxpayer identification number — before the year’s payouts reach ${usd(W9_THRESHOLD_USD)}. At ${usd(W9_WARNING_USD)} the wallet reminds you. At ${usd(W9_THRESHOLD_USD)}, including a request that would cross that line, no further payout is sent until the form has been checked.`,
          `We ask at ${usd(W9_THRESHOLD_USD)}, earlier than the ${usd(NEC_FILING_USD)} filing line, so a taxpayer identification number is on file before a 1099 might be required. An upload that is still waiting to be checked does not lift the hold. Replacing the file starts the check again.`,
          `If a taxpayer identification number is missing, or the IRS tells us it does not match, federal backup withholding can apply to a reportable payment. The rate is ${pct(BACKUP_WITHHOLDING_RATE)} unless the IRS publishes a different one. Amounts withheld are paid to the IRS, not to you. Until a valid Form W-9 is on file, we hold payouts instead of sending them.`,
        ],
      },
      {
        title: 'Disclosures when you post',
        paragraphs: [
          'If a payout or a free product is for promoting a brand, federal endorsement rules require a clear disclosure in the post itself, such as #ad or #sponsored. The disclosure has to be where a viewer will see it, not only in a profile.',
        ],
      },
      {
        title: 'If a payout looks wrong',
        paragraphs: [
          'A pending request is not money that has arrived. If a request or a sent payout looks wrong, tell us from the account. If a Form 1099-NEC we issued is wrong, we correct the form. Questions about your own tax return go to a tax advisor or the IRS.',
        ],
      },
    ],
  },
};

export const sectionTitle = (section) => (typeof section === 'string' ? section : section.title);
