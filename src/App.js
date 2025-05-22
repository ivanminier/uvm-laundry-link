import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Zap, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, Settings, Star, ArrowLeft, Filter, ExternalLink, Droplet, Wind, MessageCircle, Smartphone, Eye, EyeOff, Info, Save, Search, ChevronDown, Sun, Moon } from 'lucide-react';

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


  if (lowerStatus.includes('available')) {
    actualStatusOutput = 'Available';
    iconElement = <CheckCircle size={18} className="mr-2 flex-shrink-0 text-green-600 dark:text-green-500" />;
    textColor = 'text-green-700 dark:text-green-400';
    bgColor = 'bg-green-100 dark:bg-green-900/30'; 
    borderColor = 'border-green-500 dark:border-green-700';
  } else if (lowerStatus.includes('out of order') || lowerStatus.includes('service') || lowerStatus.includes('offline')) {
    actualStatusOutput = 'Out of Order';
    iconElement = <XCircle size={18} className="mr-2 flex-shrink-0 text-red-600 dark:text-red-500" />;
    textColor = 'text-red-700 dark:text-red-400';
    bgColor = 'bg-red-100 dark:bg-red-900/30';
    borderColor = 'border-red-500 dark:border-red-700';
  } else if (lowerStatus.includes('eoc') || lowerStatus.includes('cycle finished') || lowerStatus.includes('complete') || lowerStatus.includes('cycle complete')) {
    actualStatusOutput = 'Cycle Finished';
    iconElement = <CheckCircle size={18} className="mr-2 flex-shrink-0 text-teal-600 dark:text-teal-500" />;
    textColor = 'text-teal-700 dark:text-teal-400';
    bgColor = 'bg-teal-100 dark:bg-teal-900/30';
    borderColor = 'border-teal-500 dark:border-teal-700';
  } else {
    const timeMatch = rawStatus.match(/(\d+)\s*min/i);
    if (timeMatch && parseInt(timeMatch[1], 10) > 0) {
      if (parseInt(timeMatch[1], 10) <= 5) {
        actualStatusOutput = 'Finishing Soon';
        iconElement = <Clock size={18} className="mr-2 flex-shrink-0 text-yellow-600 dark:text-yellow-500" />;
        textColor = 'text-yellow-700 dark:text-yellow-400';
        bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
        borderColor = 'border-yellow-500 dark:border-yellow-700';
      } else {
        actualStatusOutput = 'In Use';
        iconElement = <Zap size={18} className="mr-2 flex-shrink-0 text-blue-600 dark:text-blue-500" />;
        textColor = 'text-blue-700 dark:text-blue-400';
        bgColor = 'bg-blue-100 dark:bg-blue-900/30';
        borderColor = 'border-blue-500 dark:border-blue-700';
      }
    } else if (lowerStatus.includes('in use')) {
      actualStatusOutput = 'In Use';
      iconElement = <Zap size={18} className="mr-2 flex-shrink-0 text-blue-600 dark:text-blue-500" />;
      textColor = 'text-blue-700 dark:text-blue-400';
      bgColor = 'bg-blue-100 dark:bg-blue-900/30';
      borderColor = 'border-blue-500 dark:border-blue-700';
    } else if (rawStatus && rawStatus !== 'Unknown') {
      actualStatusOutput = rawStatus.replace(/\b\w/g, l => l.toUpperCase());
       iconElement = <AlertTriangle size={18} className="mr-2 flex-shrink-0 text-slate-500 dark:text-slate-400" />;
    } else {
      actualStatusOutput = "Status Unknown";
       iconElement = <AlertTriangle size={18} className="mr-2 flex-shrink-0 text-slate-500 dark:text-slate-400" />;
    }
  }
  return { icon: iconElement, textColor, bgColor, actualStatus: String(actualStatusOutput), borderColor };
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


