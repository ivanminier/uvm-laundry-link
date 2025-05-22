import React, { useState, useEffect, useCallback } from 'react';

import { Zap, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, Sun, Moon, Info, Settings, HelpCircle, LogOut, Tag, Package, Home, List, Star, ArrowLeft, Filter, Bell, BellOff, ExternalLink, Droplet, Wind, MessageCircle } from 'lucide-react';



// UVM Catamount Green: #154734

const UVM_GREEN = '#154734';

const UVM_GOLD = '#fdb515'; 

const UVM_LOGO_URL = 'https://i.imgur.com/kvyrGbL.png'; 



// Helper function to get status color and icon

const getStatusDetails = (status) => {

  const rawStatus = String(status || 'Unknown').trim();

  const lowerStatus = rawStatus.toLowerCase();

  let actualStatusOutput = "Unknown"; 

  let iconElement = <AlertTriangle size={16} className="mr-1.5 flex-shrink-0" />; 

  let textColor = 'text-gray-700 dark:text-gray-400';

  let bgColor = 'bg-gray-100 dark:bg-gray-900';



  if (lowerStatus.includes('available')) {

    actualStatusOutput = 'Available';

    iconElement = <CheckCircle size={16} className="mr-1.5 flex-shrink-0" />;

    textColor = 'text-green-700 dark:text-green-400';

    bgColor = 'bg-green-100 dark:bg-green-900';

  } else if (lowerStatus.includes('out of order') || lowerStatus.includes('service') || lowerStatus.includes('offline')) {

    actualStatusOutput = 'Out of Order';

    iconElement = <XCircle size={16} className="mr-1.5 flex-shrink-0" />;

    textColor = 'text-red-700 dark:text-red-400';

    bgColor = 'bg-red-100 dark:bg-red-900';

  } else if (lowerStatus.includes('eoc') || lowerStatus.includes('cycle finished') || lowerStatus.includes('complete') || lowerStatus.includes('cycle complete')) {

    actualStatusOutput = 'Cycle Finished';

    iconElement = <CheckCircle size={16} className="mr-1.5 flex-shrink-0" />;

    textColor = 'text-teal-700 dark:text-teal-400';

    bgColor = 'bg-teal-100 dark:bg-teal-900';

  } else { 

    const timeMatch = rawStatus.match(/(\d+)\s*min/i); 

    if (timeMatch && parseInt(timeMatch[1], 10) > 0) {

      if (parseInt(timeMatch[1], 10) <= 5) {

        actualStatusOutput = 'Finishing Soon';

        iconElement = <Clock size={16} className="mr-1.5 flex-shrink-0" />;

        textColor = 'text-yellow-700 dark:text-yellow-400';

        bgColor = 'bg-yellow-100 dark:bg-yellow-900';

      } else {

        actualStatusOutput = 'In Use'; 

        iconElement = <Zap size={16} className="mr-1.5 flex-shrink-0" />;

        textColor = 'text-blue-700 dark:text-blue-400';

        bgColor = 'bg-blue-100 dark:bg-blue-900';

      }

    } else if (lowerStatus.includes('in use')) { 

        actualStatusOutput = 'In Use'; 

        iconElement = <Zap size={16} className="mr-1.5 flex-shrink-0" />;

        textColor = 'text-blue-700 dark:text-blue-400';

        bgColor = 'bg-blue-100 dark:bg-blue-900';

    } else if (rawStatus && rawStatus !== 'Unknown') { 

        actualStatusOutput = rawStatus.replace(/\b\w/g, l => l.toUpperCase());

    } else {

        actualStatusOutput = "Status Unknown"; 

    }

  }

  return { icon: iconElement, textColor, bgColor, actualStatus: String(actualStatusOutput) }; 

};



const formatTime = (minutes) => {

  if (!minutes || minutes <= 0) return ''; // Return empty string if no time

  const h = Math.floor(minutes / 60);

  const m = minutes % 60;

  return `${h > 0 ? `${h}h ` : ''}${m}m`;

};



