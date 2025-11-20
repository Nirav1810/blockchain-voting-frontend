import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import './App.css';

// Context for global state management
const AppContext = createContext();

// Custom MessageBox component
const MessageBox = ({ message, type, onClose }) => {
    if (!message) return null;

    const isError = type === 'error';
    const icon = isError ? '⚠️' : '✓';

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className={`glassmorphic rounded-3xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center justify-center gap-4 animate-slide-up ${isError ? 'border-red-200/50 bg-red-50/80' : 'border-green-200/50 bg-green-50/80'}`}>
                <div className={`w-16 h-16 rounded-full ${isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} flex items-center justify-center text-3xl animate-pulse shadow-sm`}>
                    {icon}
                </div>
                <p className={`text-lg text-center font-semibold ${isError ? 'text-red-900' : 'text-green-900'}`}>{message}</p>
                <button
                    onClick={onClose}
                    className="mt-4 px-8 py-2.5 bg-white/80 hover:bg-white text-slate-800 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-1 shadow-sm border border-slate-200/50"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
};

// Main App component
const App = () => {
    const [web3, setWeb3] = useState(null);
    const [contract, setContract] = useState(null);
    const [currentAccount, setCurrentAccount] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [isAuthorizedVoter, setIsAuthorizedVoter] = useState(false);
    
    // Authentication State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userEmail, setUserEmail] = useState(''); 
    
    const [currentPage, setCurrentPage] = useState('auth');
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState('info');
    const [isLoading, setIsLoading] = useState(false);
    const [isWeb3LibLoaded, setIsWeb3LibLoaded] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Contract ABI
    const contractABI = [
        { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
        { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "uint256", "name": "candidateId", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" }], "name": "CandidateAdded", "type": "event" },
        { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "voter", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "candidateId", "type": "uint256" }], "name": "Voted", "type": "event" },
        { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "voterAddress", "type": "address" }], "name": "VoterAuthorized", "type": "event" },
        { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "voterAddress", "type": "address" }], "name": "VoterRemoved", "type": "event" },
        { "anonymous": false, "inputs": [], "name": "VotingEnded", "type": "event" },
        { "anonymous": false, "inputs": [], "name": "VotingStarted", "type": "event" },
        { "inputs": [{ "internalType": "string", "name": "_name", "type": "string" }], "name": "addCandidate", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{ "internalType": "address", "name": "_voterAddress", "type": "address" }], "name": "authorizeVoter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "authorizedVoters", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
        { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "candidates", "outputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }, { "internalType": "string", "name": "name", "type": "string" }, { "internalType": "uint256", "name": "voteCount", "type": "uint256" }], "stateMutability": "view", "type": "function" },
        { "inputs": [], "name": "endVoting", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [], "name": "getCandidates", "outputs": [{ "components": [{ "internalType": "uint256", "name": "id", "type": "uint256" }, { "internalType": "string", "name": "name", "type": "string" }, { "internalType": "uint256", "name": "voteCount", "type": "uint256" }], "internalType": "struct Voting.Candidate[]", "name": "", "type": "tuple[]" }], "stateMutability": "view", "type": "function" },
        { "inputs": [{ "internalType": "address", "name": "_voterAddress", "type": "address" }], "name": "getVoterStatus", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
        { "inputs": [], "name": "getVotingStatus", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
        { "inputs": [], "name": "getWinner", "outputs": [{ "internalType": "uint256", "name": "winnerId", "type": "uint256" }, { "internalType": "string", "name": "winnerName", "type": "string" }], "stateMutability": "view", "type": "function" },
        { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "hasVoted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
        { "inputs": [], "name": "nextCandidateId", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
        { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
        { "inputs": [{ "internalType": "address", "name": "_voterAddress", "type": "address" }], "name": "removeAuthorizedVoter", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [], "name": "startVoting", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [{ "internalType": "uint256", "name": "_candidateId", "type": "uint256" }], "name": "vote", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
        { "inputs": [], "name": "votingOpen", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }
    ];

    // IMPORTANT: Replace with your deployed contract address on Sepolia
    const contractAddress = "0x27ef4f08b1696a0F813CA49845FcA11206f1ADBA";

    const showMessage = (msg, type = 'info') => {
        setMessage(msg);
        setMessageType(type);
    };

    const clearMessage = () => {
        setMessage(null);
    };

    // --- Dynamic Script Loading for Web3.js ---
    useEffect(() => {
        const loadScript = (id, src, onLoad, onError) => {
            if (document.getElementById(id)) {
                onLoad();
                return;
            }
            const script = document.createElement('script');
            script.id = id;
            script.src = src;
            script.async = true;
            script.onload = onLoad;
            script.onerror = onError;
            document.body.appendChild(script);
            return () => {
                const existingScript = document.getElementById(id);
                if (existingScript) {
                    document.body.removeChild(existingScript);
                }
            };
        };

        loadScript(
            'web3-lib',
            "https://cdn.jsdelivr.net/npm/web3@1.7.0/dist/web3.min.js",
            () => {
                setIsWeb3LibLoaded(true);
                console.log("Web3.js library loaded successfully.");
            },
            (e) => {
                console.error("Failed to load Web3.js library:", e);
                showMessage("Failed to load Web3.js library. Please check your internet connection.", "error");
                setIsWeb3LibLoaded(false);
            }
        );
    }, []);

    // --- MetaMask Connection Logic ---
    const connectWallet = useCallback(async () => {
        if (!isWeb3LibLoaded) {
            showMessage("Web3.js library is still loading. Please wait.", "error");
            return;
        }
        if (window.ethereum) {
            try {
                setIsLoading(true);
                const web3Instance = new window.Web3(window.ethereum);
                setWeb3(web3Instance);

                const accounts = await web3Instance.eth.requestAccounts();
                const account = accounts[0];
                setCurrentAccount(account);

                const votingContract = new web3Instance.eth.Contract(contractABI, contractAddress);
                setContract(votingContract);

                const contractOwner = await votingContract.methods.owner().call();
                setIsOwner(account.toLowerCase() === contractOwner.toLowerCase());

                const authorized = await votingContract.methods.authorizedVoters(account).call();
                setIsAuthorizedVoter(authorized);

                showMessage("MetaMask connected successfully!", "info");
                setIsLoading(false);
            } catch (error) {
                console.error("Error connecting to MetaMask:", error);
                if (error.code === 4001) {
                    showMessage("MetaMask connection rejected by user.", "error");
                } else {
                    showMessage(`Failed to connect MetaMask: ${error instanceof Error ? error.message : String(error)}`, "error");
                }
                setIsLoading(false);
            }
        } else {
            showMessage("MetaMask is not installed. Please install it to use this DApp.", "error");
        }
    }, [contractABI, contractAddress, isWeb3LibLoaded]);

    useEffect(() => {
        if (window.ethereum && web3) {
            const handleAccountsChanged = async (accounts) => {
                if (accounts.length > 0) {
                    const account = accounts[0];
                    setCurrentAccount(account);
                    if (contract) {
                        try {
                            const ownerAddr = await contract.methods.owner().call();
                            setIsOwner(account.toLowerCase() === ownerAddr.toLowerCase());
                            const auth = await contract.methods.authorizedVoters(account).call();
                            setIsAuthorizedVoter(auth);
                        } catch (error) {
                            console.error("Error updating account status:", error);
                        }
                    }
                } else {
                    setCurrentAccount(null);
                    setIsOwner(false);
                    setIsAuthorizedVoter(false);
                    setContract(null);
                    showMessage("MetaMask account disconnected.", "info");
                }
            };
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            return () => {
                window.ethereum.off('accountsChanged', handleAccountsChanged);
            };
        }
    }, [web3, contract]);

    // --- Email Authentication Logic ---
    const handleEmailLogin = (email) => {
        setUserEmail(email);
        setIsAuthenticated(true);
        setCurrentPage('vote');
        showMessage(`Successfully logged in as ${email}`, "info");
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUserEmail('');
        setCurrentPage('auth');
        showMessage("Logged out successfully.", "info");
    };

    // --- Render Logic ---
    const renderPage = () => {
        if (currentPage === 'auth') {
            return (
                <Auth
                    onLogin={handleEmailLogin}
                    isAuthenticated={isAuthenticated}
                    onLogout={logout}
                    onConnectWallet={connectWallet}
                    currentAccount={currentAccount}
                    isWeb3LibLoaded={isWeb3LibLoaded}
                    showMessage={showMessage}
                />
            );
        } else if (currentPage === 'admin') {
            return <AdminPanel web3={web3} />;
        } else if (currentPage === 'vote') {
            return <VotingInterface userEmail={userEmail} />;
        } else if (currentPage === 'results') {
            return <Results />;
        }
        return null;
    };

    return (
        <AppContext.Provider value={{ web3, contract, currentAccount, isOwner, isAuthorizedVoter, isAuthenticated, showMessage, clearMessage, isLoading, setIsLoading, userEmail }}>
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 selection:bg-indigo-100 selection:text-indigo-900">
                {/* Navigation Bar */}
                <nav className="fixed top-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/50 transition-all duration-300">
                    <div className="max-w-7xl mx-auto px-6 py-4 relative flex items-center justify-between">
                        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setCurrentPage('auth')}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform duration-300">
                                🗳️
                            </div>
                            <div className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
                                SecureVote
                            </div>
                        </div>

                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="md:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors ml-4"
                        >
                            <span className="text-2xl">☰</span>
                        </button>
                    </div>

                    <div className="hidden md:flex absolute inset-x-0 top-1/2 -translate-y-1/2 justify-center pointer-events-none">
                        <div className="pointer-events-auto flex items-center gap-3 bg-white/90 shadow-lg rounded-full px-4 py-2 border border-indigo-100/60 backdrop-blur-2xl">
                            <button
                                onClick={() => setCurrentPage('auth')}
                                className={`nav-pill-button ${currentPage === 'auth' ? 'active' : ''}`}
                            >
                                Authentication
                            </button>
                            <button
                                onClick={() => setCurrentPage('vote')}
                                className={`nav-pill-button ${currentPage === 'vote' ? 'active' : ''} ${!isAuthenticated || !currentAccount ? 'opacity-60 cursor-not-allowed' : ''}`}
                                disabled={!isAuthenticated || !currentAccount}
                            >
                                Voting
                            </button>
                            <button
                                onClick={() => setCurrentPage('results')}
                                className={`nav-pill-button ${currentPage === 'results' ? 'active' : ''}`}
                            >
                                Results
                            </button>
                            {isOwner && (
                                <button
                                    onClick={() => setCurrentPage('admin')}
                                    className={`nav-pill-button ${currentPage === 'admin' ? 'active' : ''}`}
                                >
                                    Admin
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Mobile Menu */}
                    {sidebarOpen && (
                        <div className="md:hidden absolute top-full left-0 right-0 bg-white/90 backdrop-blur-xl border-b border-slate-200/50 p-4 flex flex-col gap-2 animate-slide-down shadow-xl">
                            <button onClick={() => { setCurrentPage('auth'); setSidebarOpen(false); }} className="p-3 rounded-xl hover:bg-slate-50 text-left font-medium text-slate-700">🔐 Authentication</button>
                            <button onClick={() => { setCurrentPage('vote'); setSidebarOpen(false); }} className="p-3 rounded-xl hover:bg-slate-50 text-left font-medium text-slate-700" disabled={!isAuthenticated || !currentAccount}>🗳️ Voting</button>
                            <button onClick={() => { setCurrentPage('results'); setSidebarOpen(false); }} className="p-3 rounded-xl hover:bg-slate-50 text-left font-medium text-slate-700">📊 Results</button>
                            {isOwner && <button onClick={() => { setCurrentPage('admin'); setSidebarOpen(false); }} className="p-3 rounded-xl hover:bg-slate-50 text-left font-medium text-slate-700">⚙️ Admin Panel</button>}
                        </div>
                    )}
                </nav>

                {/* Main Content */}
                <div className="pt-28 pb-12 px-4 flex flex-col items-center justify-center min-h-screen w-full">
                    <div className="w-full max-w-7xl flex flex-col items-center">
                        {/* Header Section - Only show on Auth page or if needed */}
                        {currentPage === 'auth' && (
                            <div className="hero-section animate-slide-up mb-8 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm mx-auto">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                    Secure Blockchain System
                                </div>
                                <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-tight text-center">
                                    Decentralized <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Voting</span>
                                </h1>
                                <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed text-center">
                                    Experience the future of democracy with our secure, transparent, and immutable voting platform powered by Ethereum.
                                </p>
                            </div>
                        )}

                        {/* Loading overlay */}
                        {isLoading && (
                            <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                                <div className="flex flex-col items-center p-8 bg-white rounded-3xl shadow-2xl border border-slate-100">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 mb-4"></div>
                                    <p className="text-lg font-semibold text-slate-700">Processing...</p>
                                </div>
                            </div>
                        )}

                        {/* Page content */}
                        <div className="animate-slide-up w-full flex justify-center">
                            {renderPage()}
                        </div>
                    </div>
                </div>


                <MessageBox message={message} type={messageType} onClose={clearMessage} />
            </div>
        </AppContext.Provider>
    );
};

// --- Auth Component (Email Login) ---
const Auth = ({ onLogin, isAuthenticated, onLogout, onConnectWallet, currentAccount, isWeb3LibLoaded, showMessage }) => {
    const { isLoading, setIsLoading } = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState(1); // 1: Email, 2: Code
    const [generatedCode, setGeneratedCode] = useState(null);

    const handleSendCode = async () => {
        if (!email || !email.includes('@')) {
            showMessage("Please enter a valid email address.", "error");
            return;
        }
        setIsLoading(true);
        
        setTimeout(() => {
            const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
            setGeneratedCode(mockCode);
            setStep(2);
            setIsLoading(false);
            console.log(`%c[SIMULATION] Code: ${mockCode}`, "color: green; font-weight: bold; font-size: 14px;");
            alert(`[SIMULATION]\n\nYour verification code is: ${mockCode}`);
            showMessage("Verification code sent! Check your email (or alert).", "info");
        }, 1500);
    };

    const handleVerifyCode = () => {
        if (code === generatedCode) {
            onLogin(email);
        } else {
            showMessage("Invalid verification code.", "error");
        }
    };

    const resetAuth = () => {
        setStep(1);
        setEmail('');
        setCode('');
        setGeneratedCode(null);
    };

    return (
        <div className="flex justify-center items-center w-full px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
                
                {/* Email Login Card */}
                <div className="card h-full flex flex-col min-h-[400px]">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl mb-6 shadow-sm">📧</div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Authentication</h2>
                    <p className="text-slate-600 mb-8">Verify your identity to participate in the voting process.</p>
                    
                    <div className="space-y-4 mt-auto">
                        {!isAuthenticated ? (
                            step === 1 ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                                        <input 
                                            type="email" 
                                            placeholder="name@example.com" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input-field w-full"
                                        />
                                    </div>
                                    <button onClick={handleSendCode} className="button-primary w-full" disabled={isLoading}>
                                        {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="text-center mb-4">
                                        <p className="text-sm text-slate-600 mb-2">Enter the 6-digit code sent to</p>
                                        <p className="font-semibold text-slate-900">{email}</p>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="000000" 
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="input-field w-full text-center text-3xl tracking-[0.5em] font-mono py-4"
                                        maxLength={6}
                                    />
                                    <button onClick={handleVerifyCode} className="button-primary w-full" disabled={isLoading}>
                                        Verify & Login
                                    </button>
                                    <button onClick={resetAuth} className="text-sm text-indigo-600 font-medium w-full text-center hover:text-indigo-800 transition-colors">
                                        Change email address
                                    </button>
                                </>
                            )
                        ) : (
                            <div className="bg-green-50/50 border border-green-100 rounded-2xl p-6 text-center flex flex-col items-center justify-center h-full">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xl mb-3">✓</div>
                                <p className="text-green-900 font-bold text-lg">Authenticated</p>
                                <p className="text-green-700 text-sm mt-1 mb-4">{email}</p>
                                <button onClick={onLogout} className="button-secondary w-full text-sm py-2">Sign Out</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* MetaMask Card */}
                <div className="card h-full flex flex-col min-h-[400px]">
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl mb-6 shadow-sm">🦊</div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Wallet Connection</h2>
                    <p className="text-slate-600 mb-8">Connect your Ethereum wallet to cast your vote securely.</p>
                    
                    <div className="space-y-4 mt-auto">
                        {currentAccount ? (
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 text-center flex flex-col items-center justify-center h-full">
                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xl mb-3">🔗</div>
                                <p className="text-indigo-900 font-bold text-lg">Wallet Connected</p>
                                <p className="text-indigo-700 font-mono text-xs mt-1 break-all bg-white/50 py-2 px-3 rounded-lg border border-indigo-100/50 w-full">{currentAccount}</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-2">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                        <p className="text-sm text-slate-600">Install MetaMask extension</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                        <p className="text-sm text-slate-600">Create or import a wallet</p>
                                    </div>
                                </div>
                                <button onClick={onConnectWallet} className="button-primary w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-200" disabled={isLoading || !isWeb3LibLoaded}>
                                    {isLoading ? 'Connecting...' : (isWeb3LibLoaded ? 'Connect MetaMask' : 'Loading Web3...')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- AdminPanel Component ---
const AdminPanel = ({ web3 }) => {
    const { contract, currentAccount, isOwner, showMessage, setIsLoading } = useContext(AppContext);
    const [newCandidateName, setNewCandidateName] = useState('');
    const [voterAddressToAuthorize, setVoterAddressToAuthorize] = useState('');
    const [voterAddressToRemove, setVoterAddressToRemove] = useState('');
    const [candidates, setCandidates] = useState([]);

    const fetchCandidates = useCallback(async () => {
        if (contract) {
            try {
                const fetchedCandidates = await contract.methods.getCandidates().call();
                setCandidates(fetchedCandidates);
            } catch (error) {
                console.error("Error fetching candidates:", error);
                showMessage("Error fetching candidates.", "error");
            }
        }
    }, [contract, showMessage]);

    useEffect(() => {
        if (contract) {
            fetchCandidates();
            const onCandidateAdded = () => fetchCandidates();
            contract.events.CandidateAdded().on('data', onCandidateAdded);
            return () => contract.events.CandidateAdded().off('data', onCandidateAdded);
        }
    }, [contract, fetchCandidates]);

    const handleAddCandidate = async () => {
        if (!contract || !newCandidateName) return;
        setIsLoading(true);
        try {
            await contract.methods.addCandidate(newCandidateName).send({ from: currentAccount });
            setNewCandidateName('');
            showMessage("Candidate added successfully!", "info");
        } catch (error) {
            showMessage(`Failed to add candidate: ${error instanceof Error ? error.message : String(error)}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuthorizeVoter = async () => {
        if (!contract || !web3.utils.isAddress(voterAddressToAuthorize)) {
            showMessage("Please enter a valid Ethereum address.", "error");
            return;
        }
        setIsLoading(true);
        try {
            await contract.methods.authorizeVoter(voterAddressToAuthorize).send({ from: currentAccount });
            setVoterAddressToAuthorize('');
            showMessage("Voter authorized successfully!", "info");
        } catch (error) {
            showMessage(`Failed to authorize voter: ${error instanceof Error ? error.message : String(error)}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveVoter = async () => {
        if (!contract || !web3.utils.isAddress(voterAddressToRemove)) {
            showMessage("Please enter a valid Ethereum address.", "error");
            return;
        }
        setIsLoading(true);
        try {
            await contract.methods.removeAuthorizedVoter(voterAddressToRemove).send({ from: currentAccount });
            setVoterAddressToRemove('');
            showMessage("Voter removed successfully!", "info");
        } catch (error) {
            showMessage(`Failed to remove voter: ${error instanceof Error ? error.message : String(error)}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartVoting = async () => {
        if (!contract) return;
        setIsLoading(true);
        try {
            await contract.methods.startVoting().send({ from: currentAccount });
            showMessage("Voting started!", "info");
        } catch (error) {
            showMessage(`Failed to start voting: ${error instanceof Error ? error.message : String(error)}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEndVoting = async () => {
        if (!contract) return;
        setIsLoading(true);
        try {
            await contract.methods.endVoting().send({ from: currentAccount });
            showMessage("Voting ended!", "info");
        } catch (error) {
            showMessage(`Failed to end voting: ${error instanceof Error ? error.message : String(error)}`, "error");
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOwner) return (
        <div className="card text-center max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-700">Only contract owner can access admin panel</p>
        </div>
    );

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="card text-center mb-12">
                <h2 className="text-4xl font-bold text-slate-900 mb-2">⚙️ Admin Dashboard</h2>
                <p className="text-slate-700">Manage candidates, voters, and voting controls</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="card">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="text-4xl">➕</div>
                        <h3 className="text-2xl font-bold text-slate-900">Add Candidate</h3>
                    </div>
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            placeholder="Candidate name" 
                            value={newCandidateName} 
                            onChange={(e) => setNewCandidateName(e.target.value)} 
                            className="input-field w-full" 
                        />
                        <button onClick={handleAddCandidate} className="button-primary w-full">Create Candidate</button>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="text-4xl">👥</div>
                        <h3 className="text-2xl font-bold text-slate-900">Manage Voters</h3>
                    </div>
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            placeholder="Address to authorize" 
                            value={voterAddressToAuthorize} 
                            onChange={(e) => setVoterAddressToAuthorize(e.target.value)} 
                            className="input-field w-full" 
                        />
                        <button onClick={handleAuthorizeVoter} className="button-primary w-full bg-gradient-to-r from-emerald-600 to-emerald-700">✓ Authorize</button>
                        <input 
                            type="text" 
                            placeholder="Address to remove" 
                            value={voterAddressToRemove} 
                            onChange={(e) => setVoterAddressToRemove(e.target.value)} 
                            className="input-field w-full" 
                        />
                        <button onClick={handleRemoveVoter} className="button-primary w-full bg-gradient-to-r from-red-600 to-red-700">✕ Remove</button>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="flex items-center gap-2 mb-6">
                    <div className="text-4xl">⏱️</div>
                    <h3 className="text-2xl font-bold text-slate-900">Voting Control</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={handleStartVoting} className="button-primary bg-gradient-to-r from-amber-600 to-amber-700">▶️ Start Voting</button>
                    <button onClick={handleEndVoting} className="button-primary bg-gradient-to-r from-orange-600 to-orange-700">⏹️ End Voting</button>
                </div>
            </div>
        </div>
    );
};

// --- VotingInterface Component (UPDATED: No longer hides if not authorized) ---
const VotingInterface = ({ userEmail }) => {
    const { contract, currentAccount, isAuthorizedVoter, isAuthenticated, showMessage, setIsLoading } = useContext(AppContext);
    const [candidates, setCandidates] = useState([]);
    const [votingStatus, setVotingStatus] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);

    const fetchVotingData = useCallback(async () => {
        if (contract && currentAccount) {
            try {
                const [fetchedCandidates, status, voterHasVoted] = await Promise.all([
                    contract.methods.getCandidates().call(),
                    contract.methods.getVotingStatus().call(),
                    contract.methods.hasVoted(currentAccount).call()
                ]);
                setCandidates(fetchedCandidates);
                setVotingStatus(status);
                setHasVoted(voterHasVoted);
            } catch (error) {
                showMessage("Error fetching voting data.", "error");
            }
        }
    }, [contract, currentAccount, showMessage]);

    useEffect(() => {
        fetchVotingData();
        if (contract) {
            const onVoted = () => fetchVotingData();
            contract.events.Voted().on('data', onVoted);
            contract.events.VotingStarted().on('data', fetchVotingData);
            contract.events.VotingEnded().on('data', fetchVotingData);
            return () => {
                contract.events.Voted().off('data', onVoted);
                contract.events.VotingStarted().off('data', fetchVotingData);
                contract.events.VotingEnded().off('data', fetchVotingData);
            };
        }
    }, [contract, fetchVotingData]);

    const handleVote = async (candidateId) => {
        if (!contract || !isAuthenticated || !isAuthorizedVoter || hasVoted || !votingStatus) {
            let errorMsg = "Cannot vote. ";
            if (!isAuthenticated) errorMsg += "You must be logged in with Email. ";
            if (!isAuthorizedVoter) errorMsg += "You are not an authorized voter. ";
            if (hasVoted) errorMsg += "You have already voted. ";
            if (!votingStatus) errorMsg += "Voting is closed. ";
            showMessage(errorMsg, "error");
            return;
        }
        setIsLoading(true);
        try {
            await contract.methods.vote(candidateId).send({ from: currentAccount });
            showMessage("Vote cast successfully!", "info");
            setHasVoted(true);
        } catch (error) {
            showMessage(`Failed to cast vote: ${error instanceof Error ? error.message : String(error)}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated || !currentAccount) return (
        <div className="card text-center max-w-2xl mx-auto py-16">
            <div className="text-6xl mb-6 animate-bounce">🔒</div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Access Restricted</h2>
            <p className="text-slate-600 text-lg">Please verify your email and connect your wallet to access the voting booth.</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="card text-center mb-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <h2 className="text-4xl font-bold text-slate-900 mb-4 mt-2">Cast Your Vote</h2>
                {userEmail && <p className="text-sm text-slate-500 mb-6 bg-slate-100 inline-block px-4 py-1 rounded-full">Logged in as: <span className="font-semibold text-slate-700">{userEmail}</span></p>}
                
                {/* Authorization Warning Banner */}
                {!isAuthorizedVoter && (
                    <div className="bg-red-50 border border-red-100 text-red-800 p-6 mb-8 text-left rounded-2xl shadow-sm max-w-3xl mx-auto flex items-start gap-4">
                        <div className="text-3xl">🚫</div>
                        <div>
                            <p className="font-bold text-lg">Not Authorized</p>
                            <p className="mt-1">Your wallet address <code className="bg-red-100 px-2 py-0.5 rounded text-sm font-mono">{currentAccount}</code> is not authorized to vote.</p>
                            <p className="text-sm mt-2 text-red-600">Please contact the election administrator to approve this wallet.</p>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 justify-center flex-wrap">
                    <div className={`badge ${votingStatus ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                        {votingStatus ? '● Voting Status: OPEN' : '● Voting Status: CLOSED'}
                    </div>
                    {hasVoted && (
                        <div className="badge bg-amber-100 text-amber-800 border border-amber-200">
                            ✓ You have voted
                        </div>
                    )}
                </div>
            </div>
            
            {/* Candidates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {candidates.length === 0 ? (
                    <div className="col-span-full text-center p-16 bg-white/50 rounded-3xl border border-dashed border-slate-300">
                        <div className="text-4xl mb-4 opacity-50">📭</div>
                        <p className="text-slate-500 text-lg">No candidates have been added yet.</p>
                    </div>
                ) : (
                    candidates.map((candidate, index) => (
                        <div 
                            key={candidate.id.toString()} 
                            className="card group hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col relative overflow-hidden border-t-4 border-t-transparent hover:border-t-indigo-500"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <div className="text-6xl">🏛️</div>
                            </div>
                            
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-300">
                                    {candidate.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{candidate.name}</h3>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">Candidate #{candidate.id.toString()}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 group-hover:bg-indigo-50/50 group-hover:border-indigo-100 transition-colors">
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Current Votes</p>
                                <div className="text-3xl font-black text-slate-800 group-hover:text-indigo-700 transition-colors">{candidate.voteCount.toString()}</div>
                            </div>
                            
                            {/* Vote Button Logic */}
                            <button 
                                onClick={() => handleVote(candidate.id.toString())} 
                                className={`button-primary w-full mt-auto py-3 text-lg ${(!votingStatus || hasVoted || !isAuthorizedVoter) ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.02]'}`} 
                                disabled={!votingStatus || hasVoted || !isAuthorizedVoter}
                            >
                                {votingStatus 
                                    ? (hasVoted 
                                        ? '✓ Already Voted' 
                                        : (isAuthorizedVoter ? 'Vote Now' : 'Not Authorized')) 
                                    : 'Voting Closed'}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// --- Results Component (Fixed) ---
const Results = () => {
    const { contract, showMessage } = useContext(AppContext);
    const [candidates, setCandidates] = useState([]);
    const [votingStatus, setVotingStatus] = useState(true);
    const [winner, setWinner] = useState(null);
    const [totalVotes, setTotalVotes] = useState(0);

    const fetchResults = useCallback(async () => {
        if (contract) {
            try {
                // 1. Check Voting Status
                const status = await contract.methods.getVotingStatus().call();
                setVotingStatus(status);

                // 2. Get Candidates
                const fetchedCandidates = await contract.methods.getCandidates().call();
                
                // 3. Process Candidates
                const sorted = [...fetchedCandidates].sort((a, b) => Number(b.voteCount) - Number(a.voteCount));
                setCandidates(sorted);
                
                const total = sorted.reduce((sum, c) => sum + Number(c.voteCount), 0);
                setTotalVotes(total);

                // 4. Determine Winner (Only if voting is CLOSED and there are candidates)
                // We calculate this client-side to avoid reverting transaction errors from the contract
                if (!status && sorted.length > 0) {
                    setWinner(sorted[0]);
                } else {
                    setWinner(null); // Reset winner if voting opens again
                }

            } catch (error) {
                console.error("Fetch Error:", error);
                // We do NOT show the popup here to avoid the infinite loop of errors.
                // Instead, we log it to the console.
            }
        }
    }, [contract]);

    useEffect(() => {
        // Fetch immediately on load
        fetchResults();

        // Fetch every 3 seconds (Polling) instead of Event Listeners
        // This prevents "Provider doesn't support subscriptions" errors
        const interval = setInterval(() => {
            fetchResults();
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchResults]);

    return (
        <section className="w-full px-4 py-12 lg:py-16">
            <div className="max-w-6xl mx-auto space-y-10">
                <div className="card text-center">
                    <h2 className="text-4xl font-bold text-slate-900 mb-3">Live Results</h2>
                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                        <div className={`badge inline-flex items-center gap-2 ${votingStatus ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                            <span className={`w-2 h-2 rounded-full ${votingStatus ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
                            {votingStatus ? 'Voting in Progress' : 'Voting Concluded'}
                        </div>
                        <div className="badge bg-white/70 border border-slate-200 text-slate-600">Total Votes: <span className="font-bold text-indigo-600 text-base ml-1">{totalVotes}</span></div>
                    </div>
                    <p className="text-slate-600 text-lg">Real-time tallies powered by Sepolia.</p>
                </div>

                {candidates.length === 0 ? (
                    <div className="card text-center py-16">
                        <div className="text-6xl mb-4 opacity-50">📊</div>
                        <p className="text-slate-500 text-lg">No votes have been cast yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-8 lg:grid-cols-[1.35fr,0.65fr] items-start">
                        <div className="space-y-6">
                            <div className="card">
                                <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                    <span>📈</span> Candidate Rankings
                                </h3>
                                <div className="space-y-6">
                                    {candidates.map((candidate, index) => {
                                        const votePercentage = totalVotes > 0 ? ((Number(candidate.voteCount) / totalVotes) * 100).toFixed(1) : 0;
                                        const medals = ['🥇', '🥈', '🥉'];
                                        return (
                                            <div 
                                                key={candidate.id.toString()} 
                                                className="relative"
                                                style={{ animationDelay: `${index * 0.1}s` }}
                                            >
                                                <div className="flex items-center gap-4 mb-2">
                                                    <div className="w-8 text-2xl text-center font-bold text-slate-400">{medals[index] || `#${index + 1}`}</div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-end mb-1">
                                                            <span className="font-bold text-lg text-slate-900">{candidate.name}</span>
                                                            <span className="font-mono font-bold text-slate-700">{candidate.voteCount.toString()} votes ({votePercentage}%)</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                                                            <div 
                                                                className={`h-full transition-all duration-1000 ease-out ${index === 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                                                                style={{ width: `${votePercentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {!votingStatus && winner && (
                                <div className="card-featured bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-200 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <div className="text-9xl">🏆</div>
                                    </div>
                                    <div className="text-center relative z-10">
                                        <div className="w-24 h-24 bg-gradient-to-br from-amber-300 to-orange-400 rounded-full flex items-center justify-center text-5xl shadow-lg shadow-amber-200 mx-auto mb-6 animate-bounce">🏆</div>
                                        <h3 className="text-2xl font-bold text-amber-900 mb-2 uppercase tracking-wider">Election Winner</h3>
                                        <div className="text-5xl font-black text-slate-900 mb-6">{winner.name}</div>
                                        <div className="flex gap-4 justify-center flex-wrap">
                                            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-amber-100 min-w-[150px]">
                                                <p className="text-amber-800 text-sm font-bold uppercase tracking-wider mb-1">Total Votes</p>
                                                <div className="text-3xl font-black text-slate-900">{winner.voteCount.toString()}</div>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-amber-100 min-w-[150px]">
                                                <p className="text-amber-800 text-sm font-bold uppercase tracking-wider mb-1">Victory Margin</p>
                                                <div className="text-3xl font-black text-slate-900">{totalVotes > 0 ? ((Number(winner.voteCount) / totalVotes) * 100).toFixed(1) : 0}%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="card bg-white/70 border border-slate-200/60">
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Voting Snapshot</h3>
                                <div className="space-y-3 text-sm text-slate-600">
                                    <div className="flex justify-between">
                                        <span>Total Candidates</span>
                                        <strong className="text-slate-900">{candidates.length}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Active Votes</span>
                                        <strong className="text-indigo-600">{totalVotes}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Leading %</span>
                                        <strong className="text-amber-600">{winner && totalVotes > 0 ? ((Number(winner.voteCount) / totalVotes) * 100).toFixed(1) : '0.0'}%</strong>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-100">Sepolia</span>
                                    <span className="badge bg-slate-100 text-slate-700 border border-slate-200">Immutable Audit Log</span>
                                    <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-100">Real-time Sync</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default App;