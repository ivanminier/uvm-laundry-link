import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Zap, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, Settings, Star, ArrowRight, ExternalLink, Droplet, Wind, Eye, EyeOff, Info, Search, Sun, Moon, LayoutGrid, Bell, X } from 'lucide-react';

import { findLaundryRoom, getOfficialRoomUrl, laundryRooms, roomDisplayName, roomLabel, roomPath, machinePath, canWatchNextMachine, NEXT_WASHER_LABEL, NEXT_DRYER_LABEL } from './laundryData';
import { useLaundryStatus } from './useLaundryStatus';
import { CAMPUS_SECTIONS, groupCampusRooms } from './campusDirectory.mjs';
import { RoomSwitcher, RoomTools } from './RoomTools';
import { MyLaundry } from './MyLaundry';
import { PushAlertForm } from './PushAlertForm';
import { LaundryHelp } from './LaundryHelp';
import { HomeScreenPrompt } from './HomeScreenHelp';
import { BackButton } from './BackButton';
import { RoomPeakTimes } from './RoomPeakTimes';
import { MachineReport, SERVICE_REQUEST_URL } from './MachineReport';

// LaundryLink brand green
const BRAND_GREEN = '#154734';

// Helper function to get status color and icon
const getStatusDetails = (status) => {
  const rawStatus = String(status || 'Unknown').trim();
  const lowerStatus = rawStatus.toLowerCase();
  let actualStatusOutput = "Unknown";
  let iconElement = <AlertTriangle size={18} className="mr-2 flex-shrink-0 text-slate-500 dark:text-slate-400" />;
  let textColor = 'text-slate-700 dark:text-slate-300';
  let bgColor = 'bg-slate-100 dark:bg-slate-700';
  let borderColor = 'border-slate-300 dark:border-slate-600';
  let statusColorHex = '#94a3b8';

  if (lowerStatus.includes('available')) {
    actualStatusOutput = 'Available';
    iconElement = <CheckCircle size={18} className="mr-2 flex-shrink-0 text-green-600 dark:text-green-400" />;
    textColor = 'text-green-700 dark:text-green-300';
    bgColor = 'bg-green-100 dark:bg-green-800/60';
    borderColor = 'border-green-500 dark:border-green-600';
    statusColorHex = '#22c55e';
  } else if (lowerStatus.includes('out of order') || lowerStatus.includes('service')) {
    actualStatusOutput = 'Out of Order';
    iconElement = <XCircle size={18} className="mr-2 flex-shrink-0 text-red-600 dark:text-red-400" />;
    textColor = 'text-red-700 dark:text-red-300';
    bgColor = 'bg-red-100 dark:bg-red-800/60';
    borderColor = 'border-red-500 dark:border-red-600';
    statusColorHex = '#ef4444';
  } else if (lowerStatus.includes('eoc') || lowerStatus.includes('cycle finished') || lowerStatus.includes('complete') || lowerStatus.includes('cycle complete')) {
    actualStatusOutput = 'Cycle Finished';
    iconElement = <CheckCircle size={18} className="mr-2 flex-shrink-0 text-teal-600 dark:text-teal-400" />;
    textColor = 'text-teal-700 dark:text-teal-300';
    bgColor = 'bg-teal-100 dark:bg-teal-800/60';
    borderColor = 'border-teal-500 dark:border-teal-600';
    statusColorHex = '#14b8a6';
  } else {
    const timeMatch = rawStatus.match(/(\d+)\s*min/i);
    if (timeMatch && parseInt(timeMatch[1], 10) > 0) {
      if (parseInt(timeMatch[1], 10) <= 5) {
        actualStatusOutput = 'Finishing Soon';
        iconElement = <Clock size={18} className="mr-2 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />;
        textColor = 'text-yellow-700 dark:text-yellow-300';
        bgColor = 'bg-yellow-100 dark:bg-yellow-800/60';
        borderColor = 'border-yellow-500 dark:border-yellow-600';
        statusColorHex = '#eab308';
      } else {
        actualStatusOutput = 'In Use';
        iconElement = <Zap size={18} className="mr-2 flex-shrink-0 text-blue-600 dark:text-blue-400" />;
        textColor = 'text-blue-700 dark:text-blue-300';
        bgColor = 'bg-blue-100 dark:bg-blue-800/60';
        borderColor = 'border-blue-500 dark:border-blue-600';
        statusColorHex = '#3b82f6';
      }
    } else if (lowerStatus === 'finishing soon') {
      actualStatusOutput = 'Finishing Soon';
      iconElement = <Clock size={18} className="mr-2 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />;
      textColor = 'text-yellow-700 dark:text-yellow-300';
      bgColor = 'bg-yellow-100 dark:bg-yellow-800/60';
      borderColor = 'border-yellow-500 dark:border-yellow-600';
      statusColorHex = '#eab308';
    } else if (lowerStatus.includes('in use')) {
      actualStatusOutput = 'In Use';
      iconElement = <Zap size={18} className="mr-2 flex-shrink-0 text-blue-600 dark:text-blue-400" />;
      textColor = 'text-blue-700 dark:text-blue-300';
      bgColor = 'bg-blue-100 dark:bg-blue-800/60';
      borderColor = 'border-blue-500 dark:border-blue-600';
      statusColorHex = '#3b82f6';
    } else if (rawStatus && rawStatus !== 'Unknown') {
      actualStatusOutput = rawStatus;
       iconElement = <AlertTriangle size={18} className="mr-2 flex-shrink-0 text-slate-500 dark:text-slate-400" />;
    } else {
      actualStatusOutput = "Status Unknown";
      iconElement = <AlertTriangle size={18} className="mr-2 flex-shrink-0 text-slate-500 dark:text-slate-400" />;
      textColor = 'text-slate-700 dark:text-slate-300';
      bgColor = 'bg-slate-100 dark:bg-slate-700';
      borderColor = 'border-slate-300 dark:border-slate-600';
    }
  }
  return { icon: iconElement, textColor, bgColor, actualStatus: String(actualStatusOutput), borderColor, statusColorHex };
};

