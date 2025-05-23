import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Settings,
  Star,
  ArrowLeft,
  ExternalLink,
  Droplet,
  Wind,
  MessageCircle,
  Smartphone,
  Eye,
  EyeOff,
  Info,
  Search,
  Sun,
  Moon
} from 'lucide-react';

const UVM_GREEN = '#154734';
const UVM_GOLD = '#fdb515';
const UVM_LOGO_URL = 'https://i.imgur.com/kvyrGbL.png'; // Placeholder for UVM Logo

// --- Refresh Interval Configuration ---
const ACTIVE_ROOM_REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds for active room

// Helper function to get status color and icon
const getStatusDetails = (status) => {
  const rawStatus = String(status || 'Unknown').trim();
  const lowerStatus = rawStatus.toLowerCase();
  let actualStatusOutput = "Unknown";
  let iconElement = <AlertTriangle size={18} className="mr-2 flex-shrink-0 text-slate-500 dark:text-slate-400" />;

  if (lowerStatus.includes("available")) {
    actualStatusOutput = "Available";
    iconElement = <CheckCircle size={18} className="mr-2 flex-shrink-0 text-green-500" />;
  } else if (lowerStatus.includes("in use")) {
    actualStatusOutput = "In Use";
    iconElement = <Zap size={18} className="mr-2 flex-shrink-0 text-yellow-500" />;
  } else if (lowerStatus.includes("out of service") || lowerStatus.includes("out of order")) {
    actualStatusOutput = "Out of Service";
    iconElement = <XCircle size={18} className="mr-2 flex-shrink-0 text-red-500" />;
  } else if (lowerStatus.includes("offline")) {
    actualStatusOutput = "Offline";
    iconElement = <XCircle size={18} className="mr-2 flex-shrink-0 text-slate-400" />;
  }

  return { iconElement, actualStatusOutput };
};

function App() {
  const [status, setStatus] = useState("Available");
  const { iconElement, actualStatusOutput } = useMemo(() => getStatusDetails(status), [status]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4">
      <header className="flex items-center justify-between border-b pb-2 mb-4">
        <img src={UVM_LOGO_URL} alt="UVM Logo" className="h-10" />
        <h1 className="text-2xl font-bold">UVM LaundryLink</h1>
      </header>

      <main>
        <div className="flex items-center space-x-2 text-lg">
          {iconElement}
          <span>{actualStatusOutput}</span>
        </div>
      </main>

      <footer className="mt-8 text-sm text-center text-slate-500 dark:text-slate-400">
        © 2025 UVM LaundryLink
      </footer>
    </div>
  );
}

export default App;
