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
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className={`glassmorphic rounded-3xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center justify-center gap-4 animate-slide-up ${isError ? 'border-red-300/60' : 'border-green-300/60'}`}>
                <div className={`w-16 h-16 rounded-full ${isError ? 'bg-red-100' : 'bg-green-100'} flex items-center justify-center text-3xl animate-pulse`}>
                    {icon}
                </div>
                <p className={`text-lg text-center font-semibold ${isError ? 'text-red-900' : 'text-green-900'}`}>{message}</p>
                <button
                    onClick={onClose}
                    className="mt-4 px-8 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold transition-all duration-300 hover:-translate-y-1 shadow-lg"
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
            <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-blue-100">
                {/* Navigation Bar */}
                <nav className="fixed top-0 left-0 right-0 z-40 bg-white/50 backdrop-blur-xl border-b border-white/60 animate-slide-down">
                    <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                SecureVote
                            </div>
                        </div>
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="md:hidden text-slate-700 hover:text-slate-900 transition text-2xl"
                        >
                            ☰
                        </button>
                    </div>
                </nav>

                {/* Main Content */}
                <div className="pt-32 pb-20 px-4 flex justify-center">
                    <div className="w-full max-w-[1100px]">
                        {/* Header Section */}
                        <div className="hero-section animate-slide-up">
                            <p className="text-sm uppercase tracking-[0.4em] text-blue-500 mb-3">High trust · Decentralized ballots</p>
                            <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
                                Secure Blockchain Voting
                            </h1>
                            <p className="text-xl text-slate-700 max-w-2xl mx-auto mt-4">
                                Authentication with Email Verification & Ethereum Wallet Connection
                            </p>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="tabs-wrapper mb-16">
                            <div className="flex flex-wrap gap-3 justify-center">
                                <button 
                                    onClick={() => { setCurrentPage('auth'); setSidebarOpen(false); }} 
                                    className={`nav-button ${currentPage === 'auth' ? 'active' : ''}`}
                                >
                                    🔐 Authentication
                                </button>
                                <button 
                                    onClick={() => { setCurrentPage('vote'); setSidebarOpen(false); }} 
                                    className={`nav-button ${currentPage === 'vote' ? 'active' : ''} ${!isAuthenticated || !currentAccount ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!isAuthenticated || !currentAccount}
                                >
                                    🗳️ Voting
                                </button>
                                <button 
                                    onClick={() => { setCurrentPage('results'); setSidebarOpen(false); }} 
                                    className={`nav-button ${currentPage === 'results' ? 'active' : ''}`}
                                >
                                    📊 Results
                                </button>
                                {isOwner && (
                                    <button 
                                        onClick={() => { setCurrentPage('admin'); setSidebarOpen(false); }} 
                                        className={`nav-button ${currentPage === 'admin' ? 'active' : ''}`}
                                    >
                                        ⚙️ Admin Panel
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Loading overlay */}
                        {isLoading && (
                            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                                <div className="flex flex-col items-center p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60">
                                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                                    <p className="text-lg font-semibold text-blue-700">Processing...</p>
                                </div>
                            </div>
                        )}

                        {/* Page content */}
                        <div className="animate-slide-up w-full flex justify-center">
                            <div className="w-full">
                                {renderPage()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="border-t border-white/40 bg-white/20 backdrop-blur-xl py-8 mt-16">
                    <div className="max-w-7xl mx-auto px-6 text-center text-slate-700">
                        <p className="font-medium">Secure Blockchain Voting System</p>
                        <p className="text-sm mt-1">Powered by Ethereum • Email Auth • Smart Contracts</p>
                    </div>
                </footer>

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
        <div className="flex justify-center items-start w-full px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                
                {/* Email Login Card */}
                <div className="card">
                    <div className="text-6xl mb-6 text-center animate-float">📧</div>
                    <h2 className="text-3xl font-bold text-center mb-2 text-slate-900">Email Login</h2>
                    <p className="text-center text-slate-700 mb-8">Secure access with verification code</p>
                    <div className="space-y-3">
                        {!isAuthenticated ? (
                            step === 1 ? (
                                <>
                                    <input 
                                        type="email" 
                                        placeholder="name@example.com" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-field w-full"
                                    />
                                    <button onClick={handleSendCode} className="button-primary w-full" disabled={isLoading}>
                                        {isLoading ? '⏳ Sending...' : '📩 Send Code'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-center text-slate-600 mb-2">Enter code sent to <b>{email}</b></p>
                                    <input 
                                        type="text" 
                                        placeholder="123456" 
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="input-field w-full text-center text-2xl tracking-widest"
                                        maxLength={6}
                                    />
                                    <button onClick={handleVerifyCode} className="button-primary w-full" disabled={isLoading}>
                                        ✅ Verify & Login
                                    </button>
                                    <button onClick={resetAuth} className="text-sm text-blue-600 underline w-full text-center hover:text-blue-800">
                                        Use a different email
                                    </button>
                                </>
                            )
                        ) : (
                            <>
                                <div className="glassmorphic bg-green-50/60 rounded-2xl p-4 text-center border-green-200/60">
                                    <p className="text-green-900 font-bold text-lg">✓ Authenticated</p>
                                    <p className="text-green-800 text-sm mt-1">Logged in as {email}</p>
                                </div>
                                <button onClick={onLogout} className="button-secondary w-full">🚪 Sign Out</button>
                            </>
                        )}
                    </div>
                </div>

                {/* MetaMask Card */}
                <div className="card">
                    <div className="text-6xl mb-6 text-center animate-float" style={{ animationDelay: '1s' }}>🦊</div>
                    <h2 className="text-3xl font-bold text-center mb-2 text-slate-900">MetaMask</h2>
                    <p className="text-center text-slate-700 mb-8">Connect your Ethereum wallet</p>
                    <div className="space-y-3">
                        {currentAccount ? (
                            <div className="glassmorphic bg-blue-50/60 rounded-2xl p-4 text-center border-blue-200/60">
                                <p className="text-blue-700 text-xs font-medium mb-2">Connected Wallet</p>
                                <p className="text-blue-900 font-mono text-sm break-all">{currentAccount}</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-center text-slate-700 mb-4">Link your wallet to participate</p>
                                <button onClick={onConnectWallet} className="button-primary w-full" disabled={isLoading || !isWeb3LibLoaded}>
                                    {isLoading ? '⏳ Connecting...' : (isWeb3LibLoaded ? '🔗 Connect MetaMask' : '📥 Loading...')}
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
        <div className="card text-center max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Access Restricted</h2>
            <p className="text-slate-700">Please verify your email and connect your wallet first</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="card text-center mb-12">
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Select Your Candidate</h2>
                {userEmail && <p className="text-sm text-slate-500 mb-4">Logged in as: <b>{userEmail}</b></p>}
                
                {/* Authorization Warning Banner */}
                {!isAuthorizedVoter && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 text-left rounded shadow-md max-w-2xl mx-auto">
                        <p className="font-bold">🚫 Not Authorized</p>
                        <p>Your wallet address <code>{currentAccount}</code> is not authorized to vote.</p>
                        <p className="text-sm mt-1">Please contact the election administrator to approve this wallet.</p>
                    </div>
                )}

                <div className="flex gap-4 justify-center flex-wrap">
                    <div className={`badge ${votingStatus ? 'bg-green-100/60 text-green-900 border border-green-200/60 glassmorphic' : 'bg-red-100/60 text-red-900 border border-red-200/60 glassmorphic'}`}>
                        {votingStatus ? '● Voting Status: OPEN' : '● Voting Status: CLOSED'}
                    </div>
                    {hasVoted && (
                        <div className="badge bg-amber-100/60 text-amber-900 border border-amber-200/60 glassmorphic">
                            ✓ You have voted
                        </div>
                    )}
                </div>
            </div>
            
            {/* Candidates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {candidates.length === 0 ? (
                    <div className="col-span-full text-center p-8 text-slate-500">
                        No candidates have been added yet.
                    </div>
                ) : (
                    candidates.map((candidate, index) => (
                        <div 
                            key={candidate.id.toString()} 
                            className="card group hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white mb-3">
                                        {candidate.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-700 transition">{candidate.name}</h3>
                                </div>
                                <div className="text-4xl">🏛️</div>
                            </div>
                            <div className="bg-blue-50/50 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-blue-100/60">
                                <p className="text-slate-700 text-sm font-medium mb-1">Votes Received</p>
                                <div className="text-3xl font-bold text-blue-700">{candidate.voteCount.toString()}</div>
                            </div>
                            
                            {/* Vote Button Logic */}
                            <button 
                                onClick={() => handleVote(candidate.id.toString())} 
                                className={`button-primary w-full mt-auto ${(!votingStatus || hasVoted || !isAuthorizedVoter) ? 'opacity-50 cursor-not-allowed bg-gray-400' : ''}`} 
                                disabled={!votingStatus || hasVoted || !isAuthorizedVoter}
                            >
                                {votingStatus 
                                    ? (hasVoted 
                                        ? '✓ Already Voted' 
                                        : (isAuthorizedVoter ? '✓ Vote' : '🚫 Authorization Required')) 
                                    : '✕ Voting Closed'}
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
        <div className="max-w-5xl mx-auto">
            <div className="card text-center mb-12">
                <h2 className="text-4xl font-bold text-slate-900 mb-4">📊 Voting Results</h2>
                <div className={`badge inline-block ${votingStatus ? 'bg-amber-100/60 text-amber-900 border border-amber-200/60 glassmorphic' : 'bg-green-100/60 text-green-900 border border-green-200/60 glassmorphic'}`}>
                    {votingStatus ? '⏳ Voting in Progress' : '✓ Voting Concluded'}
                </div>
                <p className="text-slate-700 text-lg mt-4">Total Votes: <span className="font-bold text-blue-700">{totalVotes}</span></p>
            </div>

            {candidates.length === 0 ? (
                <div className="card text-center">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-slate-700 text-lg">No votes cast yet</p>
                </div>
            ) : (
                <>
                    {!votingStatus && winner && (
                        <div className="card-featured mb-12 bg-gradient-to-br from-amber-100/60 to-amber-50/60 backdrop-blur-xl border border-amber-200/60 rounded-3xl p-8 shadow-2xl">
                            <div className="text-center">
                                <div className="text-6xl mb-4 animate-float">🏆</div>
                                <h3 className="text-3xl font-bold text-slate-900 mb-2">Election Winner</h3>
                                <div className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">{winner.name}</div>
                                <div className="flex gap-8 justify-center">
                                    <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white/60">
                                        <p className="text-slate-600 text-sm font-medium mb-1">Votes</p>
                                        <div className="text-4xl font-bold text-amber-700">{winner.voteCount.toString()}</div>
                                    </div>
                                    <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-white/60">
                                        <p className="text-slate-600 text-sm font-medium mb-1">Percentage</p>
                                        <div className="text-4xl font-bold text-amber-700">{totalVotes > 0 ? ((Number(winner.voteCount) / totalVotes) * 100).toFixed(1) : 0}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <h3 className="text-2xl font-bold text-slate-900 mb-6">📈 Candidate Rankings</h3>
                        <div className="space-y-4">
                            {candidates.map((candidate, index) => {
                                const votePercentage = totalVotes > 0 ? ((Number(candidate.voteCount) / totalVotes) * 100).toFixed(1) : 0;
                                const medals = ['🥇', '🥈', '🥉'];
                                return (
                                    <div 
                                        key={candidate.id.toString()} 
                                        className="bg-white/40 backdrop-blur-xl rounded-2xl p-6 border border-white/60 hover:bg-white/50 transition-all duration-300 group"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl">{medals[index] || '✓'}</div>
                                            <div className="flex-1">
                                                <div className="font-bold text-lg text-slate-900 mb-2">{candidate.name}</div>
                                                <div className="w-full bg-white/50 rounded-full h-3 border border-white/60 overflow-hidden">
                                                    <div 
                                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500"
                                                        style={{ width: `${votePercentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-slate-900">{candidate.voteCount.toString()}</div>
                                                <div className="text-sm text-slate-600">{votePercentage}%</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default App;