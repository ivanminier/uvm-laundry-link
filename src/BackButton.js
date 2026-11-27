import React from 'react';
import { ArrowLeft } from 'lucide-react';

export function BackButton({ children = 'Back', className = '', onClick }) {
  return (
    <button type="button" onClick={onClick} className={`ll-back-button ${className}`.trim()}>
      <ArrowLeft size={18} aria-hidden="true" />
      {children}
    </button>
  );
}