const formatTime = (minutes) => {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h > 0 ? `${h}h ` : ''}${m}m`;
};

// --- Child Components ---

const MachineLayoutIcon = ({ machine, effectiveDarkMode, onMachineClick }) => {
    const { actualStatus, statusColorHex } = getStatusDetails(machine.status);
    const timeRemaining = formatTime(machine.timeRemaining);
    const machineNumber = String(machine.machineName || '').match(/\d+/)?.[0] || '??';
    const MachineTypeIcon = machine.type === 'Washer' ? Droplet : Wind;
    const machineIdForScroll = `machine-card-${machine.id || machine.machineName.replace(/\s+/g, '-')}`;


    let statusText = actualStatus;
    if ((actualStatus === 'In Use' || actualStatus === 'Finishing Soon') && timeRemaining) {
        statusText = timeRemaining;
    } else if (actualStatus === 'Cycle Finished') {
        statusText = 'Done';
    } else if (actualStatus === 'Out of Order') {
        statusText = 'Error';
    } else if (actualStatus === 'Available') {
        statusText = 'Open';
    }
    
    const machineBodyBg = effectiveDarkMode ? 'bg-slate-700' : 'bg-slate-200';
    const machineAccentBg = effectiveDarkMode ? 'bg-slate-600' : 'bg-slate-300';
    const machineTextColor = effectiveDarkMode ? 'text-slate-200' : 'text-slate-700';
    const machineIconColor = effectiveDarkMode ? 'text-slate-400' : 'text-slate-500';
    const doorShapeClasses = machine.type === 'Dryer' ? 'rounded-md' : 'rounded-full';
    const glassShapeClasses = machine.type === 'Dryer' ? 'rounded-sm' : 'rounded-full';

    return (
        <button
            onClick={() => onMachineClick(machineIdForScroll)}
            className={`flex-shrink-0 w-24 h-32 rounded-md flex flex-col items-center justify-between p-2 text-center shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-uvm-gold ${machineBodyBg} ${machineTextColor} border border-transparent hover:border-uvm-gold`}
            title={`${machine.machineName} - ${machine.type} - ${actualStatus}${timeRemaining ? ` (${timeRemaining} left)` : ''}`}
        >
            <div className={`w-full flex items-center justify-between px-1 py-0.5 rounded-t-sm border-b border-slate-400/50 ${machineAccentBg}`}>
                <MachineTypeIcon size={16} className={machineIconColor} />
                <span className="font-semibold text-xs">{machineNumber}</span>
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-slate-500/70" />
            </div>
            <div className="flex-grow flex items-center justify-center w-full my-1">
                <div
                    className={`relative flex h-12 w-12 items-center justify-center ${doorShapeClasses} border-[3px] border-slate-500 bg-slate-300 dark:bg-slate-800`}
                >
                    <div className={`absolute inset-1 ${glassShapeClasses} border border-slate-400/80 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-700`} />
                    <div className="relative h-3 w-3 rounded-full" style={{ backgroundColor: statusColorHex }} />
                    <div className="absolute right-1 top-1/2 h-1.5 w-1 -translate-y-1/2 rounded-full bg-slate-500" />
                </div>
            </div>
            <div className={`w-full px-1 py-0.5 rounded-b-sm text-xs font-medium ${machineAccentBg}`}>
                {statusText}
            </div>
        </button>
    );
};

const RoomLayout = ({ machines, effectiveDarkMode, onMachineClick }) => {
    const parseMachineNumber = (name) => {
        const match = String(name).match(/\d+/);
        return match ? parseInt(match[0], 10) : Infinity;
    };
    
    const sortedMachines = useMemo(() => [...machines].sort((a, b) => parseMachineNumber(a.machineName) - parseMachineNumber(b.machineName)), [machines]);

    const washers = sortedMachines.filter(m => m.type === 'Washer');
    
    const dryers = useMemo(() => {
        const sortedDryers = sortedMachines.filter(m => m.type === 'Dryer');
        const layout = [];
        let i = 0;
        while (i < sortedDryers.length) {
            const current = sortedDryers[i];
            const next = sortedDryers[i + 1];
            if (current.size && current.size.toLowerCase().includes('stack') &&
                next && next.size && next.size.toLowerCase().includes('stack') &&
                parseMachineNumber(next.machineName) === parseMachineNumber(current.machineName) + 1) {
                layout.push({ type: 'stack', top: current, bottom: next });
                i += 2;
            } else {
                layout.push(current);
                i += 1;
            }
        }
        return layout;
    }, [sortedMachines]);

    const renderMachineGroup = (title, machineGroup) => (
        machineGroup.length > 0 && (
            <div>
                <h4 className="text-lg font-semibold mb-4 text-gray-700 dark:text-slate-200">{title}</h4>
                <div className="flex flex-row items-start space-x-3 overflow-x-auto pb-3 -mb-3">
                    {machineGroup.map((item) => (
                        item.type === 'stack' ? (
                            <div key={item.top.id || item.top.machineName} className="flex flex-col space-y-2 items-center flex-shrink-0">
                                <MachineLayoutIcon machine={item.top} effectiveDarkMode={effectiveDarkMode} onMachineClick={onMachineClick} />
                                <MachineLayoutIcon machine={item.bottom} effectiveDarkMode={effectiveDarkMode} onMachineClick={onMachineClick} />
                            </div>
                        ) : (
                            <MachineLayoutIcon key={item.id || item.machineName} machine={item} effectiveDarkMode={effectiveDarkMode} onMachineClick={onMachineClick} />
                        )
                    ))}
                </div>
            </div>
        )
    );

    return (
        <div className="space-y-8">
            {renderMachineGroup("Washers", washers)}
            {renderMachineGroup("Dryers", dryers)}
             {washers.length === 0 && dryers.length === 0 && (
                <p className="text-gray-500 dark:text-slate-400">No machines to display in layout.</p>
            )}
        </div>
    );
};


const MachineCard = React.memo(({ machine, room, stale }) => {
  const { icon: statusIcon, textColor, bgColor, actualStatus, borderColor } = getStatusDetails(machine.status);
  const canSetAlert = !stale && (actualStatus === 'In Use' || actualStatus === 'Finishing Soon');
  const MachineTypeIcon = machine.type === 'Washer' ? Droplet : Wind;
  const formattedTimeRemaining = formatTime(machine.timeRemaining);
  const machineIdForScroll = `machine-card-${machine.id || machine.machineName.replace(/\s+/g, '-')}`;


  let placeholderText;
  if (actualStatus === 'Available') placeholderText = "Ready for use";
  else if (actualStatus === 'Out of Order') placeholderText = "Awaiting service";
  else if (actualStatus === 'Offline') placeholderText = "The machine is not reporting status";
  else if (actualStatus === 'Cycle Finished') placeholderText = machine.type === 'Washer' ? "Clothes left in washer" : "Clothes left in dryer";

  return (
    <article id={machineIdForScroll} tabIndex={-1} aria-label={machine.machineName} className={`ll-machine-card rounded-xl border ${borderColor} flex flex-col justify-between transition-shadow duration-200 hover:shadow-md`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 truncate" title={String(machine.machineName || `Machine ${machine.id}`)}>
              {String(machine.machineName || `Machine ${machine.id}`)}
            </h3>
            <div className="flex items-center text-sm text-gray-500 dark:text-slate-300 mt-1">
               <MachineTypeIcon size={16} className="mr-1.5 flex-shrink-0" />
              <span>{String(machine.type || 'N/A')} - {String(machine.size || 'N/A')}</span>
            </div>
          </div>
        </div>
        <div className="text-center my-4 py-3">
          <div className={`inline-flex items-center justify-center px-4 py-2.5 rounded-lg shadow-md ${bgColor} ${textColor}`}>
            {statusIcon}
            <span className="text-xl font-bold ml-2">
              {(actualStatus === 'In Use' || actualStatus === 'Finishing Soon') && formattedTimeRemaining ? formattedTimeRemaining : actualStatus}
            </span>
          </div>
          {(actualStatus === 'In Use' || actualStatus === 'Finishing Soon') && formattedTimeRemaining && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">remaining</p>
          )}
        </div>
      </div>
      <div className="p-4 pt-0">
        {placeholderText && (
          <div className="h-[46px] flex items-center justify-center text-sm text-gray-400 dark:text-slate-400">
            {placeholderText}
          </div>
        )}
        <MachineReport machine={machine} room={room} canSetAlert={canSetAlert} />
      </div>
    </article>
  );
});

function NextMachineAlert({ room, type, machines, eligible }) {
  const dialog = useRef(null);
  const [open, setOpen] = useState(false);
  const isWasher = type === 'Washer';
  const machineLabel = isWasher ? NEXT_WASHER_LABEL : NEXT_DRYER_LABEL;

  function showAlert() {
    dialog.current.showModal();
    setOpen(true);
  }

  return (
    <>
      {eligible && (
        <button type="button" onClick={showAlert}
          className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-uvm-green hover:bg-green-50 dark:border-slate-600 dark:text-uvm-gold dark:hover:bg-slate-700">
          <Bell size={16} /> Notify me when a {type.toLowerCase()} opens
        </button>
      )}
      <dialog ref={dialog} onClose={() => setOpen(false)} aria-label={machineLabel}
        className="ll-dialog w-[calc(100%-2rem)] max-w-md rounded-xl p-5 shadow-xl backdrop:bg-black/60">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold">{machineLabel}</h3>
          <form method="dialog">
            <button type="submit" aria-label={`Close ${type.toLowerCase()} alert`} className="rounded p-2 focus-visible:ring-2"><X size={20} /></button>
          </form>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{roomLabel(room)}</p>
        {open && <PushAlertForm room={room} watchType={type} machines={machines} canSetAlert={eligible} />}
      </dialog>
    </>
  );
}

function FavoriteAvailability({ room }) {
  const container = useRef(null);
  const [nearViewport, setNearViewport] = useState(() => !('IntersectionObserver' in window));
  const { machines, checkedAt, stale, failed } = useLaundryStatus(nearViewport ? room : null, { refreshInterval: 60_000, visibleOnly: true });

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setNearViewport(entry.isIntersecting), { rootMargin: '200px' });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const keepHeight = 'mt-3 min-h-[44px] text-sm text-slate-700 dark:text-slate-200';
  const [, setClock] = useState(0);

  useEffect(() => {
    const updateClock = () => { if (!document.hidden) setClock(Date.now()); };
    const timer = setInterval(updateClock, 15_000);
    document.addEventListener('visibilitychange', updateClock);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', updateClock);
    };
  }, []);

  if (!room.providerId || (!machines && failed)) return <div ref={container} className={keepHeight}>Live availability unavailable</div>;
  if (!checkedAt) return <div ref={container} className={keepHeight}>Checking availability…</div>;

  const available = machines.filter(({ status }) => status === 'Available');
  const washers = available.filter(({ type }) => type === 'Washer').length;
  const dryers = available.filter(({ type }) => type === 'Dryer').length;
  const minutes = Math.max(0, Math.floor((Date.now() - checkedAt) / 60_000));
  const age = minutes >= 60 ? `${Math.floor(minutes / 60)} hr ago` : minutes ? `${minutes} min ago` : 'just now';
  const saved = stale || minutes >= 2;
  return (
    <div ref={container} className={keepHeight}>
      {machines.some(({ status }) => status !== 'Unknown') && (
        <p className="text-sm font-semibold">{washers} {washers === 1 ? 'washer' : 'washers'} free · {dryers} {dryers === 1 ? 'dryer' : 'dryers'} free</p>
      )}
      <p className={`mt-1 text-xs ${saved ? 'text-amber-700 dark:text-amber-300' : ''}`}>{saved ? 'Saved snapshot' : 'Checked'} {age}</p>
    </div>
  );
}

const RoomCard = React.memo(({ room, onSelectRoom, isFavorite, onToggleFavorite, headingLevel = 3 }) => {
  const Heading = headingLevel === 5 ? 'h5' : headingLevel === 4 ? 'h4' : 'h3';

  function openRoom(event) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onSelectRoom(room.id);
  }

  return (
    <article className="ll-room-card">
      <div className="ll-room-card__topline">
        <div>
          <Heading className="ll-room-card__heading">
            <a href={roomPath(room)} onClick={openRoom} aria-label={roomLabel(room)} className="ll-room-card__title">
              {roomDisplayName(room)}
            </a>
          </Heading>
          {room.locationLabel && <p className="ll-room-card__location">{room.locationLabel}</p>}
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(room.id)}
          title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          aria-label={isFavorite ? `Remove ${roomDisplayName(room)} from favorites` : `Add ${roomDisplayName(room)} to favorites`}
          aria-pressed={isFavorite}
          className="ll-room-card__favorite"
        >
          <Star size={19} aria-hidden="true" className={isFavorite ? 'fill-current' : ''} />
        </button>
      </div>
      {isFavorite && <div className="ll-room-card__availability"><FavoriteAvailability room={room} /></div>}
      <span className="ll-room-card__action" aria-hidden="true">
        View room <ArrowRight size={16} />
      </span>
    </article>
  );
});

const EMPTY_MACHINES = [];
const OVERLAY_ROUTE_VIEWS = new Map([
  ['my-laundry', 'myLaundry'],
  ['information', 'help'],
  ['settings', 'settings'],
]);
const REMEMBER_ROOM_KEY = 'uvmLaundryRememberRoom';
const LAST_ROOM_KEY = 'uvmLaundryLastRoom';

function readPreference(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function savePreference(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Preferences still work for the current visit.
  }
}

function usePreference(key, fallback) {
  const [value, setValue] = useState(() => readPreference(key, fallback));
  useEffect(() => { savePreference(key, value); }, [key, value]);
  return [value, setValue];
}

function resolveFavoriteIds(saved) {
  return Array.isArray(saved)
    ? [...new Set(saved.map(id => findLaundryRoom(id)?.id ?? id))]
    : [];
}

function RoomLayoutPanel({ defaultOpen, machines, effectiveDarkMode, onMachineClick }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="ll-panel mb-8 px-5 py-4 sm:px-6">
      <h3>
        <button type="button" aria-expanded={open} aria-controls="room-layout"
          className="flex w-full items-center justify-between gap-3 rounded-md text-left text-lg font-semibold text-slate-900 focus-visible:ring-2 focus-visible:ring-uvm-green dark:text-slate-100 dark:focus-visible:ring-uvm-gold"
          onClick={() => setOpen(!open)}>
          <span className="flex items-center gap-2"><LayoutGrid size={19} className="text-uvm-gold" aria-hidden="true" /> Room Layout</span>
          <span className="text-sm font-medium text-uvm-green dark:text-uvm-gold">{open ? 'Hide' : 'Show'}</span>
        </button>
      </h3>
      <div id="room-layout" hidden={!open}>
        {open && <div className="mt-5">
          <RoomLayout machines={machines} effectiveDarkMode={effectiveDarkMode} onMachineClick={onMachineClick} />
        </div>}
      </div>
    </section>
  );
}

function RefreshRoomButton({ busy, refresh }) {
  const [spinning, setSpinning] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const showSuccess = refreshed && !spinning;
  const refreshing = busy || spinning;

  useEffect(() => {
    if (!showSuccess) return undefined;
    const timer = setTimeout(() => setRefreshed(false), 3000);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshed(false);
    setSpinning(true);
    setRefreshed(await refresh());
  }

  return (
    <>
      <button type="button" onClick={handleRefresh} className="ll-icon-button" aria-label="Refresh machine status"
        title="Refresh machine status" aria-disabled={refreshing} aria-busy={busy}>
        <RefreshCw size={20} aria-hidden="true" className={spinning ? 'll-refresh-spin' : undefined}
          onAnimationEnd={() => setSpinning(false)} />
      </button>
      <div role="status" className="ll-refresh-announcement">
        {showSuccess && (
          <span className="ll-refresh-toast">
            <CheckCircle size={18} aria-hidden="true" /> Successfully Refreshed
          </span>
        )}
      </div>
    </>
  );
}

// --- Main App Component ---
const App = () => {
  const [currentView, setCurrentView] = useState('home');
  const [previousView, setPreviousView] = useState('home');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [homeSearchTerm, setHomeSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [useSystemTheme, setUseSystemTheme] = usePreference('uvmLaundryUseSystemTheme', true);
  const [manualDarkMode, setManualDarkMode] = usePreference('uvmLaundryManualDarkMode', false);
  const [expandRoomLayout, setExpandRoomLayout] = usePreference('uvmLaundryExpandRoomLayout', true);
  const [expandPeakTimes, setExpandPeakTimes] = usePreference('uvmLaundryExpandPeakTimes', false);
  const [rememberRoom, setRememberRoom] = usePreference(REMEMBER_ROOM_KEY, false);
  const [machineScrollTarget, setMachineScrollTarget] = useState(null);

  const [systemDarkMode, setSystemDarkMode] = useState(false);
  const effectiveDarkMode = useMemo(() => useSystemTheme ? systemDarkMode : manualDarkMode, [useSystemTheme, systemDarkMode, manualDarkMode]);

  const [savedFavorites, setFavorites] = usePreference('uvmLaundryFavorites', []);
  const favorites = useMemo(() => resolveFavoriteIds(savedFavorites), [savedFavorites]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [campus, setCampus] = useState('all');

  const currentRoom = findLaundryRoom(selectedRoomId);
  const roomStatus = useLaundryStatus(currentView === 'roomDetail' ? currentRoom : null);
  const machines = roomStatus.machines ?? EMPTY_MACHINES;

  // --- Effects ---

  useEffect(() => {
    if (!selectedRoomId) return;
    savePreference(LAST_ROOM_KEY, selectedRoomId);
    if (!['uvmlaundry.com', 'www.uvmlaundry.com'].includes(window.location.hostname) || navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
    fetch('https://alerts.uvmlaundry.com/metrics', {
      method: 'POST', body: new URLSearchParams({ metric: 'room_view', label: selectedRoomId }),
      keepalive: true, credentials: 'omit', referrerPolicy: 'no-referrer',
    }).catch(() => {});

  }, [selectedRoomId]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDarkMode(mediaQuery.matches);
    const handler = (e) => setSystemDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', effectiveDarkMode);
    root.dataset.theme = effectiveDarkMode ? 'dark' : 'light';
  }, [effectiveDarkMode]);
  
  const handleSelectRoom = useCallback((roomId, updateHash = true) => {
    const room = findLaundryRoom(roomId);
    if (!room) return;
    setMachineScrollTarget(null);
    setSelectedRoomId(room.id);
    setCurrentView('roomDetail');
    setSearchTerm('');
    setFilterStatus('All');
    if (updateHash) window.location.hash = roomPath(room);
  }, []);

  const handleGoHome = useCallback((updateHash = true) => {
    setMachineScrollTarget(null);
    setCurrentView('home');
    setSelectedRoomId('');
    setSearchTerm('');
    setFilterStatus('All');
    setHomeSearchTerm('');
    if (updateHash && window.location.pathname !== '/') window.history.pushState(null, '', '/');
    else if (updateHash && window.location.hash) window.location.hash = '';
  }, []);

  useEffect(() => {
    const syncRoute = () => {
      const url = new URL(window.location.href);
      const overlayView = OVERLAY_ROUTE_VIEWS.get(url.searchParams.get('view'));
      const [hash, query = ''] = url.hash.replace(/^#\/?(?:room\/)?/, '').split(/\?(.*)/s, 2);
      const room = findLaundryRoom(hash);
      if (!room) {
        if (overlayView) {
          url.searchParams.delete('view');
          window.history.replaceState(null, '', url);
          setSelectedRoomId('');
          setPreviousView('home');
          setCurrentView(overlayView);
        } else if (url.hash || url.pathname !== '/') {
          setSelectedRoomId('');
          setMachineScrollTarget(null);
          setCurrentView('notFound');
        } else {
          handleGoHome(false);
        }
        return;
      }
      const canonicalHash = roomPath(room) + (query ? '?' + query : '');
      if (url.hash !== canonicalHash || url.pathname !== '/' || overlayView) {
        if (overlayView) url.searchParams.delete('view');
        url.pathname = '/';
        url.hash = canonicalHash;
        window.history.replaceState(null, '', url);
      }
      handleSelectRoom(room.id, false);
      const machineId = new URLSearchParams(query).get('machine');
      if (machineId && /^\d+$/.test(machineId)) {
        setMachineScrollTarget(`machine-card-${machineId}`);
      }
    };
    const requestedOverlay = OVERLAY_ROUTE_VIEWS.has(new URLSearchParams(window.location.search).get('view'));
    const lastRoom = window.location.pathname === '/' && !window.location.hash && !requestedOverlay && readPreference(REMEMBER_ROOM_KEY, false)
      ? findLaundryRoom(readPreference(LAST_ROOM_KEY, null))
      : null;
    if (lastRoom) {
      window.history.replaceState(null, '', roomPath(lastRoom));
      handleSelectRoom(lastRoom.id, false);
    } else {
      syncRoute();
    }
    const onWorkerMessage = (event) => {
      if (event.data?.type === 'OPEN_MACHINE' && event.data.path === window.location.hash) syncRoute();
    };
    window.addEventListener('hashchange', syncRoute);
    navigator.serviceWorker?.addEventListener('message', onWorkerMessage);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      navigator.serviceWorker?.removeEventListener('message', onWorkerMessage);
    };
  }, [handleSelectRoom, handleGoHome]);

  useEffect(() => {
    if (currentView !== 'roomDetail' || !machineScrollTarget) return;
    const element = document.getElementById(machineScrollTarget);
    if (!element) return;
    setMachineScrollTarget(null);
    element.focus({ preventScroll: true });
    element.scrollIntoView?.({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    const highlight = ['ring-2', 'ring-uvm-gold', 'ring-offset-2', 'dark:ring-offset-slate-800'];
    element.classList.add(...highlight);
    setTimeout(() => element.classList.remove(...highlight), 1500);
  }, [currentView, machines, machineScrollTarget]);

  const openMachine = (event, room, machineId) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const path = machineId ? machinePath(room, machineId) : roomPath(room);
    if (window.location.hash !== path) window.history.pushState(null, '', path);
    handleSelectRoom(room.id, false);
    if (machineId) {
      setMachineScrollTarget(`machine-card-${machineId}`);
    }
  };

  const handleScrollToMachine = (machineCardId) => {
    setSearchTerm('');
    setFilterStatus('All');
    setMachineScrollTarget(machineCardId);
  };

  const handleBackFromOverlay = () => setCurrentView(previousView);
  const handleOpenOverlay = (view) => {
    if (['home', 'roomDetail', 'notFound'].includes(currentView)) setPreviousView(currentView);
    setCurrentView(view);
  };

  const toggleFavorite = (roomId) => setFavorites((previous) => {
    const ids = resolveFavoriteIds(previous);
    return ids.includes(roomId) ? ids.filter(id => id !== roomId) : [...ids, roomId];
  });

  // --- Memoized Selectors for Filtering and Derived Data ---
  const filteredHomeRooms = useMemo(() => {
    let roomsToDisplay = campus === 'all' ? laundryRooms : laundryRooms.filter(room => room.campus === campus);
    if (showOnlyFavorites) roomsToDisplay = roomsToDisplay.filter(room => favorites.includes(room.id));
    if (homeSearchTerm.trim() !== '') {
      const lowerSearchTerm = homeSearchTerm.trim().toLowerCase();
      roomsToDisplay = roomsToDisplay.filter(room => [roomLabel(room), room.name, room.officialName,
        room.id.startsWith('central_campus_') ? `CCRH ${room.id.split('_').pop()}` : '',
      ].some(label => label?.toLowerCase().includes(lowerSearchTerm)));
    }
    return roomsToDisplay;
  }, [campus, showOnlyFavorites, homeSearchTerm, favorites]);
  const visibleCampusSections = useMemo(() => CAMPUS_SECTIONS.map(([id, label]) => ({
    id,
    label,
    rooms: filteredHomeRooms.filter((room) => room.campus === id),
  })).filter(({ rooms }) => rooms.length > 0), [filteredHomeRooms]);
  
  const allWashers = useMemo(() => machines.filter(machine => machine.type === 'Washer'), [machines]);
  const unknownMachines = machines.filter(({ status }) => status === 'Unknown').length;
  const hasUsableStatus = machines.length > unknownMachines;
  const allDryers = useMemo(() => machines.filter(machine => machine.type === 'Dryer'), [machines]);

  const filterMachineList = useCallback((list) => list.filter(machine => {
    const { actualStatus: machineActualStatus } = getStatusDetails(machine.status);
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchLower || (String(machine.machineName || '')).toLowerCase().includes(searchLower) || (String(machine.id || '')).toLowerCase().includes(searchLower) || (String(machine.type || '')).toLowerCase().includes(searchLower) || (machine.size && String(machine.size).toLowerCase().includes(searchLower));
    const matchesStatus = filterStatus === 'All' || machineActualStatus === filterStatus;
    return matchesSearch && matchesStatus;
  }), [searchTerm, filterStatus]);

  const filteredWashers = useMemo(() => filterMachineList(allWashers), [allWashers, filterMachineList]);
  const filteredDryers = useMemo(() => filterMachineList(allDryers), [allDryers, filterMachineList]);
  
  const availableWashersInRoom = useMemo(() => allWashers.filter(m => getStatusDetails(m.status).actualStatus === 'Available').length, [allWashers]);
  const availableDryersInRoom = useMemo(() => allDryers.filter(m => getStatusDetails(m.status).actualStatus === 'Available').length, [allDryers]);

  const statusOptions = ['All', 'Available', 'Ready to Start', 'In Use', 'Finishing Soon', 'Cycle Finished', 'Door Open', 'Reserved', 'Out of Order', 'Offline', 'Status Unknown'];

  const inputBaseClasses = "ll-input w-full h-12 p-3 border rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 placeholder-gray-400 dark:placeholder-slate-400";
  const inputFocusClasses = "focus:ring-uvm-gold focus:border-uvm-gold";
  const inputBorderClasses = "border-gray-300 dark:border-slate-600";

  const renderRoomCards = (rooms, headingLevel) => (
    <div className="ll-room-grid flex flex-wrap gap-4 md:gap-5">
      {rooms.map(room => (
        <RoomCard
          key={room.id}
          room={room}
          onSelectRoom={handleSelectRoom}
          isFavorite={favorites.includes(room.id)}
          onToggleFavorite={toggleFavorite}
          headingLevel={headingLevel}
        />
      ))}
    </div>
  );

  const renderComplexSection = (section, sectionCampus, headingLevel) => {
    const Heading = headingLevel === 4 ? 'h4' : 'h3';
    const headingId = `room-group-${sectionCampus}-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    return (
      <section key={headingId} className="ll-complex-section" aria-labelledby={headingId}>
        <Heading id={headingId} className="ll-complex-section__title">{section.title}</Heading>
        {renderRoomCards(section.rooms, headingLevel + 1)}
      </section>
    );
  };
  // --- Render Functions ---
  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <div key="home" className="animate-fadeIn">
            <div className="ll-home-hero">
              <p className="ll-home-tagline">Know before you go.</p>
              <p className="ll-home-copy">Check reported washer and dryer status before you head downstairs.</p>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-end mb-8 gap-4">
              <h2 className="ll-room-list-heading text-2xl lg:text-4xl font-bold md:mb-0 mb-3 whitespace-nowrap">
                {showOnlyFavorites ? "Favorite Laundry Rooms" : "All Laundry Rooms"}
              </h2>
              <div className="flex-grow md:flex-grow-0 w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-auto flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"> <Search size={18} className="text-gray-500 dark:text-slate-300" /> </div>
                  <input type="text" placeholder="Search rooms..." value={homeSearchTerm} onChange={(e) => setHomeSearchTerm(e.target.value)} className={`${inputBaseClasses} ${inputBorderClasses} ${inputFocusClasses} pl-10`} />
                </div>
                <button type="button" aria-pressed={showOnlyFavorites} onClick={() => setShowOnlyFavorites(!showOnlyFavorites)} className="ll-favorites-toggle w-full whitespace-nowrap px-4 py-3 sm:w-auto">
                    <Star size={18} className={showOnlyFavorites ? 'fill-current' : ''} />
                    {showOnlyFavorites ? "Show All" : "Show Favorites"}
                </button>
              </div>
            </div>
            <>
              <h3 className="ll-campus-filter-heading">Campuses</h3>
              <div role="group" aria-label="Filter rooms by campus" className="mb-5 flex flex-wrap gap-2">
                {[['all', 'All'], ...CAMPUS_SECTIONS].map(([id, label]) => (
                  <button type="button" key={id} aria-pressed={campus === id} onClick={() => setCampus(id)}
                    className="ll-campus-filter min-h-[44px] rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uvm-gold">
                    {label}
                  </button>
                ))}
              </div>
            </>
            {filteredHomeRooms.length === 0 ? (
              <div className="ll-empty-state text-center py-16 p-8">
                <Info size={64} className="mx-auto opacity-50 mb-4 text-uvm-green dark:text-uvm-gold" />
                <p className="mt-4 text-xl font-semibold">
                  {homeSearchTerm.trim() !== '' ? 'No Rooms Match Your Search' : (showOnlyFavorites ? "No Favorite Rooms Yet" : "No Laundry Rooms Found")}
                </p>
                <p className="text-sm mt-2 opacity-80">
                  {homeSearchTerm.trim() !== '' ? 'Try a different search term or choose All.' : (showOnlyFavorites ? "Choose another campus or add a room to your favorites." : "We couldn't find any laundry rooms at the moment.")}
                </p>
              </div>
            ) : (
              visibleCampusSections.map(({ id: campusId, label, rooms }) => {
                const headingId = `campus-rooms-${campusId}`;
                return (
                  <section key={campusId} id={headingId} className="ll-campus-section" aria-labelledby={headingId}>
                    <h3 className="ll-campus-section__title">{label}</h3>
                    {groupCampusRooms(rooms, campusId).map(section => renderComplexSection(section, campusId, 4))}
                  </section>
                );
              })
            )}
          </div>
        );
      case 'roomDetail':
        return (
          <div key="roomDetail" className="animate-fadeIn">
            <div className="ll-room-header">
              <BackButton onClick={() => handleGoHome()}>All Rooms</BackButton>
              <RoomSwitcher room={currentRoom} onSelectRoom={handleSelectRoom} />
              <RoomTools key={`tools-${currentRoom.id}`} room={currentRoom} />
            </div>
            {roomStatus.failed && (
              <div role="status" className="mb-6 rounded-md border-l-4 border-yellow-500 bg-yellow-100 p-4 text-yellow-900 dark:bg-yellow-700/30 dark:text-yellow-200">
                {roomStatus.stale ? 'Live refresh failed. Showing the last saved machine statuses.' : 'Live machine status is unavailable. Try refreshing or open the LaundryConnect page.'}
                {' '}<a className="font-semibold underline" href="/status/">Service status</a>
                {' '}<a className="font-semibold underline" href={getOfficialRoomUrl(currentRoom)} target="_blank" rel="noopener noreferrer">LaundryConnect page</a>
              </div>
            )}
            {roomStatus.busy && !roomStatus.checkedAt && (
              <p role="status" className="mb-6 text-gray-600 dark:text-slate-300">Loading live machine status…</p>
            )}
            <RoomPeakTimes key={`peak-${currentRoom.id}`} room={currentRoom} defaultOpen={expandPeakTimes} />
            {roomStatus.checkedAt && !hasUsableStatus && (
              <p role="status" className="mb-6 rounded-lg bg-amber-100 p-4 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                The provider returned no usable machine statuses. <a className="font-semibold underline" href="/status/">Service status</a>
                {' '}<a className="font-semibold underline" href={getOfficialRoomUrl(currentRoom)} target="_blank" rel="noopener noreferrer">LaundryConnect page</a>
              </p>
            )}
            {roomStatus.checkedAt && <>
            <div className="ll-panel mb-8 p-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Search Machines</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <Search size={18} className="text-gray-500 dark:text-slate-300" /> </div>
                    <input type="text" id="search" placeholder="e.g., Washer 13 or Dryer" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputBaseClasses} ${inputBorderClasses} ${inputFocusClasses} pl-10`} />
                  </div>
                </div>
                <div>
                  <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Filter by Status</label>
                  <select id="statusFilter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputBaseClasses} ${inputBorderClasses} ${inputFocusClasses}`}>
                    {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              {hasUsableStatus && <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-slate-300">
                <p>Washers: <span className="font-semibold text-uvm-green dark:text-uvm-gold">{availableWashersInRoom}</span> Available / <span className="font-semibold">{allWashers.length}</span> Total</p>
                <p>Dryers: <span className="font-semibold text-uvm-green dark:text-uvm-gold">{availableDryersInRoom}</span> Available / <span className="font-semibold">{allDryers.length}</span> Total</p>
              </div>}
              {hasUsableStatus && unknownMachines > 0 && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Status unavailable for {unknownMachines} {unknownMachines === 1 ? 'machine' : 'machines'}.
                </p>
              )}
              <NextMachineAlert key={`${currentRoom.id}-washers`} room={currentRoom} type="Washer" machines={allWashers}
                eligible={!roomStatus.stale && canWatchNextMachine(allWashers, 'Washer')} />
              <NextMachineAlert key={`${currentRoom.id}-dryers`} room={currentRoom} type="Dryer" machines={allDryers}
                eligible={!roomStatus.stale && canWatchNextMachine(allDryers, 'Dryer')} />
              <p className={`text-xs mt-4 text-right ${roomStatus.stale ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-500 dark:text-slate-400'}`}>{roomStatus.stale ? 'Saved snapshot' : hasUsableStatus ? 'Live · Last checked' : 'Last checked'} · <time dateTime={new Date(roomStatus.checkedAt).toISOString()}>{new Date(roomStatus.checkedAt).toLocaleString()}</time></p>
            </div>

            {machines.length > 0 && (
              <RoomLayoutPanel key={currentRoom.id} defaultOpen={expandRoomLayout} machines={machines}
                effectiveDarkMode={effectiveDarkMode} onMachineClick={handleScrollToMachine} />
            )}
            <div id="machine-list">
            {machines.length === 0 ? (
                 <div className="ll-empty-state text-center py-16 p-8"><Info size={64} className="mx-auto opacity-50 mb-4 text-uvm-green dark:text-uvm-gold" /><p className="mt-4 text-xl font-semibold">No Machines Found</p><p className="text-sm mt-2 opacity-80">The provider has no machines listed for this room.</p></div>
            ) : (
              <>
                {filteredWashers.length > 0 && (
                  <div className="mb-10">
                    <h3 className={`text-2xl font-semibold mb-5 pb-3 border-b-2 ${effectiveDarkMode ? 'text-white border-slate-700' : 'text-gray-900 border-gray-300'}`}>Washers</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                      {filteredWashers.map(machine => <MachineCard key={machine.id || machine.machineName} machine={machine} room={currentRoom} stale={roomStatus.stale} />)}
                    </div>
                  </div>
                )}
                {filteredDryers.length > 0 && (
                  <div>
                    <h3 className={`text-2xl font-semibold mb-5 pb-3 border-b-2 ${effectiveDarkMode ? 'text-white border-slate-700' : 'text-gray-900 border-gray-300'}`}>Dryers</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                       {filteredDryers.map(machine => <MachineCard key={machine.id || machine.machineName} machine={machine} room={currentRoom} stale={roomStatus.stale} />)}
                     </div>
                  </div>
                )}
                 {filteredWashers.length === 0 && filteredDryers.length === 0 && machines.length > 0 && (
                     <div className="ll-empty-state text-center py-10 p-6"><Info size={48} className="mx-auto opacity-50 mb-3" /><p>No machines match your current filters.</p></div>
                 )}
              </>
            )}
            </div>
            </>}
          </div>
        );
      case 'notFound':
        return (
          <section className="ll-panel mx-auto max-w-2xl p-6 sm:p-8 animate-fadeIn">
            <h1 className="text-3xl font-bold lg:text-4xl">Page not found</h1>
            <p className="mb-6 mt-3 text-slate-600 dark:text-slate-300">This link doesn’t match a laundry room or page. Choose your room from the directory or return to the tracker.</p>
            <div className="flex flex-wrap gap-3">
              <a className="ll-back-button" href="/residence-halls/">Browse the campus directory</a>
              <a className="ll-back-button" href="/">Return to the tracker</a>
            </div>
          </section>
        );
      case 'myLaundry':
        return <MyLaundry onBack={handleBackFromOverlay} onOpenMachine={openMachine} />;
      case 'help':
        return <LaundryHelp onBack={handleBackFromOverlay} />;
      case 'settings':
        return (
          <div key="settings" className="ll-panel max-w-2xl mx-auto p-6 sm:p-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl lg:text-4xl font-bold">Settings</h2>
              <BackButton onClick={handleBackFromOverlay} />
            </div>
            <div className="space-y-10">
              <section>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 border-b pb-3 border-gray-200 dark:border-slate-700">Display</h3>
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/60 rounded-lg">
                    <label htmlFor="systemThemeToggle" className="text-gray-700 dark:text-slate-200 flex items-center text-sm sm:text-base cursor-pointer"><span className="mr-2.5">{useSystemTheme ? <Eye size={20} className="text-uvm-green dark:text-uvm-gold" /> : <EyeOff size={20} className="text-gray-500 dark:text-slate-300" />}</span>Use System Theme</label>
                    <button id="systemThemeToggle" role="switch" aria-checked={useSystemTheme} onClick={() => setUseSystemTheme(!useSystemTheme)} className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold ${useSystemTheme ? 'bg-green-600 dark:bg-green-600' : 'bg-gray-300 dark:bg-slate-500'}`}><span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${useSystemTheme ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                  </div>
                  {!useSystemTheme && (<div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/60 rounded-lg animate-fadeIn">
                    <label htmlFor="manualDarkModeToggle" className="text-gray-700 dark:text-slate-200 flex items-center text-sm sm:text-base cursor-pointer"><span className="mr-2.5">{manualDarkMode ? <Moon size={20} className="text-uvm-gold" /> : <Sun size={20} className="text-yellow-500" />}</span>Dark Mode</label>
                    <button id="manualDarkModeToggle" role="switch" aria-checked={manualDarkMode} onClick={() => setManualDarkMode(!manualDarkMode)} className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold ${manualDarkMode ? 'bg-green-600 dark:bg-green-600' : 'bg-gray-300 dark:bg-slate-500'}`}><span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${manualDarkMode ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                  </div>)}
                </div>
              </section>
              <section>
                <h3 className="mb-4 text-xl font-semibold">Room Preferences</h3>
                <div className="space-y-5">
                  {[
                    ['rememberRoomToggle', 'Open my last room on startup', Star, rememberRoom, setRememberRoom],
                    ['visualLayoutToggle', 'Expand Visual Room Layout by default', LayoutGrid, expandRoomLayout, setExpandRoomLayout],
                    ['peakTimesToggle', 'Expand Peak Times by default', Clock, expandPeakTimes, setExpandPeakTimes],
                  ].map(([id, label, Icon, checked, setChecked]) => (
                    <div key={id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-4 dark:bg-slate-700/60">
                      <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700 dark:text-slate-200 sm:text-base">
                        <Icon size={20} aria-hidden="true" className={`shrink-0 ${checked ? 'text-uvm-green dark:text-uvm-gold' : 'text-gray-500 dark:text-slate-300'}`} />
                        {label}
                      </label>
                      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => setChecked(value => !value)}
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-uvm-gold focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${checked ? 'bg-green-600 dark:bg-green-600' : 'bg-gray-300 dark:bg-slate-500'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 border-b pb-3 border-gray-200 dark:border-slate-700">Report Issues</h3>
                 <div className="space-y-3">
                    <p className="text-sm text-gray-700 dark:text-slate-300">
                        If you encounter a broken machine, please report it to Automatic Laundry.
                    </p>
                    <a href={SERVICE_REQUEST_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold transition-colors text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold shadow-sm" style={{backgroundColor: BRAND_GREEN}}>
                        <ExternalLink size={18} className="mr-2" /> Report a Broken Machine
                    </a>
                </div>
              </section>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="ll-app min-h-screen font-sans">
      <HomeScreenPrompt />
      <header className="ll-site-header sticky top-0 z-50">
        <div className="ll-header-inner">
          <div className="ll-header-row">
            <button onClick={() => handleGoHome()} aria-label="UVM LaundryLink home" className="ll-brand">
              <img src="/brand-mark.svg" alt="" aria-hidden="true" className="ll-brand__mark" />
              <span className="ll-brand__name">UVM LaundryLink</span>
            </button>
            <div className="ll-header-actions">
              {currentView === 'roomDetail' && currentRoom?.providerId && (
                <RefreshRoomButton key={currentRoom.id} busy={roomStatus.busy} refresh={roomStatus.refresh} />
              )}
              <button onClick={() => handleOpenOverlay('myLaundry')} className="ll-icon-button" aria-label="My Laundry" title="My Laundry">
                <Bell size={20} />
              </button>
              <button onClick={() => handleOpenOverlay('help')} className="ll-icon-button" aria-label="Information" title="Information"><Info size={20} /></button>
              <button onClick={() => handleOpenOverlay('settings')} className="ll-icon-button" aria-label="Settings" title="Settings"><Settings size={20} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="ll-main">
        {renderContent()}
      </main>

      <footer className="ll-site-footer">
        <div className="ll-footer-inner">
          <p>Independent student project by Ivan Minier · {new Date().getFullYear()}</p>
          <p className="ll-disclaimer">Not affiliated with the University of Vermont or Automatic Laundry. Status is based on provider-reported data.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
