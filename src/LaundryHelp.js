import React from 'react';
import { ExternalLink } from 'lucide-react';
import { SERVICE_REQUEST_URL } from './MachineReport';
import { BackButton } from './BackButton';

const questions = [
  ['How do I find my room?', <>Open the <a href="/residence-halls/" className="text-uvm-green underline dark:text-uvm-gold">campus laundry directory</a> and choose your residence hall, then select your floor, tower, or room. Central Campus Residence Hall has separate entries for Floors 2 through 7. A machine may show time remaining when the provider reports it.</>],
  ['What should I bring?', 'Bring a laundry bag and detergent suited to the machine. Check garment and machine labels, empty your pockets, avoid overloading the washer, move your load promptly, and clear the dryer lint screen as directed.'],
  ['Is there a UVM laundry app?', 'UVM LaundryLink is a website for phones and computers. You can add it to your phone’s Home Screen. For push notifications on iPhone or iPad, open LaundryLink from its Home Screen icon and allow notifications when prompted.'],
  ['How do I know when a machine is free?', 'Available means the provider reports the machine can be used. A finished cycle may still have laundry inside. Check the room’s last refresh time before relying on the list.'],
  ['Can I get a text, email, or push notification?', 'Open Set Cycle Alert on a running machine. LaundryLink sends browser push alerts; Automatic Laundry provides the text and email setup in its embedded panel. When a room has no available washers or no available dryers, LaundryLink can send a one-time push when a machine of that type opens.'],
  ['What do the status labels mean?', 'Available means the provider reports an open machine. Cycle Finished means a cycle has ended. A saved snapshot shows an earlier observation with its timestamp. If there is no usable status, the tracker marks the data unavailable. See service status if a refresh fails.'],
  ['What are Peak Times?', 'Peak Times summarize past machine usage. Use the chart to plan a visit, then check the tracker for current availability. CCRH Floors 6 and 7 share a provider history even though LaundryLink separates their live machine lists.'],
  ['How do I report a broken washer or dryer?', 'Use Report a problem on the machine card or submit a service request to Automatic Laundry. Include the building, room, machine number, and any error code shown on the display.'],
  ['What if a machine will not start?', 'Use the report action on the machine card to contact Automatic Laundry. Include the residence hall, floor or room, machine number, and any error code shown on the display.'],
];

const resources = [
  ['Campus Laundry Directory', '/residence-halls/'],
  ['About UVM LaundryLink', '/about/'],
  ['Compare trackers', '/compare/'],
  ['Service status', '/status/'],
  ['Site map', '/sitemap/'],
  ['Request service', SERVICE_REQUEST_URL, true],
  ['Automatic Laundry app help', 'https://automaticlaundry.com/faq/for-our-apps/', true],
  ['UVM Housing help center', 'https://www.uvm.edu/housingdining/help-center', true],
];

export function LaundryHelp({ onBack }) {
  return (
    <div className="ll-panel mx-auto max-w-2xl p-5 sm:p-7 animate-fadeIn">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-3xl lg:text-4xl font-bold">Information</h2>
        <BackButton onClick={onBack} />
      </header>
      <section className="mt-6">
        <h3 className="mb-3 text-lg font-semibold">Frequently Asked Questions</h3>
        {questions.map(([question, answer]) => (
          <details key={question} className="border-t border-slate-200 py-3 dark:border-slate-700">
            <summary className="cursor-pointer rounded font-medium focus-visible:ring-2 focus-visible:ring-uvm-green dark:focus-visible:ring-uvm-gold">{question}</summary>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{answer}</p>
          </details>
        ))}
      </section>
      <section className="mt-6">
        <h3 className="mb-3 text-lg font-semibold">More Resources</h3>
        <ul className="space-y-3">
          {resources.map(([label, url, external]) => (
            <li key={url}>
              <a href={url} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-2 font-medium text-uvm-green underline dark:text-uvm-gold">
                {label} {external && <ExternalLink size={15} />}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">For urgent machine issues, call <a href="tel:+16179694340" className="underline">617-969-4340</a>.</p>
      </section>
    </div>
  );
}
