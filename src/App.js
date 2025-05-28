import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Zap, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, Settings, Star, ArrowLeft, ExternalLink, Droplet, Wind, MessageCircle, Smartphone, Eye, EyeOff, Info, Search, Sun, Moon, LayoutGrid } from 'lucide-react';

// UVM Colors
const UVM_GREEN = '#154734';
const UVM_GOLD = '#fdb515';
const UVM_LOGO_URL = 'https://i.imgur.com/kvyrGbL.png'; // Placeholder for UVM Logo

// --- Refresh Interval Configuration ---
const ACTIVE_ROOM_REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds for active room

// --- Backend URL Configuration (Hardcoded) ---
const BACKEND_BASE_URL = 'https://api.uvmlaundry.com';


// Helper function to get status color and icon
const getStatusDetails = (status) => {
  const rawStatus = String(status || 'Unknown').trim();
  const lowerStatus = rawStatus.toLowerCase();
  let actualStatusOutput = "Unknown";
  let iconElement = <AlertTriangle size={18} className="mr-2 flex-shrink-0 text-slate-500 dark:text-slate-400" />;
  let textColor = 'text-slate-700 dark:text-slate-300';
  let bgColor = 'bg-slate-100 dark:bg-slate-700';
  let borderColor = 'border-slate-300 dark:border-slate-600';
  let statusColorHex = '#94a3b8'; // slate-400 default for layout icon

  if (lowerStatus.includes('available')) {
    actualStatusOutput = 'Available';
    iconElement = <CheckCircle size={18} className="mr-2 flex-shrink-0 text-green-600 dark:text-green-400" />;
    textColor = 'text-green-700 dark:text-green-300';
    bgColor = 'bg-green-100 dark:bg-green-800/60';
    borderColor = 'border-green-500 dark:border-green-600';
    statusColorHex = '#22c55e'; // green-500
  } else if (lowerStatus.includes('out of order') || lowerStatus.includes('service') || lowerStatus.includes('offline')) {
    actualStatusOutput = 'Out of Order';
    iconElement = <XCircle size={18} className="mr-2 flex-shrink-0 text-red-600 dark:text-red-400" />;
    textColor = 'text-red-700 dark:text-red-300';
    bgColor = 'bg-red-100 dark:bg-red-800/60';
    borderColor = 'border-red-500 dark:border-red-600';
    statusColorHex = '#ef4444'; // red-500
  } else if (lowerStatus.includes('eoc') || lowerStatus.includes('cycle finished') || lowerStatus.includes('complete') || lowerStatus.includes('cycle complete')) {
    actualStatusOutput = 'Cycle Finished';
    iconElement = <CheckCircle size={18} className="mr-2 flex-shrink-0 text-teal-600 dark:text-teal-400" />;
    textColor = 'text-teal-700 dark:text-teal-300';
    bgColor = 'bg-teal-100 dark:bg-teal-800/60';
    borderColor = 'border-teal-500 dark:border-teal-600';
    statusColorHex = '#14b8a6'; // teal-500
  } else {
    const timeMatch = rawStatus.match(/(\d+)\s*min/i);
    if (timeMatch && parseInt(timeMatch[1], 10) > 0) {
      if (parseInt(timeMatch[1], 10) <= 5) {
        actualStatusOutput = 'Finishing Soon';
        iconElement = <Clock size={18} className="mr-2 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />;
        textColor = 'text-yellow-700 dark:text-yellow-300';
        bgColor = 'bg-yellow-100 dark:bg-yellow-800/60';
        borderColor = 'border-yellow-500 dark:border-yellow-600';
        statusColorHex = '#eab308'; // yellow-500
      } else {
        actualStatusOutput = 'In Use';
        iconElement = <Zap size={18} className="mr-2 flex-shrink-0 text-blue-600 dark:text-blue-400" />;
        textColor = 'text-blue-700 dark:text-blue-300';
        bgColor = 'bg-blue-100 dark:bg-blue-800/60';
        borderColor = 'border-blue-500 dark:border-blue-600';
        statusColorHex = '#3b82f6'; // blue-500
      }
    } else if (lowerStatus.includes('in use')) {
      actualStatusOutput = 'In Use';
      iconElement = <Zap size={18} className="mr-2 flex-shrink-0 text-blue-600 dark:text-blue-400" />;
      textColor = 'text-blue-700 dark:text-blue-300';
      bgColor = 'bg-blue-100 dark:bg-blue-800/60';
      borderColor = 'border-blue-500 dark:border-blue-600';
      statusColorHex = '#3b82f6'; // blue-500
    } else if (rawStatus && rawStatus !== 'Unknown') {
      actualStatusOutput = rawStatus.replace(/\b\w/g, l => l.toUpperCase());
       iconElement = <AlertTriangle size={18} className="mr-2 flex-shrink-0 text-slate-500 dark:text-slate-400" />;
       // Keep default statusColorHex for custom unknown states
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

const formatPhoneNumber = (value) => {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
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

    const isDryer = machine.type === 'Dryer';

    return (
        <button
            onClick={() => onMachineClick(machineIdForScroll)}
            className={`flex-shrink-0 w-24 h-32 rounded-md flex flex-col items-center justify-between p-2 text-center shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-uvm-gold ${machineBodyBg} ${machineTextColor} border border-transparent hover:border-uvm-gold`}
            title={`${machine.machineName} - ${machine.type} - ${actualStatus}${timeRemaining ? ` (${timeRemaining} left)` : ''}`}
        >
            {/* Top panel with number and type icon */}
            <div className={`w-full flex items-center justify-between px-1 py-0.5 rounded-t-sm ${machineAccentBg}`}>
                <MachineTypeIcon size={16} className={machineIconColor} />
                <span className="font-semibold text-xs">{machineNumber}</span>
            </div>

            {/* "Door" or main status area */}
            <div className="flex-grow flex items-center justify-center w-full my-1">
                <div
                    className={`w-10 h-10 flex items-center justify-center border-2 ${isDryer ? 'rounded-sm' : 'rounded-full'}`}
                    style={{ borderColor: statusColorHex, backgroundColor: `${statusColorHex}33` /* 20% opacity */ }}
                >
                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColorHex }}></div>
                </div>
            </div>
            
            {/* Status text */}
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
                {/* Container for horizontal scrolling row of machines */}
                <div className="flex flex-row items-start space-x-3 overflow-x-auto pb-3 -mb-3"> {/* Added pb-3 and -mb-3 for scrollbar visibility */}
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


const MachineCard = React.memo(({ machine, onSetUpSmsAlert, isAlertSet }) => {
  const { icon: statusIcon, textColor, bgColor, actualStatus, borderColor } = getStatusDetails(machine.status);
  const canSetAlertInitially = actualStatus === 'In Use' || actualStatus === 'Finishing Soon';
  const MachineTypeSpecificIcon = machine.type === 'Washer' ? Droplet : Wind;
  const formattedTimeRemaining = formatTime(machine.timeRemaining);
  const machineIdForScroll = `machine-card-${machine.id || machine.machineName.replace(/\s+/g, '-')}`;


  let placeholderText = "Alert not applicable";
  if (actualStatus === 'Available') placeholderText = "Ready for use";
  else if (actualStatus === 'Out of Order') placeholderText = "Awaiting service";
  else if (actualStatus === 'Cycle Finished') placeholderText = machine.type === 'Washer' ? "Clothes left in washer" : "Clothes left in dryer";

  return (
    <div id={machineIdForScroll} className={`rounded-xl shadow-lg bg-white dark:bg-slate-800 border ${borderColor} flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 truncate" title={String(machine.machineName || `Machine ${machine.id}`)}>
              {String(machine.machineName || `Machine ${machine.id}`)}
            </h3>
            <div className="flex items-center text-sm text-gray-500 dark:text-slate-300 mt-1">
              <MachineTypeSpecificIcon size={16} className="mr-1.5 flex-shrink-0" />
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
        {isAlertSet && canSetAlertInitially ? (
          <div className="w-full font-semibold py-3 px-4 rounded-lg text-sm flex items-center justify-center text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800/60">
            <CheckCircle size={18} className="mr-2" /> Alert Set
          </div>
        ) : canSetAlertInitially ? (
          <button
            onClick={() => onSetUpSmsAlert(machine)}
            className="w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold"
            style={{backgroundColor: UVM_GREEN}}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f3927'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = UVM_GREEN}
          >
            <MessageCircle size={18} className="mr-2" /> Set SMS Alert
          </button>
        ) : (
          <div className="h-[46px] flex items-center justify-center text-sm text-gray-400 dark:text-slate-400">
            {placeholderText}
          </div>
        )}
      </div>
    </div>
  );
});

const RoomCard = React.memo(({ room, onSelectRoom, isFavorite, onToggleFavorite }) => (
    <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectRoom(room.id)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRoom(room.id)}
        style={{ '--gradient-start-color': UVM_GREEN }}
        className={`rounded-xl shadow-lg p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer h-full min-h-[170px] sm:min-h-[190px] group relative overflow-hidden bg-gradient-to-br from-[var(--gradient-start-color)] to-green-800 dark:from-[var(--gradient-start-color)] dark:to-green-700 hover:shadow-[0_0_20px_3px_rgba(253,181,21,0.6)] focus:outline-none focus:ring-4 focus:ring-yellow-400/80`}
    >
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        <div className="relative z-10 flex-grow">
            <h3 className="text-xl sm:text-2xl font-bold mb-2 text-white group-hover:text-yellow-400 transition-colors">{String(room.name)}</h3>
        </div>
        <div className="flex items-center justify-end mt-auto pt-3 relative z-10">
            <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(room.id); }}
                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/80"
            >
                <Star size={22} className={`transition-colors ${isFavorite ? `text-yellow-400 fill-yellow-400` : 'text-white/60 group-hover:text-white'}`} />
            </button>
        </div>
    </div>
));

// --- Main App Component ---
const App = () => {
  const [currentView, setCurrentView] = useState('home');
  const [previousViewBeforeSettings, setPreviousViewBeforeSettings] = useState('home');
  const [laundryRooms, setLaundryRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [machines, setMachines] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [homeSearchTerm, setHomeSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Theme and Feature Settings
  const [useSystemTheme, setUseSystemTheme] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uvmLaundryUseSystemTheme') || 'true'); }
    catch (e) { console.warn("Failed to parse useSystemTheme from localStorage", e); return true; }
  });
  const [manualDarkMode, setManualDarkMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uvmLaundryManualDarkMode') || 'false'); }
    catch (e) { console.warn("Failed to parse manualDarkMode from localStorage", e); return false; }
  });
  const [showVisualLayout, setShowVisualLayout] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uvmLaundryShowVisualLayout') || 'false'); }
    catch (e) { console.warn("Failed to parse showVisualLayout from localStorage", e); return false; }
  });

  const [systemDarkMode, setSystemDarkMode] = useState(false);
  const effectiveDarkMode = useMemo(() => useSystemTheme ? systemDarkMode : manualDarkMode, [useSystemTheme, systemDarkMode, manualDarkMode]);

  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uvmLaundryFavorites') || '[]'); }
    catch (e) { console.error("Error parsing favorites from localStorage:", e); return []; }
  });
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsMachine, setSmsMachine] = useState(null);
  const [userPhoneNumber, setUserPhoneNumber] = useState(() => localStorage.getItem('uvmLaundryUserPhoneNumber') || '');
  const [settingsPhoneNumberInput, setSettingsPhoneNumberInput] = useState('');
  const [modalPhoneNumber, setModalPhoneNumber] = useState('');
  const [smsStatus, setSmsStatus] = useState({ message: '', type: 'info' });
  const [phoneSaveStatus, setPhoneSaveStatus] = useState('');
  const [smsAlertsSet, setSmsAlertsSet] = useState([]);

  const ongoingFetches = useRef(new Set());

  // --- Effects ---

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDarkMode(mediaQuery.matches);
    const handler = (e) => setSystemDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (effectiveDarkMode) {
      root.classList.add('dark');
      body.classList.remove('bg-gray-100', 'text-gray-900');
      body.classList.add('bg-slate-900', 'text-slate-100');
    } else {
      root.classList.remove('dark');
      body.classList.remove('bg-slate-900', 'text-slate-100');
      body.classList.add('bg-gray-100', 'text-gray-900');
    }
  }, [effectiveDarkMode]);

  useEffect(() => { localStorage.setItem('uvmLaundryUseSystemTheme', JSON.stringify(useSystemTheme)); }, [useSystemTheme]);
  useEffect(() => { localStorage.setItem('uvmLaundryManualDarkMode', JSON.stringify(manualDarkMode)); }, [manualDarkMode]);
  useEffect(() => { localStorage.setItem('uvmLaundryShowVisualLayout', JSON.stringify(showVisualLayout)); }, [showVisualLayout]);
  useEffect(() => {
    try { localStorage.setItem('uvmLaundryFavorites', JSON.stringify(favorites)); }
    catch (e) { console.error("Error saving favorites to localStorage:", e); }
  }, [favorites]);
  
  useEffect(() => { setSettingsPhoneNumberInput(userPhoneNumber ? formatPhoneNumber(userPhoneNumber) : ''); }, [userPhoneNumber]);

  const handleSettingsPhoneNumberChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setSettingsPhoneNumberInput(formatted);
    const rawPhoneNumber = formatted.replace(/[^\d]/g, '');
    if (rawPhoneNumber.length === 10) {
      if (rawPhoneNumber !== userPhoneNumber) {
        setUserPhoneNumber(rawPhoneNumber);
        localStorage.setItem('uvmLaundryUserPhoneNumber', rawPhoneNumber);
        setPhoneSaveStatus('Saved!');
        setTimeout(() => setPhoneSaveStatus(''), 2000);
      }
    } else {
        setPhoneSaveStatus('');
    }
  };
  
  const fetchRooms = useCallback(async () => {
    setIsLoadingRooms(true); setError(null);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/rooms`);
      if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
      let data = await response.json();
      if (!Array.isArray(data)) throw new Error("Received invalid data format for rooms.");

      // Client-side patch for specific room names
      data = data.map(room => {
        if (room.name && room.name.toLowerCase() === 'cottage#256') {
          return { ...room, name: 'The Cottages' };
        }
        // Example for McAuley - adjust if API returns a specific common misspelling
        if (room.name && room.name.toLowerCase().includes('mccauley')) {
          return { ...room, name: 'McAuley Hall' }; // Corrected spelling
        }
        return room;
      });
      setLaundryRooms(data.sort((a,b) => String(a.name).localeCompare(String(b.name))));
    } catch (e) {
      setError("Could not load laundry rooms. Please check your internet connection and try refreshing the page.");
      setLaundryRooms([]);
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const fetchMachineData = useCallback(async (roomIdToFetch, isBackground = false) => {
    if (!roomIdToFetch || ongoingFetches.current.has(roomIdToFetch)) return;
    ongoingFetches.current.add(roomIdToFetch);

    if (!isBackground) {
        setIsLoadingMachines(true);
        setError(null);
    } else if (selectedRoomId === roomIdToFetch) {
        setIsBackgroundRefreshing(true);
    }
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/laundry-data/${roomIdToFetch}`);
      if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
      const jsonData = await response.json();
      if (!Array.isArray(jsonData)) throw new Error("Received invalid data format for machines.");
      
      if (selectedRoomId === roomIdToFetch) {
        setMachines(jsonData);
        setLastUpdated(new Date());
        if (error && !isBackground) setError(null);
      }
    } catch (e) {
        const roomName = laundryRooms.find(r => r.id === roomIdToFetch)?.name || `the selected room`;
        const errorMessage = `Could not load machines for ${String(roomName)}. It might be a temporary issue. Please try refreshing.`;
        if (selectedRoomId === roomIdToFetch) setError(errorMessage);
        else console.warn(`Background fetch error for ${roomName}: ${e.message}`);
    } finally {
      if (selectedRoomId === roomIdToFetch) {
        if (!isBackground) setIsLoadingMachines(false);
        setIsBackgroundRefreshing(false);
      }
      ongoingFetches.current.delete(roomIdToFetch);
    }
  }, [laundryRooms, selectedRoomId, error]);

  useEffect(() => {
    if (selectedRoomId && currentView === 'roomDetail') fetchMachineData(selectedRoomId, false);
  }, [selectedRoomId, currentView, fetchMachineData]);

  useEffect(() => {
    if (!selectedRoomId || currentView !== 'roomDetail') return;
    const intervalId = setInterval(() => fetchMachineData(selectedRoomId, true), ACTIVE_ROOM_REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [selectedRoomId, currentView, fetchMachineData]);

  const handleScrollToMachine = (machineCardId) => {
    const element = document.getElementById(machineCardId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Optional: Add a temporary highlight effect
      element.classList.add('ring-2', 'ring-uvm-gold', 'ring-offset-2', 'dark:ring-offset-slate-800', 'transition-all', 'duration-300');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-uvm-gold', 'ring-offset-2', 'dark:ring-offset-slate-800');
      }, 1500);
    }
  };

  const handleSelectRoom = (roomId) => {
    setSelectedRoomId(roomId);
    setCurrentView('roomDetail');
    setSearchTerm(''); setFilterStatus('All'); setSmsAlertsSet([]); setError(null); setMachines([]);
  };
  const handleGoHome = () => {
    setCurrentView('home'); setSelectedRoomId(''); setMachines([]); setError(null); setSearchTerm(''); setFilterStatus('All'); setHomeSearchTerm(''); setSmsAlertsSet([]);
  };
  const handleBackFromSettings = () => setCurrentView(previousViewBeforeSettings);
  const handleGoToSettings = () => {
    setPreviousViewBeforeSettings(currentView === 'roomDetail' ? 'roomDetail' : 'home');
    setCurrentView('settings');
  };
  const handleRefresh = () => {
    if (selectedRoomId && currentView === 'roomDetail') fetchMachineData(selectedRoomId, false);
  };
  const toggleFavorite = (roomId) => setFavorites(prev => prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...new Set([...prev, roomId])]);
  const handleOpenSmsModal = (machine) => {
    setSmsMachine(machine);
    setModalPhoneNumber(userPhoneNumber ? formatPhoneNumber(userPhoneNumber) : '');
    setShowSmsModal(true);
    setSmsStatus({ message: '', type: 'info' });
  };

  const handleSendSmsAlert = async () => {
    const rawModalPhoneNumber = modalPhoneNumber.replace(/[^\d]/g, '');
    if (!smsMachine || !selectedRoomId) {
      setSmsStatus({ message: "An unexpected error occurred. Please close this and try again.", type: 'error' });
      return;
    }
    if (rawModalPhoneNumber.length !== 10) {
      setSmsStatus({ message: "Please enter a valid 10-digit phone number.", type: 'error' });
      return;
    }
    setSmsStatus({ message: "Sending request...", type: 'info' });
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/set-sms-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: selectedRoomId, machineName: smsMachine.machineName, phoneNumber: rawModalPhoneNumber })
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setSmsStatus({ message: result.message || 'SMS alert request submitted successfully!', type: 'success' });
        setSmsAlertsSet(prev => [...new Set([...prev, smsMachine.id])]);
        setTimeout(() => setShowSmsModal(false), 2500);
      } else {
        throw new Error(result.error || "The server could not set the SMS alert.");
      }
    } catch (err) {
      setSmsStatus({ message: `Request Failed. ${err.message} Please check your connection and try again.`, type: 'error' });
    }
  };

  // --- Memoized Selectors for Filtering and Derived Data ---
  const filteredHomeRooms = useMemo(() => {
    let roomsToDisplay = laundryRooms;
    if (showOnlyFavorites) roomsToDisplay = roomsToDisplay.filter(room => favorites.includes(room.id));
    if (homeSearchTerm.trim() !== '') {
      const lowerSearchTerm = homeSearchTerm.toLowerCase();
      roomsToDisplay = roomsToDisplay.filter(room => String(room.name).toLowerCase().includes(lowerSearchTerm));
    }
    return roomsToDisplay;
  }, [laundryRooms, showOnlyFavorites, homeSearchTerm, favorites]);
  
  const allWashers = useMemo(() => machines.filter(machine => machine.type === 'Washer'), [machines]);
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

  const statusOptions = ['All', 'Available', 'In Use', 'Finishing Soon', 'Cycle Finished', 'Out of Order', 'Unknown'];
  const currentRoomName = useMemo(() => laundryRooms.find(room => room.id === selectedRoomId)?.name || "All Rooms", [laundryRooms, selectedRoomId]);
  const currentRoomOfficialUrl = useMemo(() => laundryRooms.find(room => room.id === selectedRoomId)?.url, [laundryRooms, selectedRoomId]);

  const inputBaseClasses = "w-full p-3 border rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 dark:bg-slate-700 dark:text-white placeholder-gray-400 dark:placeholder-slate-400";
  const inputFocusClasses = "focus:ring-uvm-gold focus:border-uvm-gold";
  const inputBorderClasses = "border-gray-300 dark:border-slate-600";

  // --- Render Functions ---
  const renderLoadingScreen = (message) => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center py-16 text-gray-600 dark:text-gray-400 animate-fadeIn">
        <RefreshCw size={56} className="mx-auto animate-spin text-uvm-green dark:text-uvm-gold" />
        <p className="mt-4 text-lg">{message}</p>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        if (isLoadingRooms && laundryRooms.length === 0) return renderLoadingScreen("Loading Laundry Rooms...");
        return (
          <div key="home" className="animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              <h2 className={`text-3xl lg:text-4xl font-bold ${effectiveDarkMode ? 'text-white' : 'text-gray-900'} md:mb-0 mb-3 whitespace-nowrap`}>
                {showOnlyFavorites ? "Favorite Rooms" : "All Laundry Rooms"}
              </h2>
              <div className="flex-grow md:flex-grow-0 w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-auto flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"> <Search size={18} className="text-gray-500 dark:text-slate-300" /> </div>
                  <input type="text" placeholder="Search rooms..." value={homeSearchTerm} onChange={(e) => setHomeSearchTerm(e.target.value)} className={`${inputBaseClasses} ${inputBorderClasses} ${inputFocusClasses} pl-10`} />
                </div>
                <button onClick={() => setShowOnlyFavorites(!showOnlyFavorites)} className={`flex items-center justify-center w-full sm:w-auto px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-uvm-gold shadow-md whitespace-nowrap ${showOnlyFavorites ? `bg-yellow-400 text-yellow-900 hover:bg-yellow-500` : `${effectiveDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 dark:border-slate-600'}`}`}>
                    <Star size={18} className={`mr-2 ${showOnlyFavorites ? `text-yellow-900 fill-yellow-900` : (effectiveDarkMode ? 'text-slate-100 fill-slate-100' : `text-yellow-400 fill-yellow-400` ) }`} />
                    {showOnlyFavorites ? "Show All" : "Show Favorites"}
                </button>
              </div>
            </div>
            {filteredHomeRooms.length === 0 && !isLoadingRooms ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800/70 rounded-xl shadow-lg p-8">
                <Info size={64} className="mx-auto opacity-50 mb-4 text-uvm-green dark:text-uvm-gold" />
                <p className="mt-4 text-xl font-semibold">
                  {homeSearchTerm.trim() !== '' ? 'No Rooms Match Your Search' : (showOnlyFavorites && laundryRooms.length > 0 ? "You Have No Favorite Rooms" : "No Laundry Rooms Found")}
                </p>
                <p className="text-sm mt-2 opacity-80">
                  {homeSearchTerm.trim() !== '' ? 'Try a different search term.' : (showOnlyFavorites && laundryRooms.length > 0 ? "Tap the star icon on a room card to add it to your favorites." : "We couldn't find any laundry rooms at the moment.")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                {filteredHomeRooms.map(room => <RoomCard key={room.id} room={room} onSelectRoom={handleSelectRoom} isFavorite={favorites.includes(room.id)} onToggleFavorite={toggleFavorite} />)}
              </div>
            )}
          </div>
        );
      case 'roomDetail':
        if (isLoadingMachines && machines.length === 0 && !error) return renderLoadingScreen(`Loading machines for ${currentRoomName || 'room'}...`);
        return (
          <div key="roomDetail" className="animate-fadeIn">
            {/* Header: Back button, Room Name, Official Site */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-3">
              <button onClick={handleGoHome} className={`flex items-center text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-uvm-gold ${effectiveDarkMode ? 'text-slate-100 bg-slate-700 hover:bg-slate-600' : 'text-gray-900 bg-gray-100 hover:bg-gray-200'}`}> <ArrowLeft size={18} className="mr-2"/> Back to Rooms </button>
              <h2 className={`text-2xl md:text-3xl font-bold text-center flex-1 sm:mx-4 truncate ${effectiveDarkMode ? 'text-white' : 'text-gray-900'}`} title={String(currentRoomName)}>{String(currentRoomName)}</h2>
              <div className="sm:w-auto hidden sm:block" style={{minWidth: '135px'}}>
                  {currentRoomOfficialUrl && (<a href={currentRoomOfficialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2.5 border border-transparent text-xs font-semibold rounded-md shadow-sm text-white transition-colors duration-150 hover:opacity-80 whitespace-nowrap" style={{ backgroundColor: UVM_GREEN }} title="Visit Official Tracker"><ExternalLink size={16} className="mr-1.5" />Official Site</a>)}
              </div>
            </div>
            
            {/* Search and Filter Card */}
            <div className="mb-8 p-5 sm:p-6 bg-white dark:bg-slate-800/70 rounded-xl shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Search Machines</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"> <Search size={18} className="text-gray-500 dark:text-slate-300" /> </div>
                    <input type="text" id="search" placeholder="e.g., Washer 13, Dryer" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputBaseClasses} ${inputBorderClasses} ${inputFocusClasses} pl-10`} />
                  </div>
                </div>
                <div>
                  <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Filter by Status</label>
                  <select id="statusFilter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputBaseClasses} ${inputBorderClasses} ${inputFocusClasses} appearance-none pr-10 bg-no-repeat`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='${effectiveDarkMode ? '%23CBD5E1' : '%236B7280'}' %3E%3Cpath fill-rule='evenodd' d='M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z' clip-rule='evenodd' /%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundSize: '1.5em 1.5em' }}>
                    {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-slate-300">
                <p>Washers: <span className="font-semibold text-uvm-green dark:text-uvm-gold">{availableWashersInRoom}</span> Available / <span className="font-semibold">{allWashers.length}</span> Total</p>
                <p>Dryers: <span className="font-semibold text-uvm-green dark:text-uvm-gold">{availableDryersInRoom}</span> Available / <span className="font-semibold">{allDryers.length}</span> Total</p>
              </div>
              {lastUpdated && <p className="text-xs text-gray-500 dark:text-slate-400 mt-4 text-right">Last Updated: {lastUpdated.toLocaleTimeString()}</p>}
            </div>

            {/* Visual Room Layout Card (conditionally rendered) */}
            {showVisualLayout && machines.length > 0 && (
              <div className="mb-8 p-5 sm:p-6 bg-white dark:bg-slate-800/70 rounded-xl shadow-xl animate-fadeIn">
                <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">Room Layout</h3>
                <RoomLayout machines={machines} effectiveDarkMode={effectiveDarkMode} onMachineClick={handleScrollToMachine} />
              </div>
            )}

            {/* Machine List (Washers and Dryers) */}
            {(machines.length === 0 && !error && !isLoadingMachines) ? (
                 <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800/70 rounded-xl shadow-lg p-8"><Info size={64} className="mx-auto opacity-50 mb-4 text-uvm-green dark:text-uvm-gold" /><p className="mt-4 text-xl font-semibold">No Machines Found</p><p className="text-sm mt-2 opacity-80">This laundry room appears to have no machines listed, or they could not be loaded.</p></div>
            ) : (
              <>
                {filteredWashers.length > 0 && (
                  <div className="mb-10">
                    <h3 className={`text-2xl font-semibold mb-5 pb-3 border-b-2 ${effectiveDarkMode ? 'text-white border-slate-700' : 'text-gray-900 border-gray-300'}`}>Washers</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                      {filteredWashers.map(machine => <MachineCard key={machine.id || machine.machineName} machine={machine} onSetUpSmsAlert={handleOpenSmsModal} isAlertSet={smsAlertsSet.includes(machine.id)} />)}
                    </div>
                  </div>
                )}
                {filteredDryers.length > 0 && (
                  <div>
                    <h3 className={`text-2xl font-semibold mb-5 pb-3 border-b-2 ${effectiveDarkMode ? 'text-white border-slate-700' : 'text-gray-900 border-gray-300'}`}>Dryers</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                       {filteredDryers.map(machine => <MachineCard key={machine.id || machine.machineName} machine={machine} onSetUpSmsAlert={handleOpenSmsModal} isAlertSet={smsAlertsSet.includes(machine.id)} />)}
                     </div>
                  </div>
                )}
                 {filteredWashers.length === 0 && filteredDryers.length === 0 && machines.length > 0 && (
                     <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800/50 rounded-lg shadow-md p-6"><Info size={48} className="mx-auto opacity-50 mb-3" /><p>No machines match your current filters.</p></div>
                 )}
              </>
            )}
          </div>
        );
      case 'settings':
        return (
          <div key="settings" className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between mb-10">
              <h2 className={`text-3xl lg:text-4xl font-bold ${effectiveDarkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
              <button onClick={handleBackFromSettings} className={`flex items-center text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-uvm-gold ${effectiveDarkMode ? 'text-slate-100 bg-slate-700 hover:bg-slate-600' : 'text-gray-900 bg-gray-100 hover:bg-gray-200'}`}><ArrowLeft size={18} className="mr-2"/> Back</button>
            </div>
            <div className="space-y-10">
              <section>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 border-b pb-3 border-gray-200 dark:border-slate-700">Display</h3>
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/60 rounded-lg">
                    <label htmlFor="systemThemeToggle" className="text-gray-700 dark:text-slate-200 flex items-center text-sm sm:text-base cursor-pointer"><span className="mr-2.5">{useSystemTheme ? <Eye size={20} className="text-uvm-green dark:text-uvm-gold" /> : <EyeOff size={20} className="text-gray-500 dark:text-slate-300" />}</span>Use System Theme</label>
                    <button id="systemThemeToggle" onClick={() => setUseSystemTheme(!useSystemTheme)} className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold ${useSystemTheme ? 'bg-green-600 dark:bg-green-600' : 'bg-gray-300 dark:bg-slate-500'}`}><span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${useSystemTheme ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                  </div>
                  {!useSystemTheme && (<div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/60 rounded-lg animate-fadeIn">
                    <label htmlFor="manualDarkModeToggle" className="text-gray-700 dark:text-slate-200 flex items-center text-sm sm:text-base cursor-pointer"><span className="mr-2.5">{manualDarkMode ? <Moon size={20} className="text-uvm-gold" /> : <Sun size={20} className="text-yellow-500" />}</span>Dark Mode</label>
                    <button id="manualDarkModeToggle" onClick={() => setManualDarkMode(!manualDarkMode)} className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold ${manualDarkMode ? 'bg-green-600 dark:bg-green-600' : 'bg-gray-300 dark:bg-slate-500'}`}><span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${manualDarkMode ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                  </div>)}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/60 rounded-lg">
                    <label htmlFor="visualLayoutToggle" className="text-gray-700 dark:text-slate-200 flex items-center text-sm sm:text-base cursor-pointer"><span className="mr-2.5">{showVisualLayout ? <LayoutGrid size={20} className="text-uvm-green dark:text-uvm-gold" /> : <LayoutGrid size={20} className="text-gray-500 dark:text-slate-300" />}</span>Show Visual Room Layout</label>
                    <button id="visualLayoutToggle" onClick={() => setShowVisualLayout(!showVisualLayout)} className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold ${showVisualLayout ? 'bg-green-600 dark:bg-green-600' : 'bg-gray-300 dark:bg-slate-500'}`}><span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${showVisualLayout ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 border-b pb-3 border-gray-200 dark:border-slate-700">SMS Notifications</h3>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="userPhoneNumber" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Default Phone Number</label>
                    <div className="flex items-center space-x-3">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Smartphone size={18} className="text-gray-500 dark:text-slate-300" /></div>
                            <input type="tel" id="userPhoneNumber" value={settingsPhoneNumberInput} onChange={handleSettingsPhoneNumberChange} placeholder="(XXX) XXX-XXXX" className={`${inputBaseClasses} ${inputBorderClasses} ${inputFocusClasses} pl-10`} maxLength="14" />
                        </div>
                    </div>
                    {phoneSaveStatus && <p className="text-xs mt-2.5 text-green-600 dark:text-green-400 animate-fadeIn">{phoneSaveStatus}</p>}
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">Your number is saved automatically to this device for your convenience.</p>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 border-b pb-3 border-gray-200 dark:border-slate-700">Report Issues</h3>
                 <div className="space-y-3">
                    <p className="text-sm text-gray-700 dark:text-slate-300">
                        If you encounter a broken machine, please report it through the official UVM Laundry Tracker website.
                    </p>
                    <a href="https://laundrytrackerconnect.com/UVM/UVM.html" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold shadow-md" style={{backgroundColor: UVM_GREEN}} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f3927'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = UVM_GREEN}>
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
    <div className={`min-h-screen font-sans`}>
      <header className="sticky top-0 z-50 shadow-lg" style={{ backgroundColor: UVM_GREEN }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <button onClick={handleGoHome} className="flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-uvm-gold rounded-md p-1 -ml-1 group">
              <img src={UVM_LOGO_URL} alt="UVM Logo" className="h-10 md:h-12 w-auto mr-3 rounded-sm transition-transform duration-300 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display='none'; }}/>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight group-hover:text-yellow-400 transition-colors">UVM LaundryLink</h1>
            </button>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {currentView === 'roomDetail' && (isLoadingMachines || isBackgroundRefreshing) && <div title="Refreshing data..." className="p-2.5 text-white"><RefreshCw size={22} className='animate-spin' /></div>}
              {currentView === 'roomDetail' && !(isLoadingMachines || isBackgroundRefreshing) && <button onClick={handleRefresh} className="p-2.5 text-white hover:bg-white/20 rounded-full transition-colors" title="Refresh Data"> <RefreshCw size={22} /> </button> }
              <button onClick={handleGoToSettings} className="p-2.5 text-white hover:bg-white/20 rounded-full transition-colors" title="Settings"> <Settings size={22} /> </button>
            </div>
          </div>
        </div>
      </header>

      <main className={`container mx-auto p-4 sm:p-6 lg:p-8`}>
        {error && !isLoadingRooms && !(isLoadingMachines && selectedRoomId) && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/60 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded-md shadow-md animate-fadeIn" role="alert">
            <div className="flex items-start mb-1">
              <AlertTriangle size={22} className="mr-2.5 mt-0.5 text-red-500 dark:text-red-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-md">Could Not Update Data</p>
                <p className="text-sm break-words mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        {renderContent()}
      </main>

      <footer className="mt-20 py-10 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 dark:text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} UVM LaundryLink. Created by Ivan Minier.</p>
           <p className="mt-1">Not affiliated with the University of Vermont. Data sourced from public APIs.</p>
        </div>
      </footer>
      
      {showSmsModal && smsMachine && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn" onClick={() => setShowSmsModal(false)}>
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-7 rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Set SMS Alert for <span className="text-uvm-green dark:text-uvm-gold">{String(smsMachine.machineName)}</span></h3>
              <button onClick={() => setShowSmsModal(false)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300 transition-colors"> <XCircle size={24} /> </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-5">Enter your phone number to be notified when the cycle is complete.</p>
            <div className="mb-5">
              <label htmlFor="modalPhoneNumber" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Phone Number:</label>
              <input type="tel" id="modalPhoneNumber" value={modalPhoneNumber} onChange={(e) => setModalPhoneNumber(formatPhoneNumber(e.target.value))} placeholder="(XXX) XXX-XXXX" className={`${inputBaseClasses} ${inputBorderClasses} ${inputFocusClasses}`} maxLength="14"/>
            </div>
            {smsStatus.message && (<p className={`text-sm my-4 p-3 rounded-lg border ${smsStatus.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600' : (smsStatus.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600')}`}>{smsStatus.message}</p>)}
            <div className="mt-7 flex justify-end space-x-3">
              <button onClick={() => setShowSmsModal(false)} className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 ${effectiveDarkMode ? 'bg-slate-600 hover:bg-slate-500 text-slate-100' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>Cancel</button>
              <button onClick={handleSendSmsAlert} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold" style={{backgroundColor: UVM_GREEN}} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f3927'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = UVM_GREEN} disabled={smsStatus.message.toLowerCase().includes("sending")}>
                {smsStatus.message.toLowerCase().includes("sending") ? <RefreshCw size={18} className="animate-spin mr-2" /> : null}
                Set Alert
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        body { min-height: 100vh; transition: background-color 0.3s ease, color 0.3s ease; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: ${effectiveDarkMode ? '#1e293b' : '#f1f5f9'}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: ${effectiveDarkMode ? '#475569' : '#9ca3af'}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${effectiveDarkMode ? UVM_GOLD : UVM_GREEN}; }
      `}</style>
    </div>
  );
};

export default App;
