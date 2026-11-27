import React, { useId, useState } from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { BackButton } from './BackButton';
import { HomeScreenSteps } from './HomeScreenHelp';

import { informationDisclosure, informationQuestions, informationResources, urgentMachinePhone, urgentMachineTel } from './informationContent.mjs';

function Question({ question, answer, afterHomeScreenSteps, definitions }) {
  const [open, setOpen] = useState(false);
  const answerId = useId();

  return (
    <div className="border-t border-slate-200 dark:border-slate-700">
      <button type="button" aria-expanded={open} aria-controls={answerId} onClick={() => setOpen(value => !value)}
        className="ll-faq-question flex min-h-[48px] w-full items-center gap-1.5 rounded py-3 text-left font-medium focus-visible:ring-2 focus-visible:ring-uvm-green dark:focus-visible:ring-uvm-gold">
        <ChevronRight size={16} className="ll-faq-chevron shrink-0" aria-hidden="true" />{question}
      </button>
      <div id={answerId} className="ll-faq-answer" aria-hidden={!open} inert={open ? undefined : ''}>
        <div>
          <div className="pb-3 pl-[22px] text-sm text-slate-600 dark:text-slate-300">
            <p>{answer.map((part, index) => typeof part === 'string' ? part : (
              <a key={index} href={part.href} className="text-uvm-green underline dark:text-uvm-gold">{part.label}</a>
            ))}</p>
            {definitions && <dl className="mt-3 space-y-2">
              {definitions.map(([label, meaning]) => (
                <div key={label}><dt className="font-semibold">{label}</dt><dd>{meaning}</dd></div>
              ))}
            </dl>}
            {afterHomeScreenSteps && (
              <>
                <div className="mt-2"><HomeScreenSteps /></div>
                <p className="mt-2">{afterHomeScreenSteps}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LaundryHelp({ onBack }) {
  return (
    <div className="ll-panel mx-auto max-w-2xl p-5 sm:p-7 animate-fadeIn">
      <header className="ll-overlay-heading mb-6">
        <h1 className="text-3xl lg:text-4xl font-bold">Information</h1>
        <BackButton onClick={onBack} />
      </header>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Frequently Asked Questions</h2>
        {informationQuestions.map(([question, answer, afterHomeScreenSteps, definitions]) =>
          <Question key={question} question={question} answer={answer} afterHomeScreenSteps={afterHomeScreenSteps} definitions={definitions} />)}
      </section>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">More Resources</h2>
        <ul className="space-y-3">
          {informationResources.map(([label, url, external]) => (
            <li key={url}>
              <a href={url} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-2 font-medium text-uvm-green underline dark:text-uvm-gold">
                {label}
                {external && <>
                  <ExternalLink size={15} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </>}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">For urgent machine issues, call <a href={urgentMachineTel} className="underline">{urgentMachinePhone}</a>.</p>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          {informationDisclosure[0]}
          <a href={informationDisclosure[1].href} className="text-uvm-green underline dark:text-uvm-gold">{informationDisclosure[1].label}</a>
        </p>
      </section>
    </div>
  );
}
