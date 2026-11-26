import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { SERVICE_REQUEST_URL } from './MachineReport';

const topics = [
  ['How do I know when a machine is free?', 'Available means the machine can be used. A finished cycle may still have laundry inside. Check the room’s last refresh time before relying on the list.'],
  ['Can I get a reminder when my laundry finishes?', 'Open Set Cycle Alert on a running machine. LaundryLink sends browser push alerts, and Automatic Laundry handles text alerts in the panel on this page. For push on iPhone or iPad, open LaundryLink from your Home Screen.'],
  ['What should I include when reporting a problem?', 'Use the report action on the machine card. Include the residence hall, floor or room, machine number, and any error code shown on the display.'],
  ['What if a machine accepted payment but did not start?', 'Contact Automatic Laundry through its service form. Include the machine number and the time it happened so the vendor can investigate.'],
];

const resources = [
  ['Request service', SERVICE_REQUEST_URL],
  ['Laundry basics and video guides', 'https://automaticlaundry.com/laundry-101/'],
  ['Automatic Laundry app help', 'https://automaticlaundry.com/faq/for-our-apps/'],
  ['UVM Housing help center', 'https://www.uvm.edu/housingdining/help-center'],
];

export function LaundryHelp({ onBack }) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl bg-white p-5 shadow-lg dark:bg-slate-800 sm:p-7">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 rounded text-sm font-semibold text-uvm-green dark:text-uvm-gold">
        <ArrowLeft size={18} /> Back
      </button>
      <h2 className="text-2xl font-bold">Laundry Help</h2>
      <section className="mt-6">
        <h3 className="mb-3 text-lg font-semibold">Common Questions</h3>
        {topics.map(([question, answer]) => (
          <details key={question} className="border-t border-slate-200 py-3 dark:border-slate-700">
            <summary className="cursor-pointer rounded font-medium focus-visible:ring-2 focus-visible:ring-uvm-green dark:focus-visible:ring-uvm-gold">{question}</summary>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{answer}</p>
          </details>
        ))}
      </section>
      <section className="mt-6">
        <h3 className="mb-3 text-lg font-semibold">Service and Guides</h3>
        <ul className="space-y-3">
          {resources.map(([label, url]) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium text-uvm-green underline dark:text-uvm-gold">
                {label} <ExternalLink size={15} />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">For urgent machine issues, call <a href="tel:+16179694340" className="underline">617-969-4340</a>.</p>
      </section>
    </div>
  );
}