const MachineCard = React.memo(({ machine, onSetUpSmsAlert, isAlertSet }) => {
  const { icon: statusIcon, textColor, bgColor, actualStatus, borderColor } = getStatusDetails(machine.status);
  const canSetAlertInitially = actualStatus === 'In Use' || actualStatus === 'Finishing Soon';
  const MachineTypeSpecificIcon = machine.type === 'Washer' ? Droplet : Wind;
  const formattedTimeRemaining = formatTime(machine.timeRemaining);

  return (
    <div className={`rounded-xl shadow-lg bg-white dark:bg-slate-800/70 border ${borderColor} flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white truncate" title={String(machine.machineName || `Machine ${machine.id}`)}>
              {String(machine.machineName || `Machine ${machine.id}`)}
            </h3>
            <div className="flex items-center text-sm text-gray-500 dark:text-slate-200 mt-1">
              <MachineTypeSpecificIcon size={16} className="mr-1.5 flex-shrink-0" />
              <span>{String(machine.type || 'N/A')} - {String(machine.size || 'N/A')}</span>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center flex-shrink-0 ${bgColor} ${textColor}`}>
            {actualStatus}
          </div>
        </div>
        
        <div className="text-center my-4 py-3 border-y border-gray-100 dark:border-slate-700">
          {React.cloneElement(statusIcon, { className: `${statusIcon.props.className} ${textColor}` })}
          <p className={`text-2xl font-bold mt-1 ${textColor}`}>
              {actualStatus === 'In Use' && formattedTimeRemaining ? formattedTimeRemaining : actualStatus}
          </p>
          {actualStatus === 'In Use' && formattedTimeRemaining && (
            <p className="text-sm text-gray-500 dark:text-slate-400">remaining</p>
          )}
        </div>
      </div>

      <div className="p-4 pt-0">
        {isAlertSet && canSetAlertInitially ? (
          <div className="w-full font-semibold py-3 px-4 rounded-lg text-sm flex items-center justify-center text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30">
            <CheckCircle size={18} className="mr-2" />
            Alert Set
          </div>
        ) : canSetAlertInitially ? (
          <button
            onClick={() => onSetUpSmsAlert(machine)}
            className="w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold"
            style={{backgroundColor: UVM_GREEN}}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f3927'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = UVM_GREEN}
          >
            <MessageCircle size={18} className="mr-2" />
            Set SMS Alert
          </button>
        ) : (
          <div className="h-[46px] flex items-center justify-center text-sm text-gray-400 dark:text-slate-500">
            {actualStatus === 'Available' ? 'Ready to use' : 'Alert not applicable'}
          </div>
        )}
      </div>
    </div>
  );
});

const RoomCard = React.memo(({ room, onSelectRoom, isFavorite, onToggleFavorite }) => (
    <div
        onClick={() => onSelectRoom(room.id)}
        className="rounded-xl shadow-lg p-5 sm:p-6 flex flex-col justify-between transition-all duration-300 cursor-pointer h-full min-h-[170px] sm:min-h-[190px] group relative overflow-hidden bg-gradient-to-br from-[#0f3927] to-uvm-green hover:shadow-[0_0_15px_rgba(253,181,21,0.5)]"
    >
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        <div className="relative z-10 flex-grow">
            <h3 className="text-xl sm:text-2xl font-bold mb-2 text-white group-hover:text-uvm-gold transition-colors">{String(room.name)}</h3>
        </div>
        <div className="flex items-center justify-end mt-auto pt-3 relative z-10">
            <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(room.id); }}
                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
                <Star size={22} className={`transition-colors ${isFavorite ? `text-[${UVM_GOLD}] fill-[${UVM_GOLD}]` : 'text-white/60 group-hover:text-white'}`} />
            </button>
        </div>
    </div>
));