const MachineCard = React.memo(({ machine, onSetReminder, isReminderSet, onSetUpSmsAlert }) => { 

  const { icon: statusIcon, textColor, bgColor, actualStatus } = getStatusDetails(machine.status);

  const canSetReminder = actualStatus === 'In Use' || actualStatus === 'Finishing Soon';

  const MachineTypeSpecificIcon = machine.type === 'Washer' ? Droplet : Wind;



  let badgeTextDisplay;

  const formattedTimeRemaining = formatTime(machine.timeRemaining);



  if ((actualStatus === 'In Use' || actualStatus === 'Finishing Soon') && formattedTimeRemaining) {

    badgeTextDisplay = formattedTimeRemaining;

  } else {

    badgeTextDisplay = actualStatus; 

  }



  return (

    <div className={`rounded-xl shadow-lg p-4 transition-all duration-300 ease-in-out hover:shadow-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex flex-col min-h-[240px] justify-between`}>

      <div>

        <div className="flex items-center justify-between mb-2"> 

          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white truncate" title={String(machine.machineName || `Machine ${machine.id}`)}>

            {String(machine.machineName || `Machine ${machine.id}`)}

          </h3> 

          <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center flex-shrink-0 ${bgColor} ${textColor}`}> 

            {statusIcon} 

            <span className="truncate">{String(badgeTextDisplay)}</span>

          </div> 

        </div>

        <div className="mb-3 flex items-center text-sm text-gray-500 dark:text-slate-400"> 

          <MachineTypeSpecificIcon size={16} className="mr-2 text-slate-500 dark:text-slate-400 flex-shrink-0" /> 

          <span>{String(machine.type || 'N/A')} - {String(machine.size || 'N/A')}</span> 

        </div>

      </div>

      

      <div className="flex-grow flex flex-col items-center justify-center my-2 text-center">

        <p className={`text-xl font-semibold ${textColor}`}>

            {String(actualStatus)}

        </p>

        {(machine.timeRemaining > 0 && (actualStatus === 'In Use' || actualStatus === 'Finishing Soon') && formattedTimeRemaining) && (

            <p className="text-4xl font-bold mt-1" style={{color: UVM_GREEN}}>{formattedTimeRemaining}</p>

        )}

      </div>



      <div className="mt-auto space-y-2 pt-2 border-t border-gray-100 dark:border-slate-700"> 

        {canSetReminder && ( 

          <button 

            onClick={() => onSetReminder(machine)} 

            disabled={isReminderSet} 

            className={`w-full font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800

                        ${isReminderSet 

                            ? 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-slate-400 cursor-not-allowed' 

                            : 'text-uvm-green hover:bg-opacity-80 focus:ring-uvm-gold'}`}

            style={!isReminderSet ? {backgroundColor: UVM_GOLD} : {}}

          > 

            {isReminderSet ? <BellOff size={16} className="mr-2"/> : <Bell size={16} className="mr-2"/>} 

            {isReminderSet ? 'Browser Reminder Set' : 'Notify (Browser)'} 

          </button> 

        )}

         {canSetReminder && (

          <button 

            onClick={() => onSetUpSmsAlert(machine)}

            className="w-full font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 text-sm flex items-center justify-center text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold"

            style={{backgroundColor: UVM_GREEN}}

            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f3927'} // Darker green for hover

            onMouseOut={(e) => e.currentTarget.style.backgroundColor = UVM_GREEN}

          >

            <MessageCircle size={16} className="mr-2" /> 

            Set SMS Alert (via Pi)

          </button>

        )}

        {!canSetReminder && <div className="h-10"></div>} {/* Placeholder to maintain height if no buttons */}

      </div>

    </div>

  );

});



const RoomCard = React.memo(({ room, onSelectRoom, isFavorite, onToggleFavorite }) => ( 

    <div 

        onClick={() => onSelectRoom(room.id)} 

        className="rounded-xl shadow-lg p-6 flex flex-col justify-between hover:shadow-2xl transition-all duration-300 cursor-pointer h-full min-h-[160px] group" 

        style={{ backgroundColor: UVM_GREEN }} 

    > 

        <div> 

            <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-white group-hover:text-uvm-gold transition-colors">{String(room.name)}</h3> 

        </div> 

        <div className="flex items-center justify-end mt-auto pt-4"> 

            <button 

                onClick={(e) => { e.stopPropagation(); onToggleFavorite(room.id); }} 

                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"} 

                className="p-2 rounded-full hover:bg-white/20 transition-colors"

            > 

                <Star size={24} className={`transition-colors ${isFavorite ? `text-[${UVM_GOLD}] fill-[${UVM_GOLD}]` : 'text-white/70 group-hover:text-white'}`} />

            </button> 

        </div> 

    </div> 

));





// Main App Component

const App = () => {

  const [currentView, setCurrentView] = useState('home'); 

  const [laundryRooms, setLaundryRooms] = useState([]);

  const [selectedRoomId, setSelectedRoomId] = useState('');

  const [machines, setMachines] = useState([]);

  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  const [isLoadingMachines, setIsLoadingMachines] = useState(false); 

  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false); 

  const [searchTerm, setSearchTerm] = useState(''); 

  const [filterStatus, setFilterStatus] = useState('All'); 

  const [isDarkMode, setIsDarkMode] = useState(false); 

  const [lastUpdated, setLastUpdated] = useState(null);

  const [error, setError] = useState(null);

  const [favorites, setFavorites] = useState(() => { try { const sf = localStorage.getItem('uvmLaundryFavorites'); return sf ? JSON.parse(sf) : []; } catch (e) { console.error("Error parsing favorites from localStorage", e); return []; } });

  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const [reminders, setReminders] = useState(() => { try { const sr = localStorage.getItem('uvmLaundryReminders'); return sr ? JSON.parse(sr) : []; } catch (e) { console.error("Error parsing reminders from localStorage", e); return []; } });

  const [notificationPermission, setNotificationPermission] = useState('default');

  const [showSmsModal, setShowSmsModal] = useState(false);

  const [smsMachine, setSmsMachine] = useState(null);

  const [phoneNumber, setPhoneNumber] = useState(() => localStorage.getItem('uvmLaundryPhoneNumber') || ''); 

  const [smsStatus, setSmsStatus] = useState(''); 



  const NGROK_BASE_URL = 'https://7eaa-172-56-118-125.ngrok-free.app'; 



  useEffect(() => { const mq = window.matchMedia('(prefers-color-scheme: dark)'); setIsDarkMode(mq.matches); const hc = (e) => setIsDarkMode(e.matches); mq.addEventListener('change', hc); return () => mq.removeEventListener('change', hc); }, []);

  useEffect(() => { document.documentElement.classList.toggle('dark', isDarkMode); }, [isDarkMode]);

  useEffect(() => { if ('Notification' in window) setNotificationPermission(Notification.permission); }, []);

  useEffect(() => { try { localStorage.setItem('uvmLaundryFavorites', JSON.stringify(favorites)); } catch (e) { console.error("Error saving favorites to localStorage", e); } }, [favorites]);

  useEffect(() => { try { localStorage.setItem('uvmLaundryReminders', JSON.stringify(reminders)); } catch (e) { console.error("Error saving reminders to localStorage", e); } }, [reminders]);

  useEffect(() => { localStorage.setItem('uvmLaundryPhoneNumber', phoneNumber); }, [phoneNumber]); 





  const requestNotificationPermission = useCallback(async () => { 

    if ('Notification' in window && Notification.permission === 'default') { 

      const p = await Notification.requestPermission(); 

      setNotificationPermission(p); 

      if (p === 'granted') {

        new Notification("UVM LaundryLink", { body: "Hooray! Notifications are now enabled.", icon: UVM_LOGO_URL, tag: "permission-granted" }); 

      }

    } 

  }, []);

  

  const fetchRooms = useCallback(async () => { 

    setIsLoadingRooms(true); setError(null); 

    const roomsUrl = `${NGROK_BASE_URL}/rooms`; 

    console.log(`Fetching available rooms from: ${roomsUrl}`);

    try { 

      if (NGROK_BASE_URL.includes('YOUR_NGROK_HTTPS_FORWARDING_URL_HERE') || NGROK_BASE_URL.length < 20 || !NGROK_BASE_URL.startsWith('https://')) { 

          setError("Configuration Error: The NGROK_BASE_URL in the app code needs to be a valid https ngrok forwarding URL from your Raspberry Pi."); 

          setIsLoadingRooms(false); 

          setLaundryRooms([]); 

          return; 

      }

      const r = await fetch(roomsUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } }); 

      if (!r.ok) throw new Error(`Rooms fetch failed: ${r.status} ${r.statusText}. URL: ${roomsUrl}`); 

      const data = await r.json();

      setLaundryRooms(Array.isArray(data) ? data.sort((a,b) => String(a.name).localeCompare(String(b.name))) : []); 

      console.log("Fetched rooms:", data);

    } catch (e) { 

      console.error("Error fetching room list:", e); 

      setError(`Failed to load room list. ${e.message}. Ensure your Pi server and ngrok are running correctly. The ngrok URL in the code might need to be updated if it has changed.`); 

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

    console.log(`${isBackground ? "Background refreshing" : "Fetching"} machines for '${roomIdToFetch}' from: ${machineDataUrl}`);

    try {

      const response = await fetch(machineDataUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });

      if (!response.ok) throw new Error(`Machines fetch failed for ${roomIdToFetch}: ${response.status} ${response.statusText}. URL: ${machineDataUrl}`);

      const jsonData = await response.json();

      setMachines(Array.isArray(jsonData) ? jsonData : []); 

      setLastUpdated(new Date());

      if(isBackground && error) setError(null); // Clear error only if there was one and refresh is successful

    } catch (e) { 

        console.error(`Error fetching machines for '${roomIdToFetch}':`, e); 

        const roomName = laundryRooms.find(r=>r.id === roomIdToFetch)?.name || roomIdToFetch;

        if (!isBackground || machines.length === 0) { // Only show error prominently if foreground or no data yet

            setError(`Failed to load machines for ${String(roomName)}. ${e.message}. Check Pi server and ngrok status.`);

        }

        if(!isBackground) setMachines([]); 

    } 

    finally { if (!isBackground) setIsLoadingMachines(false); setIsBackgroundRefreshing(false); }

  }, [NGROK_BASE_URL, laundryRooms, machines.length, error]); // Added error to deps



  useEffect(() => { if (selectedRoomId && currentView === 'roomDetail') fetchMachineData(selectedRoomId, false); }, [selectedRoomId, currentView, fetchMachineData]);

  useEffect(() => { 

    if (!selectedRoomId || currentView !== 'roomDetail') return; 

    const intervalId = setInterval(() => fetchMachineData(selectedRoomId, true), 30000); 

    return () => clearInterval(intervalId); 

  }, [selectedRoomId, currentView, fetchMachineData]);

  

  const handleSelectRoom = (roomId) => { setSelectedRoomId(roomId); setCurrentView('roomDetail'); setSearchTerm(''); setFilterStatus('All'); }; 

  const handleGoHome = () => { setCurrentView('home'); setSelectedRoomId(''); setMachines([]); setError(null); setSearchTerm(''); setFilterStatus('All'); };

  const handleRefresh = () => { 

    setError(null); // Clear previous errors on manual refresh

    if (selectedRoomId && currentView === 'roomDetail') {

      fetchMachineData(selectedRoomId, false); 

    } else if (currentView === 'home') {

      fetchRooms(); 

    }

  };

  const toggleFavorite = (roomId) => setFavorites(p => p.includes(roomId) ? p.filter(id => id !== roomId) : [...p, roomId]);

  

  const addReminderForMachine = useCallback((m) => { 

      const r = laundryRooms.find(room => room.id === selectedRoomId); 

      setReminders(prevReminders => {

          if (prevReminders.find(rm => rm.machineId === m.id && rm.roomId === selectedRoomId)) return prevReminders; 

          return [...prevReminders, { 

              machineId: m.id, 

              roomId: selectedRoomId, // Store roomId to ensure notification is for the correct context

              machineName: String(m.machineName || m.id), 

              roomName: r ? String(r.name) : 'Selected Room', 

              setAt: Date.now() 

          }];

      }); 

      new Notification("UVM LaundryLink Reminder Set", { 

          body: `Reminder set for ${String(m.machineName || m.id)} in "${r ? String(r.name) : 'Selected Room'}". You'll be notified when it's done.`,

          icon: UVM_LOGO_URL,

          tag: `reminder-set-${m.id}`

      });

  }, [laundryRooms, selectedRoomId]);



  const handleSetReminder = useCallback((m) => { 

    if (!('Notification' in window)) { alert("This browser does not support desktop notifications."); return; } 

    if (notificationPermission === 'granted') {

      addReminderForMachine(m);

    } else if (notificationPermission === 'default') {

      requestNotificationPermission().then(permissionResult => { 

        if (permissionResult === 'granted') addReminderForMachine(m); 

        else alert("Notification permission was not granted. Please enable it in your browser settings to use this feature."); 

      });

    } else { // permission is 'denied'

      alert("Notification permission has been denied. Please enable it in your browser settings to use this feature."); 

    }

  }, [notificationPermission, addReminderForMachine, requestNotificationPermission]);

  

  useEffect(() => {

    if (reminders.length === 0 || machines.length === 0 || notificationPermission !== 'granted' || currentView !== 'roomDetail') return;

    

    let triggeredANotification = false; 

    const stillActiveReminders = [];



    reminders.forEach(rem => {

      // Only process reminders for the currently viewed room

      if (rem.roomId !== selectedRoomId) {

        stillActiveReminders.push(rem);

        return;

      }



      const machineForReminder = machines.find(mc => mc.id === rem.machineId); 

      if (machineForReminder) { 

          const { actualStatus } = getStatusDetails(machineForReminder.status); 

          if (actualStatus === 'Available' || actualStatus === 'Cycle Finished') { 

              try { 

                  new Notification("UVM LaundryLink Reminder", { 

                      body: `${String(rem.machineName)} in "${String(rem.roomName)}" has finished!`, 

                      icon: UVM_LOGO_URL,

                      tag: `reminder-done-${rem.machineId}` // Unique tag to prevent multiple similar notifications

                  }); 

              } catch (e) { 

                  console.error("Error showing notification:", e); 

              } 

              triggeredANotification = true; 

              // Do not add to stillActiveReminders, effectively removing it

          } else {

            stillActiveReminders.push(rem); // Machine hasn't finished, keep reminder

          }

      } else {

        // Machine not found in current list (e.g. Pi data changed), keep reminder for now or decide to remove

        stillActiveReminders.push(rem);

      }

    });



    if (triggeredANotification) {

        setReminders(stillActiveReminders);

    }

  }, [machines, reminders, notificationPermission, currentView, selectedRoomId, setReminders]); // Added setReminders



  const handleOpenSmsModal = (machine) => { setSmsMachine(machine); setShowSmsModal(true); setSmsStatus(''); };

  const handleSendSmsAlert = async () => {

    if (!smsMachine || !phoneNumber.trim() || !selectedRoomId) { setSmsStatus("Error: Phone number and machine selection are required."); return; }

    if (!/^\d{10}$/.test(phoneNumber.trim())) { setSmsStatus("Error: Please enter a valid 10-digit phone number."); return; }

    

    setSmsStatus("Sending SMS alert request...");

    try {

      const response = await fetch(`${NGROK_BASE_URL}/set-sms-alert`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ roomId: selectedRoomId, machineName: smsMachine.machineName, phoneNumber: phoneNumber.trim() }) });

      const result = await response.json();

      if (response.ok && result.success) { 

        setSmsStatus(`Success: ${result.message || 'SMS alert request submitted.'}`); 

        setTimeout(() => { // Auto-close modal on success after a delay

            setShowSmsModal(false);

            setSmsStatus(''); // Reset status for next time

        }, 2500);

      } 

      else { throw new Error(result.error || "Failed to set SMS alert via Pi server."); }

    } catch (err) { console.error("Error setting SMS alert via Pi:", err); setSmsStatus(`Error: ${err.message}. Please ensure the Pi server is running and accessible.`); }

  };



  const displayedRooms = showOnlyFavorites ? laundryRooms.filter(room => favorites.includes(room.id)) : laundryRooms;

  const filteredMachines = machines.filter(machine => {

    const { actualStatus: machineActualStatus } = getStatusDetails(machine.status); 

    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = (String(machine.machineName || '')).toLowerCase().includes(searchLower) ||

                          (String(machine.id || '')).toLowerCase().includes(searchLower) || 

                          (String(machine.type || '')).toLowerCase().includes(searchLower) ||

                          (machine.size && String(machine.size).toLowerCase().includes(searchLower));

    const matchesStatus = filterStatus === 'All' || machineActualStatus === filterStatus;

    return matchesSearch && matchesStatus;

  });

  

  const totalWashersInRoom = machines.filter(m => m.type === 'Washer').length;

  const availableWashersInRoom = machines.filter(m => getStatusDetails(m.status).actualStatus === 'Available' && m.type === 'Washer').length;

  const totalDryersInRoom = machines.filter(m => m.type === 'Dryer').length;

  const availableDryersInRoom = machines.filter(m => getStatusDetails(m.status).actualStatus === 'Available' && m.type === 'Dryer').length;



  const statusOptions = ['All', 'Available', 'In Use', 'Finishing Soon', 'Cycle Finished', 'Out of Order', 'Unknown'];

  const currentRoomName = laundryRooms.find(room => room.id === selectedRoomId)?.name || (currentView === 'roomDetail' ? "Loading Room..." : "All Rooms");

  const currentRoomOfficialUrl = laundryRooms.find(room => room.id === selectedRoomId)?.url;



  return (

    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'} font-sans transition-colors duration-300`}> {/* Slightly lighter light mode bg */}

      <header className="sticky top-0 z-50 shadow-lg" style={{ backgroundColor: UVM_GREEN }}>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between h-16">

            <div className="flex items-center"> 

              <img src={UVM_LOGO_URL} alt="UVM Logo" className="h-10 w-auto mr-3 rounded-sm" onError={(e) => { e.currentTarget.style.display='none'; }}/> 

              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">UVM LaundryLink</h1> 

            </div>

            <div className="flex items-center space-x-1 sm:space-x-2"> 

              {currentView === 'roomDetail' && ( <button onClick={handleGoHome} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Back to All Rooms"> <Home size={20} /> </button> )} 

              <button onClick={handleRefresh} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Refresh Data"> <RefreshCw size={20} className={(isLoadingRooms || isLoadingMachines || isBackgroundRefreshing) ? 'animate-spin' : ''} /> </button> 

              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" title="Toggle Dark Mode"> {isDarkMode ? <Sun size={20} /> : <Moon size={20} />} </button> 

            </div>

          </div>

        </div>

      </header>



      <main className={`container mx-auto p-4 sm:p-6 lg:p-8`}>

        {error && ( 

          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg shadow-lg" role="alert"> 

            <div className="flex items-center mb-2"> 

              <AlertTriangle size={24} className="mr-3 text-red-500 dark:text-red-400 flex-shrink-0" /> 

              <p className="font-semibold text-lg">Data Update Error</p> 

            </div> 

            <p className="text-sm break-words">{error}</p> 

            <p className="text-xs mt-2 opacity-80">Tip: Ensure your Pi server & ngrok are running. Check the ngrok URL in the app code. Try opening the ngrok URL directly in your browser. Check the browser's developer console (F12) for more details.</p> 

          </div> 

        )}

        

        {currentView === 'home' && ( 

          <> 

            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4"> 

              <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-uvm-green'}`}>All Laundry Rooms</h2>

              <button 

                  onClick={() => setShowOnlyFavorites(!showOnlyFavorites)} 

                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-uvm-gold

                              ${showOnlyFavorites 

                                ? 'bg-uvm-gold text-uvm-green shadow-md hover:bg-opacity-90' 

                                : `${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'} text-uvm-green dark:text-slate-200`}`}

              > 

                  <Star size={16} className="mr-2"/>

                  {showOnlyFavorites ? "Show All" : "Show Favorites"}

              </button>

            </div> 

            {isLoadingRooms ? ( 

              <div className="text-center py-10 text-gray-600 dark:text-gray-400"> 

                <RefreshCw size={48} className="mx-auto animate-spin" style={{color: UVM_GREEN}} /> 

                <p className="mt-2 text-lg">Loading Rooms...</p> 

              </div> 

            ) : displayedRooms.length === 0 ? ( 

              <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-xl shadow-md"> 

                <Info size={56} className="mx-auto opacity-70" /> 

                <p className="mt-4 text-xl">{showOnlyFavorites && laundryRooms.length > 0 ? "No favorite rooms yet." : "No laundry rooms found."}</p> 

                <p className="text-sm mt-1">{showOnlyFavorites && laundryRooms.length > 0 ? "Tap the star on a room card to add it to your favorites!" : "Please check your Raspberry Pi connection or ngrok setup."}</p>

              </div> 

            ) : ( 

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"> 

                {displayedRooms.map(room => ( 

                  <RoomCard key={room.id} room={room} onSelectRoom={handleSelectRoom} isFavorite={favorites.includes(room.id)} onToggleFavorite={toggleFavorite} /> 

                ))} 

              </div> 

            )} 

          </> 

        )}

        

        {currentView === 'roomDetail' && ( 

          <> 

            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-3"> 

              <button onClick={handleGoHome} className={`flex items-center text-sm font-medium rounded-lg px-3 py-2 hover:bg-gray-200 dark:hover:bg-slate-700 ${isDarkMode ? 'text-white' : 'text-uvm-green'} transition-colors focus:outline-none focus:ring-2 focus:ring-uvm-gold`}> <ArrowLeft size={18} className="mr-2"/> Back </button> 

              <h2 className={`text-2xl md:text-3xl font-bold text-center flex-1 sm:mx-4 truncate ${isDarkMode ? 'text-white' : 'text-uvm-green'}`} title={String(currentRoomName)}>{String(currentRoomName)}</h2> 

              {/* Invisible div for balancing, only on larger screens if needed */}

              <div className="sm:w-auto hidden sm:block" style={{minWidth: '80px'}}> {/* Ensure it has some width for balance */}

                 {currentRoomOfficialUrl && (

                    <a href={currentRoomOfficialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md shadow-sm text-white transition-colors duration-150 hover:opacity-80 whitespace-nowrap" style={{ backgroundColor: UVM_GREEN }} title="Visit Official Tracker"> 

                    <ExternalLink size={16} className="mr-1.5" /> 

                    Official Site

                    </a> 

                 )}

              </div>

            </div> 

            

             {/* Official Tracker link more prominent for mobile below header */}

            {currentRoomOfficialUrl && ( 

              <div className="my-4 text-center sm:hidden"> 

                <a href={currentRoomOfficialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white transition-colors duration-150 hover:opacity-80" style={{ backgroundColor: UVM_GREEN }} > 

                  <ExternalLink size={18} className="mr-2" /> 

                  Visit Official Tracker & Set Alerts

                </a> 

              </div> 

            )}

            

            <div className="mb-6 p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl"> 

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end"> 

                <div> 

                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Search Machines</label> 

                  <input type="text" id="search" placeholder="e.g., Washer 13, Dryer, Large" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-uvm-gold focus:border-uvm-gold dark:bg-slate-700 dark:text-white transition-colors" /> 

                </div> 

                <div> 

                  <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Filter by Status</label> 

                  <select id="statusFilter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-uvm-gold focus:border-uvm-gold dark:bg-slate-700 dark:text-white transition-colors"> 

                    {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)} 

                  </select> 

                </div> 

              </div> 

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-slate-300">

                <p>Washers: <span className="font-semibold text-uvm-green dark:text-uvm-gold">{availableWashersInRoom}</span> Available / <span className="font-semibold">{totalWashersInRoom}</span> Total</p>

                <p>Dryers: <span className="font-semibold text-uvm-green dark:text-uvm-gold">{availableDryersInRoom}</span> Available / <span className="font-semibold">{totalDryersInRoom}</span> Total</p>

              </div>

              {lastUpdated && <p className="text-xs text-gray-500 dark:text-slate-400 mt-3 text-right">Last Updated: {lastUpdated.toLocaleTimeString()}</p>}

            </div>



            {(isLoadingMachines && machines.length === 0 && !isBackgroundRefreshing) ? ( 

              <div className="text-center py-10 text-gray-600 dark:text-gray-400"> 

                <RefreshCw size={48} className="mx-auto animate-spin" style={{color: UVM_GREEN}} /> 

                <p className="mt-2 text-lg">Loading Machines for {currentRoomName}...</p> 

              </div> 

            ) : (filteredMachines.length === 0 && !error && !isLoadingMachines) ? ( 

              <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-xl shadow-md"> 

                <Info size={56} className="mx-auto opacity-70" /> 

                <p className="mt-4 text-xl">No Machines Found</p>

                <p className="text-sm mt-1">No machines in {currentRoomName} match your current search/filter criteria.</p>

              </div> 

            ) : ( 

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6"> 

                {filteredMachines.map(machine => ( 

                  <MachineCard key={machine.id || String(machine.machineName) + String(machine.node) } machine={machine} onSetReminder={handleSetReminder} isReminderSet={reminders.some(r => r.machineId === machine.id && r.roomId === selectedRoomId)} onSetUpSmsAlert={handleOpenSmsModal} /> 

                ))} 

              </div> 

            )}

          </> 

        )}

      </main>

      <footer className="mt-16 py-8 border-t border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/50"> 

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 dark:text-slate-400 text-sm"> 

          <p>&copy; {new Date().getFullYear()} UVM LaundryLink.</p> 

          <p className="mt-1">Created by Ivan Minier</p> 

        </div> 

      </footer>

      

      {showSmsModal && smsMachine && ( 

        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={() => setShowSmsModal(false)}> 

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}> 

            <div className="flex justify-between items-center mb-4"> 

              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Set SMS Alert: <span className="text-uvm-green dark:text-uvm-gold">{String(smsMachine.machineName)}</span></h3> 

              <button onClick={() => setShowSmsModal(false)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors"> <XCircle size={24} /> </button> 

            </div> 

            <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">Your Pi server will attempt to set an SMS alert on the official laundry website.</p> 

            <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-4">Note: This feature is experimental and may not always work if the official website changes. Use the "Visit Official Tracker" link for the most reliable alert setup.</p> 

            <div className="mb-4"> 

              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Phone Number (10 digits):</label> 

              <input 

                type="tel" 

                id="phoneNumber" 

                value={phoneNumber} 

                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0,10))} 

                placeholder="e.g., 8025551234" 

                className="mt-1 block w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-uvm-gold focus:border-uvm-gold sm:text-sm dark:bg-slate-700 dark:text-white transition-colors" 

                maxLength="10" 

              /> 

            </div> 

            {smsStatus && ( 

              <p className={`text-sm my-3 p-3 rounded-lg ${smsStatus.toLowerCase().startsWith("error") ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-600' : (smsStatus.toLowerCase().startsWith("success") ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-600' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600')}`}> 

                {smsStatus} 

              </p> 

            )} 

            <div className="mt-6 flex justify-end space-x-3"> 

              <button onClick={() => setShowSmsModal(false)} className="px-4 py-2 rounded-lg text-gray-700 dark:text-slate-200 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400">Cancel</button> 

              <button 

                onClick={handleSendSmsAlert} 

                className="px-4 py-2 rounded-lg text-white font-medium transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-uvm-gold" 

                style={{backgroundColor: UVM_GREEN}} 

                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0f3927'} 

                onMouseOut={(e) => e.currentTarget.style.backgroundColor = UVM_GREEN}

                disabled={smsStatus.toLowerCase().includes("sending")}

              > 

                {smsStatus.toLowerCase().includes("sending") ? <RefreshCw size={18} className="animate-spin mr-2" /> : null}

                Set SMS Alert 

              </button> 

            </div> 

          </div> 

        </div> 

      )}

    </div>

  );

};



export default App;

