import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

// Context for global state management
const AppContext = createContext();

// --- Helper Functions for ArrayBuffer to Base64URL conversion ---
// This is required to store binary data (like credential IDs) in localStorage.
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}


// Custom MessageBox component for displaying messages and errors as a popup
const MessageBox = ({ message, type, onClose }) => {
    if (!message) return null;

    // Determine background and text color based on message type
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    const textColor = 'text-white';

    return (
        // Fixed overlay to cover the entire screen with a higher z-index and backdrop blur
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            {/* Popup box with rounded corners, shadow, and responsive width */}
            <div className={`rounded-lg shadow-2xl p-6 max-w-sm w-full ${bgColor} ${textColor} flex flex-col items-center justify-center gap-4 border border-gray-200/30`}>
                <p className="text-lg text-center font-semibold">{message}</p>
                <button
                    onClick={onClose}
                    className="mt-4 px-6 py-2 bg-white text-gray-800 rounded-full font-semibold hover:bg-gray-100 transition duration-200 ease-in-out shadow-lg transform hover:scale-105"
                >
                    OK
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
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Passkey authentication status
    const [currentPage, setCurrentPage] = useState('auth'); // 'auth', 'admin', 'vote', 'results'
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState('info'); // 'info' or 'error'
    const [isLoading, setIsLoading] = useState(false);
    const [isPasskeyLibLoaded, setIsPasskeyLibLoaded] = useState(false); // State for Passkey lib loading
    const [isWeb3LibLoaded, setIsWeb3LibLoaded] = useState(false); // State for Web3.js lib loading

    // Contract ABI (Generated from your Solidity contract compilation)
    const contractABI = [
        {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "candidateId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "name",
          "type": "string"
        }
      ],
      "name": "CandidateAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "candidateId",
          "type": "uint256"
        }
      ],
      "name": "Voted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "voterAddress",
          "type": "address"
        }
      ],
      "name": "VoterAuthorized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "voterAddress",
          "type": "address"
        }
      ],
      "name": "VoterRemoved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "VotingEnded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "VotingStarted",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_name",
          "type": "string"
        }
      ],
      "name": "addCandidate",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_voterAddress",
          "type": "address"
        }
      ],
      "name": "authorizeVoter",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "authorizedVoters",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "candidates",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "voteCount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "endVoting",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCandidates",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "name",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "voteCount",
              "type": "uint256"
            }
          ],
          "internalType": "struct Voting.Candidate[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_voterAddress",
          "type": "address"
        }
      ],
      "name": "getVoterStatus",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getVotingStatus",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getWinner",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "winnerId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "winnerName",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "hasVoted",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextCandidateId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_voterAddress",
          "type": "address"
        }
      ],
      "name": "removeAuthorizedVoter",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "startVoting",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_candidateId",
          "type": "uint256"
        }
      ],
      "name": "vote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "votingOpen",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
    ];

    // IMPORTANT: Replace with your deployed contract address on Sepolia
    const contractAddress = "0x00E218c50d35de6f99722e1c70dd4c0cbF2ebaCd";

    // Function to show a message in the MessageBox popup
    const showMessage = (msg, type = 'info') => {
        setMessage(msg);
        setMessageType(type);
    };

    // Function to clear the message and close the MessageBox popup
    const clearMessage = () => {
        setMessage(null);
    };

    // --- Dynamic Script Loading for Passkey and Web3.js ---
    useEffect(() => {
        const loadScript = (id, src, onLoad, onError) => {
            // Prevent loading if script already exists
            if (document.getElementById(id)) {
                onLoad(); // Already loaded
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
                // Cleanup function to remove script when component unmounts
                const existingScript = document.getElementById(id);
                if (existingScript) {
                    document.body.removeChild(existingScript);
                }
            };
        };

        // Load Passkey Library
        loadScript(
            'passkey-lib',
            "https://unpkg.com/@simplewebauthn/browser@latest/dist/bundle/index.umd.min.js",
            () => {
                setIsPasskeyLibLoaded(true);
                console.log("Passkey library loaded successfully.");
            },
            (e) => {
                console.error("Failed to load Passkey library:", e);
                showMessage("Failed to load Passkey library. Please check your internet connection.", "error");
                setIsPasskeyLibLoaded(false);
            }
        );

        // Load Web3.js Library
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

    }, []); // Run once on component mount

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
                    // Ensure error.message is treated as a string
                    showMessage(`Failed to connect MetaMask: ${error instanceof Error ? error.message : String(error)}`, "error");
                }
                setIsLoading(false);
            }
        } else {
            showMessage("MetaMask is not installed. Please install it to use this DApp.", "error");
        }
    }, [contractABI, contractAddress, isWeb3LibLoaded]);

    // Effect to handle MetaMask account changes
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

            const handleChainChanged = () => {
                showMessage("Network changed. Please ensure you are on Sepolia.", "info");
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                window.ethereum.off('accountsChanged', handleAccountsChanged);
                window.ethereum.off('chainChanged', handleChainChanged);
            };
        }
    }, [web3, contract]);

    // --- Passkey Authentication Logic (Overhauled) ---
    const passkeyUserName = "Voting User";

    const getRpId = () => {
        const hostname = window.location.hostname;
        // Defensive check: ensure hostname is a non-empty string.
        // Fallback to 'localhost' if it's not, which is safe for development.
        if (typeof hostname === 'string' && hostname.length > 0) {
            return hostname;
        }
        return 'localhost';
    };

    const registerPasskey = async () => {
        if (!isPasskeyLibLoaded || !window.SimpleWebAuthnBrowser) {
            showMessage("Passkey library is not ready. Please wait.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const rpId = getRpId();
            
            // A unique user handle should ideally come from a backend.
            // For this demo, we'll generate and store it client-side.
            const userId = `user_${Date.now()}`;
            const userHandle = new TextEncoder().encode(userId);

            const registrationOptions = {
                rp: { id: rpId, name: "Blockchain Voting" },
                user: {
                    id: userHandle,
                    name: passkeyUserName,
                    displayName: passkeyUserName,
                },
                // Ensure crypto.randomUUID() is a string for TextEncoder
                challenge: new TextEncoder().encode(String(crypto.randomUUID())),
                pubKeyCredParams: [{ alg: -7, type: 'public-key' }], // ES256
                timeout: 60000,
                attestation: 'none',
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    userVerification: 'required',
                },
            };

            const registrationResult = await window.SimpleWebAuthnBrowser.startRegistration(registrationOptions);
            
            // Store the credential ID and user handle for future logins.
            // This is the correct way to handle credentials client-side for a demo.
            const credential = {
                id: arrayBufferToBase64(registrationResult.rawId),
                userHandle: userId,
            };
            localStorage.setItem('passkeyCredential', JSON.stringify(credential));

            showMessage("Passkey registered successfully! You can now log in.", "info");
        } catch (error) {
            console.error("Passkey registration failed:", error);
            // Ensure error.message is treated as a string
            showMessage(`Passkey registration failed: ${error instanceof Error ? error.message : String(error)}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const loginWithPasskey = async () => {
        if (!isPasskeyLibLoaded || !window.SimpleWebAuthnBrowser) {
            showMessage("Passkey library is not ready. Please wait.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const storedCredentialStr = localStorage.getItem('passkeyCredential');
            if (!storedCredentialStr) {
                throw new Error("No passkey has been registered on this device.");
            }
            
            const storedCredential = JSON.parse(storedCredentialStr);
            const rpId = getRpId();

            const authenticationOptions = {
                // Ensure crypto.randomUUID() is a string for TextEncoder
                challenge: new TextEncoder().encode(String(crypto.randomUUID())),
                rpId: rpId,
                allowCredentials: [{
                    id: base64ToArrayBuffer(storedCredential.id),
                    type: 'public-key',
                }],
                userVerification: 'required',
                timeout: 60000,
            };

            await window.SimpleWebAuthnBrowser.startAuthentication(authenticationOptions);
            
            setIsAuthenticated(true);
            showMessage("Logged in with Passkey successfully!", "info");
            setCurrentPage('vote');
        } catch (error) {
            console.error("Passkey login failed:", error);
            // Ensure error.message is treated as a string
            showMessage(`Passkey login failed: ${error instanceof Error ? error.message : String(error)}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const logoutPasskey = () => {
        setIsAuthenticated(false);
        setCurrentPage('auth');
        showMessage("Logged out from Passkey.", "info");
    };

    // --- Render Logic based on Page State ---
    const renderPage = () => {
        // Render different components based on the current page state
        if (currentPage === 'auth') {
            return (
                <Auth
                    onRegister={registerPasskey}
                    onLogin={loginWithPasskey}
                    isAuthenticated={isAuthenticated}
                    onLogout={logoutPasskey}
                    onConnectWallet={connectWallet}
                    currentAccount={currentAccount}
                    isPasskeyLibLoaded={isPasskeyLibLoaded}
                    isWeb3LibLoaded={isWeb3LibLoaded}
                    showMessage={showMessage} // Pass showMessage to Auth component for testing
                />
            );
        } else if (currentPage === 'admin') {
            return (
                <AdminPanel
                    web3={web3}
                />
            );
        } else if (currentPage === 'vote') {
            return (
                <VotingInterface
                />
            );
        } else if (currentPage === 'results') {
            return (
                <Results
                />
            );
        }
        return null;
    };

    return (
        // AppContext.Provider makes state and functions available to child components
        <AppContext.Provider value={{ web3, contract, currentAccount, isOwner, isAuthorizedVoter, isAuthenticated, showMessage, clearMessage, isLoading, setIsLoading }}>
            {/* Main container for the application, centered using flexbox and min-h-screen */}
            {/* Added a border to visually confirm centering */}
            <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 font-inter text-gray-800 flex flex-col items-center justify-center p-4 w-full border-4 border-blue-500 rounded-lg">
                {/* Tailwind CSS custom styles for reusability */}
                <style>
                    {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                    body { font-family: 'Inter', sans-serif; }
                    .button-primary { @apply bg-blue-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105; }
                    .button-secondary { @apply bg-gray-300 text-gray-800 px-6 py-3 rounded-full font-semibold shadow-md hover:bg-gray-400 transition duration-300 ease-in-out; }
                    /* Adjust card for better centering and responsiveness */
                    .card { @apply bg-white rounded-xl shadow-lg p-6 md:p-8 w-full max-w-lg mx-auto border border-gray-200; }
                    .input-field { @apply w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500; }
                    `}
                </style>

                {/* Main application title */}
                <h1 className="text-4xl md:text-5xl font-bold text-center text-blue-800 mb-8 mt-4 drop-shadow-md">
                    Secure Blockchain Voting
                </h1>

                {/* Navigation buttons to switch between different sections */}
                <nav className="mb-8 flex flex-wrap justify-center gap-4">
                    <button onClick={() => setCurrentPage('auth')} className="button-secondary">Authentication</button>
                    <button onClick={() => setCurrentPage('vote')} className="button-secondary" disabled={!isAuthenticated || !currentAccount}>Vote</button>
                    <button onClick={() => setCurrentPage('results')} className="button-secondary">Results</button>
                    {isOwner && (<button onClick={() => setCurrentPage('admin')} className="button-secondary">Admin Panel</button>)}
                </nav>

                {/* Loading spinner overlay */}
                {isLoading && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                        <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-xl">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mb-4"></div>
                            <p className="text-blue-700 font-semibold text-lg">Loading...</p>
                        </div>
                    </div>
                )}

                {/* Render the current page component */}
                {renderPage()}

                {/* Message box for displaying info and error messages */}
                <MessageBox message={message} type={messageType} onClose={clearMessage} />
            </div>
        </AppContext.Provider>
    );
};

// --- Auth Component ---
const Auth = ({ onRegister, onLogin, isAuthenticated, onLogout, onConnectWallet, currentAccount, isPasskeyLibLoaded, isWeb3LibLoaded, showMessage }) => {
    const { isLoading } = useContext(AppContext);

    return (
        <div className="card text-center">
            <h2 className="text-3xl font-semibold mb-6 text-blue-700">Authentication</h2>
            <div className="space-y-4">
                {!isAuthenticated ? (
                    <>
                        <p className="text-lg text-gray-700 mb-4">Authenticate with Passkey to enable voting.</p>
                        <button onClick={onRegister} className="button-primary w-full" disabled={isLoading || !isPasskeyLibLoaded}>
                            {isLoading ? 'Registering...' : (isPasskeyLibLoaded ? 'Register Passkey' : 'Loading Passkey Lib...')}
                        </button>
                        <button onClick={onLogin} className="button-primary w-full" disabled={isLoading || !isPasskeyLibLoaded}>
                            {isLoading ? 'Logging In...' : (isPasskeyLibLoaded ? 'Login with Passkey' : 'Loading Passkey Lib...')}
                        </button>
                        {/* Test button to explicitly show an error popup */}
                        <button
                            onClick={() => showMessage("This is a test error message from the Auth form!", "error")}
                            className="button-secondary w-full bg-red-500 text-white hover:bg-red-600"
                        >
                            Test Error Popup
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-lg text-green-600 font-medium">You are authenticated with Passkey!</p>
                        <button onClick={onLogout} className="button-secondary w-full" disabled={isLoading}>Logout Passkey</button>
                    </>
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-2xl font-semibold mb-4 text-blue-700">MetaMask Connection</h3>
                {currentAccount ? (
                    <p className="text-lg font-medium text-gray-700 break-all">Connected: <span className="font-mono text-blue-600">{currentAccount}</span></p>
                ) : (
                    <button onClick={onConnectWallet} className="button-primary w-full" disabled={isLoading || !isWeb3LibLoaded}>
                        {isLoading ? 'Connecting...' : (isWeb3LibLoaded ? 'Connect MetaMask Wallet' : 'Loading Web3.js Lib...')}
                    </button>
                )}
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
    
    // Display access denied message if user is not the owner
    if (!isOwner) return <div className="card text-center"><h2 className="text-3xl font-semibold mb-4 text-red-600">Access Denied</h2><p>You are not the contract owner.</p></div>;

    return (
        <div className="card space-y-8">
            <h2 className="text-3xl font-semibold text-center text-blue-700">Admin Panel</h2>
            <div className="p-6 bg-blue-50 rounded-lg">
                <h3 className="text-2xl font-semibold mb-4">Add Candidate</h3>
                <input type="text" placeholder="Candidate Name" value={newCandidateName} onChange={(e) => setNewCandidateName(e.target.value)} className="input-field mb-4" />
                <button onClick={handleAddCandidate} className="button-primary w-full">Add Candidate</button>
            </div>
            <div className="p-6 bg-green-50 rounded-lg">
                <h3 className="text-2xl font-semibold mb-4">Manage Voters</h3>
                <input type="text" placeholder="Voter Address to Authorize" value={voterAddressToAuthorize} onChange={(e) => setVoterAddressToAuthorize(e.target.value)} className="input-field mb-2" />
                <button onClick={handleAuthorizeVoter} className="button-primary w-full bg-green-600 hover:bg-green-700 mb-4">Authorize Voter</button>
                <input type="text" placeholder="Voter Address to Remove" value={voterAddressToRemove} onChange={(e) => setVoterAddressToRemove(e.target.value)} className="input-field mb-2" />
                <button onClick={handleRemoveVoter} className="button-primary w-full bg-red-600 hover:bg-red-700">Remove Voter</button>
            </div>
            <div className="p-6 bg-yellow-50 rounded-lg">
                <h3 className="text-2xl font-semibold mb-4">Control Voting Period</h3>
                <div className="flex gap-4">
                    <button onClick={handleStartVoting} className="button-primary w-full bg-yellow-600 hover:bg-yellow-700">Start Voting</button>
                    <button onClick={handleEndVoting} className="button-primary w-full bg-orange-600 hover:bg-orange-700">End Voting</button>
                </div>
            </div>
        </div>
    );
};

// --- VotingInterface Component ---
const VotingInterface = () => {
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
                    contract.methods.hasVoted(currentAccount).call() // Corrected to use hasVoted
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
            contract.events.VotingStarted().on('data', fetchVotingData); // Listen for start
            contract.events.VotingEnded().on('data', fetchVotingData);   // Listen for end
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
            if (!isAuthenticated) errorMsg += "You must be logged in with Passkey. ";
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

    // Display access denied messages if user is not authenticated or authorized
    if (!isAuthenticated || !currentAccount) return <div className="card text-center"><h2 className="text-3xl font-semibold mb-4 text-red-600">Access Denied</h2><p>Please authenticate with Passkey and connect your wallet.</p></div>;
    if (!isAuthorizedVoter) return <div className="card text-center"><h2 className="text-3xl font-semibold mb-4 text-red-600">Not Authorized</h2><p>Your wallet is not authorized to vote.</p></div>;

    return (
        <div className="card space-y-6">
            <h2 className="text-3xl font-semibold text-center text-blue-700">Cast Your Vote</h2>
            <p className={`text-center text-xl font-bold ${votingStatus ? 'text-green-600' : 'text-red-600'}`}>Voting Status: {votingStatus ? 'OPEN' : 'CLOSED'}</p>
            {hasVoted && <p className="text-center text-xl font-bold text-orange-600">You have already voted!</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {candidates.map((candidate) => (
                    <div key={candidate.id.toString()} className="bg-blue-50 p-6 rounded-lg shadow-md">
                        <h3 className="text-2xl font-semibold text-blue-800 mb-2">{candidate.name}</h3>
                        <p className="text-lg text-gray-700 mb-4">Votes: {candidate.voteCount.toString()}</p>
                        <button onClick={() => handleVote(candidate.id.toString())} className="button-primary w-full" disabled={!votingStatus || hasVoted}>Vote</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Results Component ---
const Results = () => {
    const { contract, showMessage } = useContext(AppContext);
    const [candidates, setCandidates] = useState([]);
    const [votingStatus, setVotingStatus] = useState(true);
    const [winner, setWinner] = useState(null);

    const fetchResults = useCallback(async () => {
        if (contract) {
            try {
                const [fetchedCandidates, status] = await Promise.all([
                    contract.methods.getCandidates().call(),
                    contract.methods.getVotingStatus().call()
                ]);
                // Sort candidates by vote count in descending order
                setCandidates(fetchedCandidates.sort((a, b) => Number(b.voteCount) - Number(a.voteCount)));
                setVotingStatus(status);
                // If voting is closed and there are candidates, determine the winner
                if (!status && fetchedCandidates.length > 0) {
                    const winnerResult = await contract.methods.getWinner().call();
                    setWinner({ id: winnerResult.winnerId.toString(), name: winnerResult.winnerName });
                }
            } catch (error) {
                showMessage("Error fetching results.", "error");
            }
        }
    }, [contract, showMessage]);

    useEffect(() => {
        fetchResults();
        if (contract) {
            // Listen for contract events to update results in real-time
            const onUpdate = () => fetchResults();
            contract.events.Voted().on('data', onUpdate);
            contract.events.VotingEnded().on('data', onUpdate);
            contract.events.VotingStarted().on('data', onUpdate); // Listen for start
            return () => {
                // Clean up event listeners on component unmount
                contract.events.Voted().off('data', onUpdate);
                contract.events.VotingEnded().off('data', onUpdate);
                contract.events.VotingStarted().off('data', onUpdate);
            };
        }
    }, [contract, fetchResults]);

    return (
        <div className="card space-y-6">
            <h2 className="text-3xl font-semibold text-center text-blue-700">Voting Results</h2>
            <p className={`text-center text-xl font-bold ${votingStatus ? 'text-orange-600' : 'text-green-600'}`}>
                Status: {votingStatus ? 'PROVISIONAL (Voting Open)' : 'FINAL (Voting Closed)'}
            </p>
            <div className="space-y-4">
                {candidates.map((candidate) => (
                    <div key={candidate.id.toString()} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                        <span className="text-xl font-medium">{candidate.name}</span>
                        <span className="text-xl font-bold text-blue-700">{candidate.voteCount.toString()} Votes</span>
                    </div>
                ))}
            </div>
            {!votingStatus && winner && (
                <div className="mt-8 p-6 bg-green-100 rounded-lg text-center">
                    <h3 className="text-3xl font-bold text-green-700">🎉 Winner! 🎉</h3>
                    <p className="text-4xl font-extrabold text-green-900">{winner.name}</p>
                </div>
            )}
        </div>
    );
};

export default App;
