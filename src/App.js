import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Zap, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, Settings, Star, ArrowLeft, ExternalLink, Droplet, Wind, Eye, EyeOff, Info, Search, Sun, Moon, LayoutGrid } from 'lucide-react';

import { findLaundryRoom, laundryRooms, roomDisplayName, roomLabel, roomMachineLabel, roomPath } from './laundryData';
import { useLaundryStatus } from './useLaundryStatus';
import { RoomTools } from './RoomTools';
import { LaundryHelp } from './LaundryHelp';
import { RoomPeakTimes } from './RoomPeakTimes';
import { MachineReport, SERVICE_REQUEST_URL } from './MachineReport';

// UVM Colors
const UVM_GREEN = '#154734';
const UVM_GOLD = '#fdb515';
const UVM_LOGO_URL = 'https://i.imgur.com/kvyrGbL.png';

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

    const isDryer = machine.type === 'Dryer';

    return (
        <button
            onClick={() => onMachineClick(machineIdForScroll)}
            className={`flex-shrink-0 w-24 h-32 rounded-md flex flex-col items-center justify-between p-2 text-center shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-uvm-gold ${machineBodyBg} ${machineTextColor} border border-transparent hover:border-uvm-gold`}
            title={`${machine.machineName} - ${machine.type} - ${actualStatus}${timeRemaining ? ` (${timeRemaining} left)` : ''}`}
        >
            <div className={`w-full flex items-center justify-between px-1 py-0.5 rounded-t-sm ${machineAccentBg}`}>
                <MachineTypeIcon size={16} className={machineIconColor} />
                <span className="font-semibold text-xs">{machineNumber}</span>
            </div>
            <div className="flex-grow flex items-center justify-center w-full my-1">
                <div
                    className={`w-10 h-10 flex items-center justify-center border-2 ${isDryer ? 'rounded-sm' : 'rounded-full'}`}
                    style={{ borderColor: statusColorHex, backgroundColor: `${statusColorHex}33` }}
                >
                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColorHex }}></div>
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
  const MachineTypeSpecificIcon = machine.type === 'Washer' ? Droplet : Wind;
  const formattedTimeRemaining = formatTime(machine.timeRemaining);
  const machineIdForScroll = `machine-card-${machine.id || machine.machineName.replace(/\s+/g, '-')}`;


  let placeholderText;
  if (actualStatus === 'Available') placeholderText = "Ready for use";
  else if (actualStatus === 'Out of Order') placeholderText = "Awaiting service";
  else if (actualStatus === 'Offline') placeholderText = "The machine is not reporting status";
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
        {placeholderText && (
          <div className="h-[46px] flex items-center justify-center text-sm text-gray-400 dark:text-slate-400">
            {placeholderText}
          </div>
        )}
        <MachineReport machine={machine} room={room} canSetAlert={canSetAlert} />
      </div>
    </div>
  );
});

const RoomCard = React.memo(({ room, onSelectRoom, isFavorite, onToggleFavorite }) => (
    <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectRoom(room.id)}
        onKeyDown={(e) => {
            if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelectRoom(room.id);
            }
        }}
        style={{ '--gradient-start-color': UVM_GREEN }}
        className={`rounded-xl shadow-lg p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer h-full min-h-[170px] sm:min-h-[190px] group relative overflow-hidden bg-gradient-to-br from-[var(--gradient-start-color)] to-green-800 dark:from-[var(--gradient-start-color)] dark:to-green-700 hover:shadow-[0_0_20px_3px_rgba(253,181,21,0.6)] focus:outline-none focus:ring-4 focus:ring-yellow-400/80`}
    >
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        <div className="relative z-10 flex-grow">
            <h3 className="text-xl sm:text-2xl font-bold mb-2 text-white group-hover:text-yellow-400 transition-colors">{roomDisplayName(room)}</h3>
            {roomMachineLabel(room) && <p className="text-sm text-green-100">{roomMachineLabel(room)}</p>}
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