// Main App Component
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
  
  const [useSystemTheme, setUseSystemTheme] = useState(() => {
    const stored = localStorage.getItem('uvmLaundryUseSystemTheme');
    return stored ? JSON.parse(stored) : true;
  });
  const [manualDarkMode, setManualDarkMode] = useState(() => {
    const stored = localStorage.getItem('uvmLaundryManualDarkMode');
    return stored ? JSON.parse(stored) : false;
  });
  const [systemDarkMode, setSystemDarkMode] = useState(false);

  const effectiveDarkMode = useMemo(() => {
    return useSystemTheme ? systemDarkMode : manualDarkMode;
  }, [useSystemTheme, systemDarkMode, manualDarkMode]);

  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState(() => { try { const sf = localStorage.getItem('uvmLaundryFavorites'); return sf ? JSON.parse(sf) : []; } catch (e) { return []; } });
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsMachine, setSmsMachine] = useState(null);
  const [userPhoneNumber, setUserPhoneNumber] = useState(() => localStorage.getItem('uvmLaundryUserPhoneNumber') || '');
  const [settingsPhoneNumberInput, setSettingsPhoneNumberInput] = useState(''); // Initialize empty, will be set by useEffect
  const [modalPhoneNumber, setModalPhoneNumber] = useState('');
  const [smsStatus, setSmsStatus] = useState('');
  const [phoneSaveStatus, setPhoneSaveStatus] = useState('');
  const [smsAlertsSet, setSmsAlertsSet] = useState([]);

  const NGROK_BASE_URL = 'https://7eaa-172-56-118-125.ngrok-free.app'; // Replace with your actual ngrok URL

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDarkMode(mediaQuery.matches);
    const handler = (e) => setSystemDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', effectiveDarkMode);
    document.body.className = effectiveDarkMode ? 'bg-slate-900' : 'bg-gray-100'; 
  }, [effectiveDarkMode]);

  useEffect(() => { localStorage.setItem('uvmLaundryUseSystemTheme', JSON.stringify(useSystemTheme)); }, [useSystemTheme]);
  useEffect(() => { localStorage.setItem('uvmLaundryManualDarkMode', JSON.stringify(manualDarkMode)); }, [manualDarkMode]);
  useEffect(() => { try { localStorage.setItem('uvmLaundryFavorites', JSON.stringify(favorites)); } catch (e) { console.error("Error saving favs:", e)} }, [favorites]);
  
  // Effect to initialize/update settingsPhoneNumberInput when userPhoneNumber changes (e.g., on load or after save)
  useEffect(() => {
    setSettingsPhoneNumberInput(userPhoneNumber ? formatPhoneNumber(userPhoneNumber) : '');
  }, [userPhoneNumber]);

  const handleSavePhoneNumber = () => {
    const rawPhoneNumber = settingsPhoneNumberInput.replace(/[^\d]/g, '');
    if (rawPhoneNumber.length === 10) {
      setUserPhoneNumber(rawPhoneNumber); // This will trigger the useEffect above to update settingsPhoneNumberInput
      localStorage.setItem('uvmLaundryUserPhoneNumber', rawPhoneNumber); 
      setPhoneSaveStatus('Phone number saved!');
      setTimeout(() => setPhoneSaveStatus(''), 2000);
    } else {
      setPhoneSaveStatus('Please enter a valid 10-digit phone number.');
      setTimeout(() => setPhoneSaveStatus(''), 3000);
    }
  };

  const handleSettingsPhoneNumberChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setSettingsPhoneNumberInput(formatted); 
  };
  
  const fetchRooms = useCallback(async () => {
    setIsLoadingRooms(true); setError(null);
    const roomsUrl = `${NGROK_BASE_URL}/rooms`;
    try {
      if (NGROK_BASE_URL.includes('YOUR_NGROK_HTTPS_FORWARDING_URL_HERE') || NGROK_BASE_URL.length < 20 || !NGROK_BASE_URL.startsWith('https://')) {
        setError("Configuration Error: The backend service URL in the app code needs to be updated.");
        setIsLoadingRooms(false); setLaundryRooms([]); return;
      }
      const r = await fetch(roomsUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!r.ok) throw new Error(`Rooms fetch failed: ${r.status} ${r.statusText}. URL: ${roomsUrl}`);
      const data = await r.json();
      setLaundryRooms(Array.isArray(data) ? data.sort((a,b) => String(a.name).localeCompare(String(b.name))) : []);
    } catch (e) {
      setError(`Failed to load room list. ${e.message}. Ensure the backend service is running and accessible.`);
      setLaundryRooms([]);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [NGROK_BASE_URL]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const fetchMachineData = useCallback(async (roomIdToFetch, isBackground = false) => {
    if (!roomIdToFetch) { setMachines([]); return; }
    if (!isBackground) setIsLoadingMachines(true); else setIsBackgroundRefreshing(true);
    if(!isBackground) setError(null);
    
    const machineDataUrl = `${NGROK_BASE_URL}/laundry-data/${roomIdToFetch}`;
    try {
      const response = await fetch(machineDataUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!response.ok) throw new Error(`Machines fetch failed for ${roomIdToFetch}: ${response.status} ${response.statusText}. URL: ${machineDataUrl}`);
      const jsonData = await response.json();
      setMachines(Array.isArray(jsonData) ? jsonData : []);
      setLastUpdated(new Date());
      if(isBackground && error) setError(null); 
    } catch (e) {
        const roomName = laundryRooms.find(r=>r.id === roomIdToFetch)?.name || roomIdToFetch;
        if (!isBackground || machines.length === 0) { 
            setError(`Failed to load machines for ${String(roomName)}. ${e.message}. Check backend service connection.`);
        }
        if(!isBackground) setMachines([]);
    }
    finally { if (!isBackground) setIsLoadingMachines(false); setIsBackgroundRefreshing(false); }
  }, [NGROK_BASE_URL, laundryRooms, machines.length, error]);

  useEffect(() => { if (selectedRoomId && currentView === 'roomDetail') fetchMachineData(selectedRoomId, false); }, [selectedRoomId, currentView, fetchMachineData]);
  useEffect(() => {
    if (!selectedRoomId || currentView !== 'roomDetail') return;
    const intervalId = setInterval(() => fetchMachineData(selectedRoomId, true), 30000);
    return () => clearInterval(intervalId);
  }, [selectedRoomId, currentView, fetchMachineData]);
  
  const handleSelectRoom = (roomId) => { setSelectedRoomId(roomId); setCurrentView('roomDetail'); setSearchTerm(''); setFilterStatus('All'); setSmsAlertsSet([]); /* Clear session alerts for new room */};
  const handleGoHome = () => { setCurrentView('home'); setSelectedRoomId(''); setMachines([]); setError(null); setSearchTerm(''); setFilterStatus('All'); setHomeSearchTerm(''); setSmsAlertsSet([]); };
  const handleGoToSettings = () => { setPreviousViewBeforeSettings(currentView === 'roomDetail' ? 'roomDetail' : 'home'); setCurrentView('settings'); };
  const handleBackFromSettings = () => { setCurrentView(previousViewBeforeSettings); };

  const handleRefresh = () => {
    setError(null); 
    if (selectedRoomId && currentView === 'roomDetail') {
      fetchMachineData(selectedRoomId, false);
    } else if (currentView === 'home') {
      fetchRooms();
    }
  };
  const toggleFavorite = (roomId) => setFavorites(p => p.includes(roomId) ? p.filter(id => id !== roomId) : [...p, roomId]);

  const handleOpenSmsModal = (machine) => { 
    setSmsMachine(machine); 
    setModalPhoneNumber(userPhoneNumber ? formatPhoneNumber(userPhoneNumber) : ''); 
    setShowSmsModal(true); 
    setSmsStatus(''); 
  };

  const handleSendSmsAlert = async () => {
    const rawModalPhoneNumber = modalPhoneNumber.replace(/[^\d]/g, '');
    if (!smsMachine || !rawModalPhoneNumber || !selectedRoomId) { setSmsStatus("Error: Phone number and machine selection are required."); return; }
    if (rawModalPhoneNumber.length !== 10) { setSmsStatus("Error: Please enter a valid 10-digit phone number."); return; }
    
    setSmsStatus("Sending SMS alert request...");
    try {
      const response = await fetch(`${NGROK_BASE_URL}/set-sms-alert`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ roomId: selectedRoomId, machineName: smsMachine.machineName, phoneNumber: rawModalPhoneNumber }) });
      const result = await response.json();
      if (response.ok && result.success) {
        setSmsStatus(`Success: ${result.message || 'SMS alert request submitted.'}`);
        setSmsAlertsSet(prev => [...new Set([...prev, smsMachine.id])]);
        setTimeout(() => { setShowSmsModal(false); setSmsStatus(''); }, 2500);
      } else { throw new Error(result.error || "Failed to set SMS alert via backend service."); }
    } catch (err) { setSmsStatus(`Error: ${err.message}. Please ensure the backend service is running and accessible.`); }
  };

  const filteredHomeRooms = useMemo(() => {
    let roomsToDisplay = laundryRooms;
    if (showOnlyFavorites) {
      roomsToDisplay = roomsToDisplay.filter(room => favorites.includes(room.id));
    }
    if (homeSearchTerm.trim() !== '') {
      const lowerSearchTerm = homeSearchTerm.toLowerCase();
      roomsToDisplay = roomsToDisplay.filter(room => 
        String(room.name).toLowerCase().includes(lowerSearchTerm)
      );
    }
    return roomsToDisplay;
  }, [laundryRooms, showOnlyFavorites, homeSearchTerm, favorites]);
  
  const allWashers = machines.filter(machine => machine.type === 'Washer');
  const allDryers = machines.filter(machine => machine.type === 'Dryer');

  const filterMachineList = (list) => list.filter(machine => {
    const { actualStatus: machineActualStatus } = getStatusDetails(machine.status);
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (String(machine.machineName || '')).toLowerCase().includes(searchLower) ||
                          (String(machine.id || '')).toLowerCase().includes(searchLower) ||
                          (String(machine.type || '')).toLowerCase().includes(searchLower) ||
                          (machine.size && String(machine.size).toLowerCase().includes(searchLower));
    const matchesStatus = filterStatus === 'All' || machineActualStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredWashers = filterMachineList(allWashers);
  const filteredDryers = filterMachineList(allDryers);
  
  const availableWashersInRoom = allWashers.filter(m => getStatusDetails(m.status).actualStatus === 'Available').length;
  const availableDryersInRoom = allDryers.filter(m => getStatusDetails(m.status).actualStatus === 'Available').length;

  const statusOptions = ['All', 'Available', 'In Use', 'Finishing Soon', 'Cycle Finished', 'Out of Order', 'Unknown'];
  const currentRoomName = laundryRooms.find(room => room.id === selectedRoomId)?.name || (currentView === 'roomDetail' ? "Loading Room..." : "All Rooms");
  const currentRoomOfficialUrl = laundryRooms.find(room => room.id === selectedRoomId)?.url;

  const inputBaseClasses = "w-full p-3 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 dark:bg-slate-700 dark:text-white";
  const inputFocusClasses = "focus:ring-uvm-gold focus:border-uvm-gold";
  const inputBorderClasses = "border-gray-300 dark:border-slate-600";


  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <div key="home" className="animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
              <h2 className={`text-3xl lg:text-4xl font-bold ${effectiveDarkMode ? 'text-white' : 'text-gray-900'} md:mb-0 mb-3 whitespace-nowrap`}>All Laundry Rooms</h2>
              <div className="flex-grow md:flex-grow-0 w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-auto flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search size={18} className="text-gray-500 dark:text-slate-300" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search rooms..."
                    value={homeSearchTerm}
                    onChange={(e) => setHomeSearchTerm(e.target.value)}
                    className={`${inputBaseClasses} ${inputBorderClasses} ${inputFocusClasses} pl-10`}
                  />
                </div>
                <button
                    onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                    className={`flex items-center justify-center w-full sm:w-auto px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-uvm-gold shadow-md whitespace-nowrap
                                ${showOnlyFavorites
                                    ? `bg-[${UVM_GOLD}] text-[${UVM_GREEN}] hover:bg-opacity-90`
                                    : `${effectiveDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'}`}`}
                >
                    <Star size={18} className={`mr-2 ${showOnlyFavorites ? `text-[${UVM_GREEN}]` : (effectiveDarkMode ? 'text-slate-100' : `text-[${UVM_GOLD}]` ) }`} />
                    {showOnlyFavorites ? "Show All" : "Show Favorites"}
                </button>
              </div>
            </div>
            {isLoadingRooms ? (
              <div className="text-center py-16 text-gray-600 dark:text-gray-400"><RefreshCw size={56} className="mx-auto animate-spin text-uvm-green" /><p className="mt-4 text-lg">Loading Rooms...</p></div>
            ) : filteredHomeRooms.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800/70 rounded-xl shadow-lg p-8">
                <Info size={64} className="mx-auto opacity-50 mb-4 text-uvm-green dark:text-uvm-gold" />
                <p className="mt-4 text-xl font-semibold">
                  {homeSearchTerm.trim() !== '' ? 'No rooms match your search.' : (showOnlyFavorites && laundryRooms.length > 0 ? "No favorite rooms yet." : "No laundry rooms found.")}
                </p>
                <p className="text-sm mt-2 opacity-80">
                  {homeSearchTerm.trim() !== '' ? 'Try a different search term or clear the search.' : (showOnlyFavorites && laundryRooms.length > 0 ? "Tap the star on a room card to add it to your favorites!" : "Please check the backend service connection.")}
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
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-3">
              <button onClick={handleGoHome} className={`flex items-center text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-uvm-gold ${effectiveDarkMode ? 'text-slate-100 bg-slate-700 hover:bg-slate-600' : 'text-gray-900 bg-gray-100 hover:bg-gray-200'}`}> <ArrowLeft size={18} className="mr-2"/> Back </button>
              <h2 className={`text-2xl md:text-3xl font-bold text-center flex-1 sm:mx-4 truncate ${effectiveDarkMode ? 'text-white' : 'text-gray-900'}`} title={String(currentRoomName)}>{String(currentRoomName)}</h2>
              <div className="sm:w-auto hidden sm:block" style={{minWidth: '120px'}}>
                  {currentRoomOfficialUrl && (<a href={currentRoomOfficialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2.5 border border-transparent text-xs font-semibold rounded-md shadow-sm text-white transition-colors duration-150 hover:opacity-80 whitespace-nowrap" style={{ backgroundColor: UVM_GREEN }} title="Visit Official Tracker"><ExternalLink size={16} className="mr-1.5" />Official Site</a>)}
              </div>
            </div>
            {currentRoomOfficialUrl && (<div className="my-4 text-center sm:hidden"><a href={currentRoomOfficialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-md shadow-sm text-white transition-colors duration-150 hover:opacity-80" style={{ backgroundColor: UVM_GREEN }} ><ExternalLink size={18} className="mr-2" />Visit Official Tracker</a></div>)}
            
            <div className="mb-8 p-5 sm:p-6 bg-white dark:bg-slate-800/70 rounded-xl shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                <div className="relative">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Search Machines</label>
                  <div className="absolute inset-y-0 left-0 top-7 pl-3.5 flex items-center pointer-events-none">
                    <Search size={18} className="text-gray-500 dark:text-slate-300" />
                  </div>
                  <input type="text" id="search" placeholder="e.g., Washer 13, Dryer" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputBaseClasses} ${inputBorderClasses} ${inputFocusClasses} pl-10`} />
                </div>
                <div className="relative">
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

            {(isLoadingMachines && machines.length === 0 && !isBackgroundRefreshing) ? (
              <div className="text-center py-16 text-gray-600 dark:text-gray-400"><RefreshCw size={56} className="mx-auto animate-spin text-uvm-green" /><p className="mt-4 text-lg">Loading Machines for {currentRoomName}...</p></div>
            ) : (machines.length === 0 && !error && !isLoadingMachines) ? (
                 <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800/70 rounded-xl shadow-lg p-8"><Info size={64} className="mx-auto opacity-50 mb-4 text-uvm-green dark:text-uvm-gold" /><p className="mt-4 text-xl font-semibold">No Machines Found</p><p className="text-sm mt-2 opacity-80">No machines currently listed for {currentRoomName}.</p></div>
            ) : (
              <>
                {allWashers.length > 0 && (
                  <div className="mb-10">
                    <h3 className={`text-2xl font-semibold mb-5 pb-3 border-b-2 ${effectiveDarkMode ? 'text-white border-slate-700' : 'text-gray-900 border-gray-300'}`}>Washers</h3>
                    {filteredWashers.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800/50 rounded-lg shadow-md p-6"><Info size={48} className="mx-auto opacity-50 mb-3" /><p>No washers match your current search/filter.</p></div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                        {filteredWashers.map(machine => <MachineCard key={machine.id || String(machine.machineName) + String(machine.node) } machine={machine} onSetUpSmsAlert={handleOpenSmsModal} isAlertSet={smsAlertsSet.includes(machine.id)} />)}
                        </div>
                    )}
                  </div>
                )}

                {allDryers.length > 0 && (
                  <div>
                    <h3 className={`text-2xl font-semibold mb-5 pb-3 border-b-2 ${effectiveDarkMode ? 'text-white border-slate-700' : 'text-gray-900 border-gray-300'}`}>Dryers</h3>
                     {filteredDryers.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800/50 rounded-lg shadow-md p-6"><Info size={48} className="mx-auto opacity-50 mb-3" /><p>No dryers match your current search/filter.</p></div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                        {filteredDryers.map(machine => <MachineCard key={machine.id || String(machine.machineName) + String(machine.node) } machine={machine} onSetUpSmsAlert={handleOpenSmsModal} isAlertSet={smsAlertsSet.includes(machine.id)} />)}
                        </div>
                    )}
                  </div>
                )}
                {(allWashers.length === 0 && allDryers.length === 0 && machines.length > 0 && !isLoadingMachines) && (
                    <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800/70 rounded-xl shadow-lg p-8"><Info size={64} className="mx-auto opacity-50 mb-4 text-uvm-green dark:text-uvm-gold" /><p className="mt-4 text-xl font-semibold">No Washers or Dryers Found</p><p className="text-sm mt-2 opacity-80">No machines match your current search/filter criteria in {currentRoomName}.</p></div>
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
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 border-b pb-3 border-gray-200 dark:border-slate-700">Appearance</h3>
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/60 rounded-lg">
                    <label htmlFor="systemThemeToggle" className="text-gray-700 dark:text-slate-200 flex items-center text-sm sm:text-base"><span className="mr-2.5">{useSystemTheme ? <Eye size={20} className="text-uvm-green dark:text-uvm-gold" /> : <EyeOff size={20} className="text-gray-500 dark:text-slate-300" />}</span>Use System Theme</label>
                    <button id="systemThemeToggle" onClick={() => setUseSystemTheme(!useSystemTheme)} className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold ${useSystemTheme ? 'bg-uvm-green' : 'bg-gray-300 dark:bg-slate-500'}`}><span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${useSystemTheme ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                  </div>
                  {!useSystemTheme && (<div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/60 rounded-lg">
                    <label htmlFor="manualDarkModeToggle" className="text-gray-700 dark:text-slate-200 flex items-center text-sm sm:text-base"><span className="mr-2.5">{manualDarkMode ? <Moon size={20} className="text-uvm-gold" /> : <Sun size={20} className="text-yellow-500" />}</span>Dark Mode</label>
                    <button id="manualDarkModeToggle" onClick={() => setManualDarkMode(!manualDarkMode)} className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold ${manualDarkMode ? 'bg-uvm-green' : 'bg-gray-300 dark:bg-slate-500'}`}><span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${manualDarkMode ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                  </div>)}
                </div>
              </section>
              <section>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-5 border-b pb-3 border-gray-200 dark:border-slate-700">SMS Alerts</h3>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="userPhoneNumber" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Default Phone Number</label>
                    <div className="flex items-center space-x-3">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Smartphone size={18} className="text-gray-500 dark:text-slate-300" /></div>
                            <input type="tel" id="userPhoneNumber" value={settingsPhoneNumberInput} onChange={handleSettingsPhoneNumberChange} placeholder="(XXX) XXX-XXXX" className={`${inputBaseClasses} ${inputBorderClasses} ${inputFocusClasses} pl-10`} maxLength="14" />
                        </div>
                        <button onClick={handleSavePhoneNumber} className="px-5 py-3 bg-uvm-green text-white rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-uvm-gold focus:ring-offset-2 dark:focus:ring-offset-slate-800 flex items-center text-sm font-semibold"><Save size={18} className="mr-2"/>Save</button>
                    </div>
                    {phoneSaveStatus && <p className={`text-xs mt-2.5 ${phoneSaveStatus.includes('Error') || phoneSaveStatus.includes('valid') ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{phoneSaveStatus}</p>}
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">This number will be pre-filled for SMS alerts. Saved locally.</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );
      default:
        return null;
    }
  };


  return (
    <div className={`min-h-screen font-sans`}>
      <header className="sticky top-0 z-50 shadow-lg" style={{ backgroundColor: UVM_GREEN }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <button onClick={handleGoHome} className="flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-uvm-gold rounded-md p-1 -ml-1 group">
              <img src={UVM_LOGO_URL} alt="UVM Logo" className="h-10 md:h-12 w-auto mr-3 rounded-sm transition-transform duration-300 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display='none'; }}/>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight group-hover:text-uvm-gold transition-colors">UVM LaundryLink</h1>
            </button>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {currentView !== 'settings' && <button onClick={handleRefresh} className="p-2.5 text-white hover:bg-white/20 rounded-full transition-colors" title="Refresh Data"> <RefreshCw size={22} className={(isLoadingRooms || isLoadingMachines || isBackgroundRefreshing) ? 'animate-spin' : ''} /> </button> }
              <button onClick={handleGoToSettings} className="p-2.5 text-white hover:bg-white/20 rounded-full transition-colors" title="Settings"> <Settings size={22} /> </button>
            </div>
          </div>
        </div>
      </header>

      <main className={`container mx-auto p-4 sm:p-6 lg:p-8`}>
        {error && !isLoadingRooms && !isLoadingMachines && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/60 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded-md shadow-md animate-fadeIn" role="alert">
            <div className="flex items-center mb-1">
              <AlertTriangle size={22} className="mr-2.5 text-red-500 dark:text-red-400 flex-shrink-0" />
              <p className="font-semibold text-md">Data Update Error</p>
            </div>
            <p className="text-sm break-words ml-[30px]">{error}</p>
            <p className="text-xs mt-2 opacity-80 ml-[30px]">Tip: Ensure the backend service is running and accessible. Check your internet connection.</p>
          </div>
        )}
        {renderContent()}
      </main>
      <footer className="mt-20 py-10 border-t border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 dark:text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} UVM LaundryLink.</p>
          <p className="mt-1.5">Created by Ivan Minier</p>
        </div>
      </footer>
      
      {showSmsModal && smsMachine && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn" onClick={() => setShowSmsModal(false)}>
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-7 rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Set SMS Alert: <span className="text-uvm-green dark:text-uvm-gold">{String(smsMachine.machineName)}</span></h3>
              <button onClick={() => setShowSmsModal(false)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-300 transition-colors"> <XCircle size={24} /> </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-1.5">The service will attempt to set an SMS alert via the official laundry website.</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-5 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-md border border-yellow-300 dark:border-yellow-700">Note: This feature is experimental. For the most reliable alert setup, use the "Visit Official Tracker" link on the room detail page.</p>
            <div className="mb-5">
              <label htmlFor="modalPhoneNumber" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Phone Number:</label>
              <input type="tel" id="modalPhoneNumber" value={modalPhoneNumber} onChange={(e) => setModalPhoneNumber(formatPhoneNumber(e.target.value))} placeholder="(XXX) XXX-XXXX" className={`${inputBaseClasses} ${inputBorderClasses} ${inputFocusClasses}`} maxLength="14"/>
            </div>
            {smsStatus && (<p className={`text-sm my-4 p-3 rounded-lg border ${smsStatus.toLowerCase().startsWith("error") ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600' : (smsStatus.toLowerCase().startsWith("success") ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600')}`}>{smsStatus}</p>)}
            <div className="mt-7 flex justify-end space-x-3">
              <button onClick={() => setShowSmsModal(false)} className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 ${effectiveDarkMode ? 'bg-slate-600 hover:bg-slate-500 text-slate-100' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>Cancel</button>
              <button onClick={handleSendSmsAlert} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold" style={{backgroundColor: UVM_GREEN}} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f3927'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = UVM_GREEN} disabled={smsStatus.toLowerCase().includes("sending")}>{smsStatus.toLowerCase().includes("sending") ? <RefreshCw size={18} className="animate-spin mr-2" /> : null}Set SMS Alert</button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Custom scrollbar for webkit browsers */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${effectiveDarkMode ? '#1e293b' : '#f1f5f9'}; /* slate-800 or gray-100 */
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: ${effectiveDarkMode ? '#475569' : '#9ca3af'}; /* slate-600 or gray-400 */
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${effectiveDarkMode ? UVM_GOLD : UVM_GREEN}; 
        }
      `}</style>
    </div>
  );
};

export default App;