const EMPTY_MACHINES = [];
const CAMPUS_FILTERS = [
  ['all', 'All'],
  ['redstone', 'Redstone'],
  ['athletic', 'Athletic'],
  ['central', 'Central'],
  ['north', 'Trinity/North'],
];
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
  const [showVisualLayout, setShowVisualLayout] = usePreference('uvmLaundryShowVisualLayout', window.innerWidth > 800);
  const [showMachineList, setShowMachineList] = usePreference('uvmLaundryShowMachineList', true);
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
    if (selectedRoomId) savePreference(LAST_ROOM_KEY, selectedRoomId);
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
  
  const handleSelectRoom = useCallback((roomId, updateHash = true) => {
    const room = findLaundryRoom(roomId);
    if (!room) return;
    setSelectedRoomId(room.id);
    setCurrentView('roomDetail');
    setSearchTerm('');
    setFilterStatus('All');
    if (updateHash) window.location.hash = roomPath(room);
  }, []);

  const handleGoHome = useCallback((updateHash = true) => {
    setCurrentView('home');
    setSelectedRoomId('');
    setSearchTerm('');
    setFilterStatus('All');
    setHomeSearchTerm('');
    if (updateHash && window.location.hash) window.location.hash = '';
  }, []);

  useEffect(() => {
    const syncRoute = () => {
      const hash = window.location.hash.replace(/^#\/?(?:room\/)?/, '');
      const room = findLaundryRoom(hash);
      if (room) handleSelectRoom(room.id, false);
      else handleGoHome(false);
    };
    const lastRoom = !window.location.hash && readPreference(REMEMBER_ROOM_KEY, false)
      ? findLaundryRoom(readPreference(LAST_ROOM_KEY, null))
      : null;
    if (lastRoom) {
      window.history.replaceState(null, '', roomPath(lastRoom));
      handleSelectRoom(lastRoom.id, false);
    } else {
      syncRoute();
    }
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, [handleSelectRoom, handleGoHome]);

  useEffect(() => {
    if (!machineScrollTarget || !showMachineList) return undefined;
    const element = document.getElementById(machineScrollTarget);
    setMachineScrollTarget(null);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-uvm-gold', 'ring-offset-2', 'dark:ring-offset-slate-800', 'transition-all', 'duration-300');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-uvm-gold', 'ring-offset-2', 'dark:ring-offset-slate-800');
      }, 1500);
    }
  }, [machineScrollTarget, showMachineList]);

  const handleScrollToMachine = (machineCardId) => {
    setSearchTerm('');
    setFilterStatus('All');
    setShowMachineList(true);
    setMachineScrollTarget(machineCardId);
  };

  const handleBackFromOverlay = () => setCurrentView(previousView);
  const handleOpenOverlay = (view) => {
    if (currentView === 'home' || currentView === 'roomDetail') setPreviousView(currentView);
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

  const statusOptions = ['All', 'Available', 'Ready to Start', 'In Use', 'Finishing Soon', 'Cycle Finished', 'Door Open', 'Reserved', 'Out of Order', 'Offline', 'Status Unknown'];

  const inputBaseClasses = "w-full p-3 border rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 dark:bg-slate-700 dark:text-white placeholder-gray-400 dark:placeholder-slate-400";
  const inputFocusClasses = "focus:ring-uvm-gold focus:border-uvm-gold";
  const inputBorderClasses = "border-gray-300 dark:border-slate-600";

  // --- Render Functions ---
  const renderContent = () => {
    switch (currentView) {
      case 'home':
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
            <div role="group" aria-label="Filter rooms by campus" className="mb-5 flex flex-wrap gap-2">
              {CAMPUS_FILTERS.map(([id, label]) => (
                <button type="button" key={id} aria-pressed={campus === id} onClick={() => setCampus(id)}
                  className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uvm-gold ${campus === id
                    ? 'border-uvm-green bg-uvm-green text-white dark:border-uvm-gold dark:bg-uvm-gold dark:text-slate-900'
                    : 'border-slate-300 bg-white text-slate-800 hover:border-uvm-green dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'}`}>
                  {label}
                </button>
              ))}
            </div>
            {filteredHomeRooms.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800/70 rounded-xl shadow-lg p-8">
                <Info size={64} className="mx-auto opacity-50 mb-4 text-uvm-green dark:text-uvm-gold" />
                <p className="mt-4 text-xl font-semibold">
                  {homeSearchTerm.trim() !== '' ? 'No Rooms Match Your Search' : (showOnlyFavorites ? "No Favorite Rooms in This View" : "No Laundry Rooms Found")}
                </p>
                <p className="text-sm mt-2 opacity-80">
                  {homeSearchTerm.trim() !== '' ? 'Try a different search term or choose All campuses.' : (showOnlyFavorites ? "Choose another campus or add a room to your favorites." : "We couldn't find any laundry rooms at the moment.")}
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
        return (
          <div key="roomDetail" className="animate-fadeIn">
            <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <button onClick={() => handleGoHome()} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-uvm-gold dark:text-white">
                <ArrowLeft size={18} /> All Rooms
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">{roomDisplayName(currentRoom)}</h2>
                {roomMachineLabel(currentRoom) && <p className="text-sm text-slate-600 dark:text-slate-300">{roomMachineLabel(currentRoom)}</p>}
              </div>
            </div>
            <RoomTools key={`tools-${currentRoom.id}`} room={currentRoom} onSelectRoom={handleSelectRoom} />
            {roomStatus.failed && (
              <div role="status" className="mb-6 rounded-md border-l-4 border-yellow-500 bg-yellow-100 p-4 text-yellow-900 dark:bg-yellow-700/30 dark:text-yellow-200">
                {roomStatus.stale ? 'Live refresh failed. Showing the last saved machine statuses.' : 'Live machine status unavailable. Try refreshing or open the official status page.'}
              </div>
            )}
            {roomStatus.busy && !roomStatus.checkedAt && (
              <p role="status" className="mb-6 text-gray-600 dark:text-slate-300">Loading live machine status…</p>
            )}
            <RoomPeakTimes key={`peak-${currentRoom.id}`} room={currentRoom} />
            {roomStatus.checkedAt && <>
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
              <p className={`text-xs mt-4 text-right ${roomStatus.stale ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-500 dark:text-slate-400'}`}>{roomStatus.stale ? 'Saved snapshot' : 'Last checked'} · {new Date(roomStatus.checkedAt).toLocaleString()}</p>
            </div>

            {machines.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button type="button" aria-expanded={showVisualLayout} aria-controls="room-layout"
                  className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm font-semibold dark:border-slate-600"
                  onClick={() => setShowVisualLayout(!showVisualLayout)}>{showVisualLayout ? 'Hide Layout' : 'Show Layout'}</button>
                <button type="button" aria-expanded={showMachineList} aria-controls="machine-list"
                  className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm font-semibold dark:border-slate-600"
                  onClick={() => setShowMachineList(!showMachineList)}>{showMachineList ? 'Hide Machine List' : 'Show Machine List'}</button>
              </div>
            )}
            <div id="room-layout" hidden={!showVisualLayout}>
            {showVisualLayout && machines.length > 0 && (
              <div className="mb-8 p-5 sm:p-6 bg-white dark:bg-slate-800/70 rounded-xl shadow-xl animate-fadeIn">
                <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">Room Layout</h3>
                <RoomLayout machines={machines} effectiveDarkMode={effectiveDarkMode} onMachineClick={handleScrollToMachine} />
              </div>
            )}

            </div>
            <div id="machine-list" hidden={!showMachineList && machines.length > 0}>
            {machines.length === 0 ? (
                 <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800/70 rounded-xl shadow-lg p-8"><Info size={64} className="mx-auto opacity-50 mb-4 text-uvm-green dark:text-uvm-gold" /><p className="mt-4 text-xl font-semibold">No Machines Found</p><p className="text-sm mt-2 opacity-80">The provider has no machines listed for this room.</p></div>
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
                     <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800/50 rounded-lg shadow-md p-6"><Info size={48} className="mx-auto opacity-50 mb-3" /><p>No machines match your current filters.</p></div>
                 )}
              </>
            )}
            </div>
            </>}
          </div>
        );
      case 'help':
        return <LaundryHelp onBack={handleBackFromOverlay} />;
      case 'settings':
        return (
          <div key="settings" className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between mb-10">
              <h2 className={`text-3xl lg:text-4xl font-bold ${effectiveDarkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
              <button onClick={handleBackFromOverlay} className={`flex items-center text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-uvm-gold ${effectiveDarkMode ? 'text-slate-100 bg-slate-700 hover:bg-slate-600' : 'text-gray-900 bg-gray-100 hover:bg-gray-200'}`}><ArrowLeft size={18} className="mr-2"/> Back</button>
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
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/60 rounded-lg">
                    <label htmlFor="visualLayoutToggle" className="text-gray-700 dark:text-slate-200 flex items-center text-sm sm:text-base cursor-pointer"><span className="mr-2.5">{showVisualLayout ? <LayoutGrid size={20} className="text-uvm-green dark:text-uvm-gold" /> : <LayoutGrid size={20} className="text-gray-500 dark:text-slate-300" />}</span>Show Visual Room Layout</label>
                    <button id="visualLayoutToggle" role="switch" aria-checked={showVisualLayout} onClick={() => setShowVisualLayout(!showVisualLayout)} className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold ${showVisualLayout ? 'bg-green-600 dark:bg-green-600' : 'bg-gray-300 dark:bg-slate-500'}`}><span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${showVisualLayout ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="mb-4 text-xl font-semibold">Room Preferences</h3>
                <label className="flex min-h-[44px] items-center gap-3 rounded-lg bg-slate-100 px-4 py-2 dark:bg-slate-700/60">
                  <input type="checkbox" checked={rememberRoom} onChange={(event) => setRememberRoom(event.target.checked)}
                    className="h-5 w-5 accent-uvm-green" />
                  Open my last room on startup
                </label>
              </section>
              <section>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 border-b pb-3 border-gray-200 dark:border-slate-700">Report Issues</h3>
                 <div className="space-y-3">
                    <p className="text-sm text-gray-700 dark:text-slate-300">
                        If you encounter a broken machine, please report it to Automatic Laundry.
                    </p>
                    <a href={SERVICE_REQUEST_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold shadow-md" style={{backgroundColor: UVM_GREEN}} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f3927'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = UVM_GREEN}>
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
            <button onClick={() => handleGoHome()} className="flex min-w-0 items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-uvm-gold rounded-md p-1 -ml-1 group">
              <img src={UVM_LOGO_URL} alt="UVM Logo" className="h-10 md:h-12 w-auto mr-3 rounded-sm transition-transform duration-300 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display='none'; }}/>
              <h1 className="truncate text-base sm:text-xl md:text-2xl font-bold text-white tracking-tight group-hover:text-yellow-400 transition-colors">UVM LaundryLink</h1>
            </button>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {currentView === 'roomDetail' && roomStatus.busy && <div title="Refreshing data..." className="p-2.5 text-white"><RefreshCw size={22} className='animate-spin' /></div>}
              {currentView === 'roomDetail' && currentRoom?.providerId && !roomStatus.busy && <button onClick={roomStatus.refresh} className="p-2.5 text-white hover:bg-white/20 rounded-full transition-colors" title="Refresh Data"> <RefreshCw size={22} /> </button> }
              <button onClick={() => handleOpenOverlay('help')} className="rounded-full p-2.5 text-white hover:bg-white/20" aria-label="Laundry Help" title="Laundry Help"><Info size={22} /></button>
              <button onClick={() => handleOpenOverlay('settings')} className="p-2.5 text-white hover:bg-white/20 rounded-full transition-colors" title="Settings"> <Settings size={22} /> </button>
            </div>
          </div>
        </div>
      </header>

      <main className={`container mx-auto p-4 sm:p-6 lg:p-8`}>
        {renderContent()}
      </main>

      <footer className="mt-20 py-10 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 dark:text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} UVM LaundryLink. Created by Ivan Minier.</p>
           <p className="mt-1">Not affiliated with the University of Vermont. Machine status provided by UVM’s Wash Alert pages.</p>
        </div>
      </footer>
      
      <style>{`
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        body { min-height: 100vh; transition: background-color 0.3s ease, color 0.3s ease; }
        ::-webkit-scrollbar { width: 8px; height: 8px; } /* For RoomLayout horizontal scroll */
        ::-webkit-scrollbar-track { background: ${effectiveDarkMode ? '#1e293b' : '#f1f5f9'}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: ${effectiveDarkMode ? '#475569' : '#9ca3af'}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${effectiveDarkMode ? UVM_GOLD : UVM_GREEN}; }
      `}</style>
    </div>
  );
};

export default App;
