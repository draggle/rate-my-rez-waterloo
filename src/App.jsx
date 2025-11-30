import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Star, Building2, Home, Search, Plus, MessageSquare, ArrowLeft, TrendingUp, Camera, X, Image as ImageIcon, DollarSign, Footprints, Map, Filter, Menu, ThumbsUp, Info, Mail, GraduationCap, Check, AlertTriangle, MessageCircle, Send, CornerDownRight, LogIn, LogOut, User, Edit } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, limit, updateDoc, doc, increment, arrayUnion } from 'firebase/firestore';
import { Analytics } from "@vercel/analytics/react";

// --- CONSTANTS ---
const ON_CAMPUS_DORMS = [
    { id: 'cmh', name: 'Claudette Millar Hall (CMH)', type: 'Traditional', address: 'Claudette Millar Hall, Waterloo, ON' },
    { id: 'rev', name: 'Ron Eydt Village (REV)', type: 'Traditional', address: 'Ron Eydt Village, Waterloo, ON' },
    { id: 'v1', name: 'Village 1 (V1)', type: 'Traditional', address: 'Village 1, Waterloo, ON' },
    { id: 'mkv', name: 'Mackenzie King Village (MKV)', type: 'Suite Style', address: 'Mackenzie King Village, Waterloo, ON' },
    { id: 'uwp', name: 'UW Place (UWP)', type: 'Suite Style', address: 'UW Place, Waterloo, ON' },
    { id: 'clv', name: 'Columbia Lake Village (CLV)', type: 'Townhouse', address: 'Columbia Lake Village, Waterloo, ON' },
    { id: 'mh', name: 'Minota Hagey (MH)', type: 'Traditional', address: 'Minota Hagey Residence, Waterloo, ON' },
    // UNDERGRADUATE AFFILIATED COLLEGES
    { id: 'sju', name: 'St. Jerome\'s University', type: 'Affiliated College', address: 'St. Jerome\'s University, Waterloo, ON' },
    { id: 'renison', name: 'Renison University College', type: 'Affiliated College', address: 'Renison University College, Waterloo, ON' },
    { id: 'united', name: 'United College', type: 'Affiliated College', address: 'United College, Waterloo, ON' },
    { id: 'grebel', name: 'Conrad Grebel University College', type: 'Affiliated College', address: 'Conrad Grebel University College, Waterloo, ON' },
    // GRADUATE HOUSING OPTIONS - NAME UPDATED
    { id: 'cmh-south', name: 'Claudette Millar Hall (CMH) South', type: 'Graduate Apartment', address: 'Claudette Millar Hall, Waterloo, ON' },
    { id: 'united-grad', name: 'United College Grad Apartments', type: 'Graduate Apartment', address: 'United College, Waterloo, ON' }
];

const POPULAR_OFF_CAMPUS = [
    { id: 'icon-330-phillip', name: 'ICON (330 Phillip St)', type: 'Apartment', address: '330 Phillip St, Waterloo, ON' },
    { id: 'rezone-blair', name: 'RezOne: Blair House', type: 'Apartment', address: '256 Phillip St, Waterloo, ON' },
    { id: 'rezone-fergus', name: 'RezOne: Fergus House', type: 'Apartment', address: '254 Phillip St, Waterloo, ON' },
    { id: 'sage-condos', name: 'Sage Condos', type: 'Condo', address: 'Sage Condos Waterloo' },
    { id: 'wcri', name: 'WCRI', type: 'Co-op Housing', address: '268 Phillip St, Waterloo, ON' },
    { id: 'accommod8u', name: 'Accommod8u (General)', type: 'Rental Agency', address: 'Waterloo, ON' }
];

const FACULTIES = ['Engineering', 'Math', 'Science', 'Arts', 'Environment', 'Health'];

const AMENITY_TAGS = [
    { id: 'ac', label: 'AC', icon: '❄️', type: 'good' },
    { id: 'ensuite', label: 'Ensuite Bath', icon: '🚿', type: 'good' },
    { id: 'gym', label: 'Gym Nearby', icon: '💪', type: 'good' },
    { id: 'wifi', label: 'Fast Wifi', icon: '🚀', type: 'good' },
    { id: 'quiet', label: 'Quiet', icon: '🤫', type: 'good' },
    { id: 'social', label: 'Social Vibe', icon: '🎉', type: 'neutral' },
    { id: 'pests', label: 'Pest Issues', icon: '🪳', type: 'bad' },
    { id: 'noise', label: 'Noisy', icon: '🔊', type: 'bad' },
    { id: 'mgmt', label: 'Bad Management', icon: '📉', type: 'bad' },
];

// --- FOOTER COMPONENT ---
const Footer = () => (
    <footer className="bg-white border-t border-gray-200 py-8 mt-auto w-full">
        <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-sm text-gray-500 font-medium">
                © 2025 Ayan Bin Saif. All rights reserved.
            </p>
            <p className="text-xs text-gray-400 mt-2">
                Rate My Rez is a student-run project and is not affiliated with the University of Waterloo.
            </p>
        </div>
    </footer>
);

// --- AUTH MODAL COMPONENT ---
const AuthModal = ({ onClose, auth }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState('LOGIN'); // 'LOGIN', 'SIGNUP', 'RESET'
    const [error, setError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setAuthLoading(true);

        if (!auth) {
            setError("Authentication service not ready.");
            setAuthLoading(false);
            return;
        }

        // Soft Gate: We check the text, but we don't force email verification link
        if (!email.endsWith('@uwaterloo.ca')) {
            setError("Access Denied: You must use a @uwaterloo.ca email.");
            setAuthLoading(false);
            return;
        }

        try {
            if (mode === 'RESET') {
                await sendPasswordResetEmail(auth, email);
                setSuccessMsg("Reset link sent! Check your inbox.");
                setAuthLoading(false);
                return;
            }

            if (mode === 'SIGNUP') {
                // 1. Create User
                await createUserWithEmailAndPassword(auth, email, password);
                
                // 2. SKIP VERIFICATION & POPUP
                // Simply close the modal. The user is already logged in by the function above.
                onClose();
                return; 
            } 
            
            if (mode === 'LOGIN') {
                await signInWithEmailAndPassword(auth, email, password);
                onClose();
            }
        } catch (err) {
            console.error("Auth Error:", err);
            const msg = err.message.replace('Firebase: ', '');
            if (msg.includes('auth/invalid-credential')) {
                setError("Incorrect email or password.");
            } else if (msg.includes('auth/email-already-in-use')) {
                setError("This email is already registered.");
            } else {
                setError(msg);
            }
        }
        setAuthLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white border border-gray-200 w-full max-w-md rounded-xl p-6 shadow-xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={20}/>
                </button>
                
                {/* HEADER */}
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <GraduationCap className="text-yellow-600" size={24}/>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                        {mode === 'SIGNUP' ? 'Student Sign Up' : 
                         mode === 'RESET' ? 'Reset Password' : 'Student Login'}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {mode === 'RESET' ? "Enter your school email to receive a reset link." : 
                         "Verify your @uwaterloo.ca email to post."}
                    </p>
                </div>

                {/* --- WARNING BANNER IS HERE --- */}
                {mode === 'SIGNUP' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6 flex gap-3 text-left">
                        <AlertTriangle className="text-orange-500 shrink-0" size={20} />
                        <div className="text-xs text-orange-800">
                            <span className="font-bold block mb-0.5">Password Warning</span>
                            Reset emails are currently blocked by UWaterloo spam filters. Please save your password!
                        </div>
                    </div>
                )}

                {/* LOGIN / SIGNUP / RESET FORMS */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                            School Email
                        </label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:border-yellow-500 outline-none"
                            placeholder="userid@uwaterloo.ca"
                        />
                    </div>

                    {mode !== 'RESET' && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                                    Password
                                </label>
                                {mode === 'LOGIN' && (
                                    <button 
                                        type="button"
                                        onClick={() => { setMode('RESET'); setError(''); setSuccessMsg(''); }}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        Forgot Password?
                                    </button>
                                )}
                            </div>
                            <input 
                                type="password" 
                                required
                                minLength="6"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:border-yellow-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0"/>
                            <span>{error}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg flex items-start gap-2">
                            <Check size={16} className="mt-0.5 shrink-0"/>
                            <span>{successMsg}</span>
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-3 rounded-lg font-bold bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {authLoading ? "Processing..." : (
                            mode === 'SIGNUP' ? "Create Account" : 
                            mode === 'RESET' ? "Send Reset Link" : "Login"
                        )}
                    </button>
                </form>

                {/* FOOTER LINKS */}
                <div className="mt-4 text-center text-sm text-gray-500">
                    {mode === 'RESET' ? (
                        <button 
                            onClick={() => { setMode('LOGIN'); setError(''); setSuccessMsg(''); }} 
                            className="text-blue-600 font-bold hover:underline"
                        >
                            Back to Login
                        </button>
                    ) : mode === 'SIGNUP' ? (
                        <>
                            Already verified?{" "}
                            <button 
                                onClick={() => { setMode('LOGIN'); setError(''); }} 
                                className="text-blue-600 font-bold hover:underline"
                            >
                                Login
                            </button>
                        </>
                    ) : (
                        <>
                            New here?{" "}
                            <button 
                                onClick={() => { setMode('SIGNUP'); setError(''); }} 
                                className="text-blue-600 font-bold hover:underline"
                            >
                                Sign Up
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function App() {
    // --- STATE ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    
    const appId = typeof __app_id !== 'undefined' ? __app_id : "rate-my-rez-default";
    
    const [view, setView] = useState('HOME'); 
    const [category, setCategory] = useState('ON');
    const [selectedProp, setSelectedProp] = useState(null);
    
    const [reviews, setReviews] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [homeFeed, setHomeFeed] = useState([]); 
    
    const [loading, setLoading] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // EDITING FEATURE STATES
    const [showEditModal, setShowEditModal] = useState(false);
    const [reviewToEdit, setReviewToEdit] = useState(null);
    
    const [propertyTab, setPropertyTab] = useState('REVIEWS'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('NEWEST');
    const [userFaculty, setUserFaculty] = useState('Engineering');

    // --- FIREBASE INIT ---
    useEffect(() => {
        const initAuth = async () => {
            try {
                let firebaseConfig;
                // SAFE CHECK for environment
                if (typeof __firebase_config !== 'undefined') {
                    firebaseConfig = JSON.parse(__firebase_config);
                } else {
                     // Safe fallback to check if env exists
                     const getEnv = (key) => {
                         try { return import.meta.env[key] } catch(e) { return undefined }
                     };
                     
                     firebaseConfig = {
                        apiKey: getEnv('VITE_FIREBASE_API_KEY'),
                        authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
                        projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
                        storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
                        messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
                        appId: getEnv('VITE_FIREBASE_APP_ID'),
                        measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID')
                    };
                }

                // If config is missing keys, log but don't crash immediately
                if (!firebaseConfig.apiKey) {
                    console.warn("Firebase config is missing or incomplete.");
                    return;
                }

                const app = initializeApp(firebaseConfig);
                const authInstance = getAuth(app);
                const firestore = getFirestore(app);
                
                setDb(firestore);
                setAuth(authInstance);

                onAuthStateChanged(authInstance, (u) => {
                    if (u) {
                        setUser(u);
                    } else {
                        signInAnonymously(authInstance).catch(e => console.error(e));
                    }
                });

            } catch (err) {
                console.error("Firebase Init Error:", err);
            }
        };
        initAuth();
    }, []);

    // --- AUTHENTICATION HANDLERS ---
    const handleLogout = async () => {
        if (auth) await signOut(auth);
    };

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!db || !appId || !user || view !== 'HOME') return;
        setLoading(true);
        const q = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'reviews'), 
            limit(20)
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setHomeFeed(data);
            setLoading(false);
        });
        return () => unsub();
    }, [db, appId, user, view]);

    useEffect(() => {
        if (!db || !selectedProp || !appId || !user || view === 'HOME') return;
        setLoading(true);
        
        if (propertyTab === 'REVIEWS') {
            const q = query(
                collection(db, 'artifacts', appId, 'public', 'data', 'reviews'), 
                where('propertyId', '==', selectedProp.id)
            );
            const unsub = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (sortBy === 'NEWEST') {
                    data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                } else if (sortBy === 'RENT_LOW') {
                    data.sort((a, b) => (a.rent || 9999) - (b.rent || 9999));
                } else if (sortBy === 'LOCATION_BEST') {
                    data.sort((a, b) => (b.locationRating || 0) - (a.locationRating || 0));
                } else if (sortBy === 'MOST_HELPFUL') {
                    data.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
                }
                
                setReviews(data);
                setLoading(false);
            });
            return () => unsub();
        } else {
            const q = query(
                collection(db, 'artifacts', appId, 'public', 'data', 'questions'), 
                where('propertyId', '==', selectedProp.id), 
                orderBy('timestamp', 'desc')
            );
            const unsub = onSnapshot(q, async (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setQuestions(data);
                setLoading(false);
            }, (err) => {
                console.error("Question Fetch Error:", err);
                setLoading(false);
            });
            return () => unsub();
        }
    }, [db, selectedProp, user, appId, view, propertyTab, sortBy]); 

    // --- ACTIONS ---
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        const id = searchTerm.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
        const name = searchTerm.trim(); 
        selectProperty({ id, name, type: 'Custom Address', address: `${name}, Waterloo, ON` });
    };

    // --- CALCULATIONS ---
    const stats = useMemo(() => {
        if (reviews.length === 0) return { avgRating: 0, avgRent: 0, avgDist: 0 };
        const sumRating = reviews.reduce((acc, r) => acc + r.rating, 0);
        const validRents = reviews.filter(r => r.rent > 0);
        const sumRent = validRents.reduce((acc, r) => acc + parseInt(r.rent), 0);
        const validDist = reviews.filter(r => r.distance > 0);
        const sumDist = validDist.reduce((acc, r) => acc + parseInt(r.distance), 0);
        return {
            avgRating: (sumRating / reviews.length).toFixed(1),
            avgRent: validRents.length ? Math.round(sumRent / validRents.length) : 0,
            avgDist: validDist.length ? Math.round(sumDist / validDist.length) : 0
        };
    }, [reviews]);

    // --- SUBMIT/UPDATE REVIEW ---
    const submitReview = async (formData) => {
        if (!db) { 
            alert("Database not connected yet!"); 
            return; 
        }
        
        if (!user || user.isAnonymous) {
            setShowReviewModal(false);
            setShowAuthModal(true);
            return;
        }

        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reviews'), {
                propertyId: selectedProp.id,
                propertyName: selectedProp.name,
                category: category,
                userId: user.uid,
                userEmail: user.email,
                helpfulCount: 0,
                timestamp: serverTimestamp(),
                votedUids: [],
                ...formData
            });
            setShowReviewModal(false);
        } catch (err) {
            console.error("Error posting review:", err);
            alert("Error posting: " + err.message);
        }
    };
    
    // Update function for editing
    const updateReview = async (reviewId, formData) => {
        if (!db || !appId) {
            alert("Database not connected.");
            return;
        }
        
        try {
            const reviewRef = doc(db, 'artifacts', appId, 'public', 'data', 'reviews', reviewId);
            await updateDoc(reviewRef, {
                ...formData,
                lastEdited: serverTimestamp(), 
            });
            setShowEditModal(false);
            setReviewToEdit(null);
        } catch (err) {
            console.error("Error updating review:", err);
            alert("Error updating: " + err.message);
        }
    };


    const submitQuestion = async (text) => {
        if (!db || !user) { 
            alert("Please wait for connection..."); 
            return; 
        }
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'questions'), {
                propertyId: selectedProp.id,
                propertyName: selectedProp.name,
                userId: user.uid,
                text: text,
                replyCount: 0,
                timestamp: serverTimestamp()
            });
            setShowQuestionModal(false);
        } catch (err) {
            console.error(err);
            alert("Failed to post question.");
        }
    };

    const handleLike = async (reviewId, currentUids = []) => {
        if (!db || !appId || !user || !user.uid) return;
        if (currentUids && currentUids.includes(user.uid)) return;
        const reviewRef = doc(db, 'artifacts', appId, 'public', 'data', 'reviews', reviewId);
        await updateDoc(reviewRef, { 
            helpfulCount: increment(1),
            votedUids: arrayUnion(user.uid)
        });
    };

    const selectProperty = (prop) => {
        setSelectedProp(prop);
        setView('PROPERTY');
        setPropertyTab('REVIEWS');
    };

    const openMaps = () => {
        if (selectedProp?.address) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedProp.address)}`, '_blank');
        }
    };
    
    // Handler for editing from the Home feed
    const handleEditFromHome = (review) => {
        const allProperties = [...ON_CAMPUS_DORMS, ...POPULAR_OFF_CAMPUS];
        
        // Find property details based on the review's propertyId
        const propDetails = allProperties.find(p => p.id === review.propertyId) || {
            id: review.propertyId,
            name: review.propertyName,
            type: 'Custom Property',
            address: review.propertyName + ', Waterloo, ON'
        };
        
        // Set the property view and context
        selectProperty(propDetails);

        // Immediately set the review for editing and open the modal
        setReviewToEdit(review);
        setShowEditModal(true);
    };


    // --- SUB-COMPONENTS ---
    const MobileNavLink = ({ label, currentView, targetView, onClick, icon }) => {
        const isActive = currentView === targetView;
        const activeClass = isActive 
            ? 'bg-yellow-50 text-yellow-700 font-bold' 
            : 'text-gray-700 hover:bg-gray-50';
            
        return (
            <button
                onClick={onClick}
                className={`w-full text-left flex items-center gap-2 text-sm p-2 rounded-lg transition-colors ${activeClass}`}
            >
                {icon}
                {label}
            </button>
        );
    };

    const Navbar = ({ isMobileMenuOpen, setIsMobileMenuOpen, user, handleLogout, setView, setCategory, view, setShowAuthModal }) => (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <div onClick={() => { setView('HOME'); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 cursor-pointer group">
                    <div className="bg-yellow-500 p-1.5 rounded-lg group-hover:bg-yellow-400 transition-colors">
                        <Building2 size={20} className="text-white" />
                    </div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        RATE MY <span className="text-yellow-600">REZ</span>
                    </h1>
                </div>

                {/* Desktop Navigation - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-6">
                    <button 
                        onClick={() => { setCategory('ON'); setView('LIST_ON'); }} 
                        className={`text-sm font-bold hover:text-yellow-600 transition-colors ${view === 'LIST_ON' ? 'text-yellow-600' : 'text-gray-600'}`}
                    >
                        On Campus
                    </button>
                    <button 
                        onClick={() => { setCategory('OFF'); setView('LIST_OFF'); }} 
                        className={`text-sm font-bold hover:text-blue-600 transition-colors ${view === 'LIST_OFF' ? 'text-blue-600' : 'text-gray-600'}`}
                    >
                        Off Campus
                    </button>
                    <button 
                        onClick={() => setView('ABOUT')} 
                        className={`text-sm font-medium hover:text-gray-900 transition-colors ${view === 'ABOUT' ? 'text-gray-900' : 'text-gray-500'}`}
                    >
                        About
                    </button>
                    <button 
                        onClick={() => setView('CONTACT')} 
                        className={`text-sm font-medium hover:text-gray-900 transition-colors ${view === 'CONTACT' ? 'text-gray-900' : 'text-gray-500'}`}
                    >
                        Contact
                    </button>
                    
                    {user && !user.isAnonymous ? (
                        <button 
                            onClick={handleLogout} 
                            className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                        >
                            <Check size={12}/> Verified
                        </button>
                    ) : (
                        <button 
                            onClick={() => setShowAuthModal(true)} 
                            className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 hover:bg-gray-200 transition-all"
                        >
                            <LogIn size={12}/> Login
                        </button>
                    )}
                </div>

                {/* Mobile Menu Icon & Toggle Logic */}
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                    className="md:hidden text-gray-500 hover:text-gray-700"
                >
                    {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
                </button>
            </div>
            
            {/* Mobile Menu Dropdown (Conditionally Rendered) */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 p-4 shadow-lg animate-in fade-in slide-in-from-top-1">
                    <div className="flex flex-col gap-3">
                        <MobileNavLink 
                            label="Home" 
                            currentView={view} 
                            targetView="HOME" 
                            onClick={() => { setView('HOME'); setIsMobileMenuOpen(false); }}
                            icon={<Home size={18}/>}
                        />
                        <MobileNavLink 
                            label="On Campus" 
                            currentView={view} 
                            targetView="LIST_ON" 
                            onClick={() => { setCategory('ON'); setView('LIST_ON'); setIsMobileMenuOpen(false); }}
                            icon={<Building2 size={18}/>}
                        />
                        <MobileNavLink 
                            label="Off Campus" 
                            currentView={view} 
                            targetView="LIST_OFF" 
                            onClick={() => { setCategory('OFF'); setView('LIST_OFF'); setIsMobileMenuOpen(false); }}
                            icon={<MapPin size={18}/>}
                        />
                        <MobileNavLink 
                            label="About" 
                            currentView={view} 
                            targetView="ABOUT" 
                            onClick={() => { setView('ABOUT'); setIsMobileMenuOpen(false); }}
                            icon={<Info size={18}/>}
                        />
                        <MobileNavLink 
                            label="Contact" 
                            currentView={view} 
                            targetView="CONTACT" 
                            onClick={() => { setView('CONTACT'); setIsMobileMenuOpen(false); }}
                            icon={<Mail size={18}/>}
                        />

                        <div className="pt-3 border-t border-gray-100">
                            {user && !user.isAnonymous ? (
                                <button 
                                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                                    className="w-full text-left flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={18}/> Logout ({user.email ? user.email.split('@')[0] : 'User'})
                                </button>
                            ) : (
                                <button 
                                    onClick={() => { setShowAuthModal(true); setIsMobileMenuOpen(false); }}
                                    className="w-full text-left flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                    <User size={18}/> Login / Sign Up
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const QuestionCard = ({ question }) => {
        const [showReplies, setShowReplies] = useState(false);
        const [replies, setReplies] = useState([]); 
        const [replyText, setReplyText] = useState('');
        const [replyLoading, setReplyLoading] = useState(false);

        useEffect(() => {
            if (!showReplies || !db || !appId) return;
            const q = query(
                collection(db, 'artifacts', appId, 'public', 'data', 'replies'), 
                where('questionId', '==', question.id), 
                orderBy('timestamp', 'asc')
            );
            setReplyLoading(true);
            const unsub = onSnapshot(q, (snapshot) => {
                setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setReplyLoading(false);
            });
            return () => unsub();
        }, [showReplies, question.id, db, appId]); 

        const postReply = async () => {
            if (!replyText.trim() || !db || !appId || !user) return;
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'replies'), {
                questionId: question.id, 
                text: replyText, 
                userId: user.uid, 
                timestamp: serverTimestamp()
            });
            setReplyText('');
        };

        return (
            <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-3">
                    <div className="bg-blue-100 p-2 rounded-full h-min">
                        <MessageCircle size={20} className="text-blue-600" />
                    </div>
                    <div className="w-full">
                        <div className="flex justify-between items-start">
                            <p className="font-bold text-gray-900 text-lg">{question.text}</p>
                            <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                                {question.timestamp ? new Date(question.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                            </span>
                        </div>
                        <button 
                            onClick={() => setShowReplies(!showReplies)} 
                            className="mt-3 text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                        >
                            {showReplies ? 'Hide Replies' : `${replies.length > 0 ? `View ${replies.length}` : 'View'} Replies`}
                        </button>
                        {showReplies && (
                            <div className="mt-4 pl-4 border-l-2 border-gray-100 space-y-4">
                                {replyLoading ? (
                                    <p className="text-sm text-gray-500 italic">Loading answers...</p>
                                ) : replies.length > 0 ? (
                                    replies.map(reply => (
                                        <div key={reply.id} className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                                            {reply.text}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded-lg">
                                        No answers yet. Be the first to reply!
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input 
                                        value={replyText} 
                                        onChange={(e) => setReplyText(e.target.value)} 
                                        className="flex-grow bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" 
                                        placeholder="Write a reply..." 
                                    />
                                    <button 
                                        onClick={postReply} 
                                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                                    >
                                        <Send size={16}/>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const ReviewCard = ({ review, showPropertyContext, onEditClick }) => {
        const hasVoted = user && review.votedUids && review.votedUids.includes(user.uid);
        const isAuthor = user && review.userId === user.uid; 
        const studentLevel = review.studentLevel || '';
        
        const handleEditClick = (e) => {
            e.stopPropagation();
            if (onEditClick) {
                // If onEditClick is provided (Home feed)
                onEditClick(review); 
            } else {
                // Default behavior (Property Detail page)
                setReviewToEdit(review);
                setShowEditModal(true);
            }
        };

        return (
            <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                    <div className="w-full">
                        {showPropertyContext && (
                            <div 
                                onClick={() => selectProperty({ id: review.propertyId, name: review.propertyName, type: 'Property' })} 
                                className="text-sm font-bold text-gray-900 mb-2 hover:text-blue-600 cursor-pointer flex items-center gap-1 w-max"
                            >
                                {review.propertyName} <ArrowRightIcon className="w-3 h-3 text-gray-400"/>
                            </div>
                        )}
                        <div className="flex justify-between w-full">
                            <StarRating rating={review.rating} />
                            <span className="text-xs text-gray-400 font-mono">
                                {review.lastEdited ? `Edited ${new Date(review.lastEdited.seconds * 1000).toLocaleDateString()}` : 
                                review.timestamp ? new Date(review.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                            </span>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs font-medium text-gray-500 flex-wrap">
                            {review.rent > 0 && (
                                <span className="text-emerald-600 flex items-center gap-1">
                                    <DollarSign size={12}/> ${review.rent}
                                </span>
                            )}
                            {review.distance > 0 && (
                                <span className="text-blue-600 flex items-center gap-1">
                                    <Footprints size={12}/> {review.distance}m
                                </span>
                            )}
                            {review.locationRating > 0 && (
                                <span className="text-purple-600 flex items-center gap-1">
                                    <MapPin size={12}/> Loc: {review.locationRating}/5
                                </span>
                            )}
                            {/* DISPLAY STUDENT LEVEL */}
                            {studentLevel && (
                                <span className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-xs 
                                    ${studentLevel === 'Graduate' ? 'bg-indigo-100 text-indigo-700' : 'bg-yellow-100 text-yellow-700'}`}
                                >
                                    <GraduationCap size={12}/> {studentLevel}
                                </span>
                            )}
                            {/* END DISPLAY */}
                        </div>
                        {review.tags && review.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {review.tags.map(tagId => { 
                                    const tag = AMENITY_TAGS.find(t => t.id === tagId); 
                                    if(!tag) return null; 
                                    const color = tag.type === 'good' 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                        : tag.type === 'bad' 
                                        ? 'bg-red-50 text-red-700 border-red-200' 
                                        : 'bg-gray-100 text-gray-700 border-gray-200'; 
                                    return (
                                        <span 
                                            key={tag.id} 
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${color}`}
                                        >
                                            <span>{tag.icon}</span> {tag.label}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap mt-2">
                    {review.comment}
                </p>
                {review.image && (
                    <div className="mt-4">
                        <img 
                            src={review.image} 
                            className="rounded-lg max-h-48 w-full object-cover border border-gray-200 hover:border-gray-400 transition-colors cursor-pointer" 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                const w = window.open(""); 
                                if(w) w.document.write(`<img src="${review.image}" style="width:100%"/>`); 
                            }}
                        />
                    </div>
                )}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    {/* EDIT BUTTON USES THE UNIFIED HANDLER */}
                    {isAuthor && (
                        <button
                            onClick={handleEditClick} 
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full text-gray-500 hover:text-yellow-600 bg-gray-50 hover:bg-yellow-50 transition-colors"
                        >
                            <Edit size={12} /> Edit Review
                        </button>
                    )}
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            handleLike(review.id, review.votedUids); 
                        }} 
                        disabled={hasVoted || !user} 
                        className={`ml-auto flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${hasVoted ? 'text-blue-600 bg-blue-100 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50'}`}
                    >
                        <ThumbsUp size={12} className={hasVoted ? 'fill-blue-600' : 'fill-transparent'}/> 
                        Helpful {review.helpfulCount > 0 && `(${review.helpfulCount})`}
                    </button>
                </div>
            </div>
        );
    };

    const StarRating = ({ rating, size = 16, interactive = false, onRate }) => (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                    key={star} 
                    size={size} 
                    className={`${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`} 
                    onClick={() => interactive && onRate(star)} 
                />
            ))}
        </div>
    );

    const Modal = ({ title, onClose, children }) => (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-white border border-gray-200 w-full max-w-lg rounded-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={20}/>
                </button>
                <h3 className="text-xl font-bold text-gray-900 mb-6">{title}</h3>
                {children}
            </div>
        </div>
    );
    
    // REUSABLE COMPONENT FOR BOTH NEW AND EDIT
    const ReviewModalContent = ({ initialData = {}, onSave, isEditing = false, onClose }) => {
        // State for student level, defaulting to '' (prefer not to answer)
        const [studentLevel, setStudentLevel] = useState(initialData.studentLevel || '');
        const [r, setR] = useState(initialData.rating || 0); 
        const [locR, setLocR] = useState(initialData.locationRating || 0); 
        const [c, setC] = useState(initialData.comment || '');
        const [rent, setRent] = useState(initialData.rent || '');
        const [dist, setDist] = useState(initialData.distance || '');
        const [img, setImg] = useState(initialData.image || null);
        const [tags, setTags] = useState(initialData.tags || []);
        const [processing, setProcessing] = useState(false);
        const fileInputRef = useRef(null);

        const handleFileChange = async (e) => {
            if (e.target.files && e.target.files[0]) {
                setProcessing(true);
                const reader = new FileReader(); 
                reader.readAsDataURL(e.target.files[0]);
                reader.onload = (event) => {
                    const i = new Image(); 
                    i.src = event.target.result;
                    i.onload = () => {
                        const cvs = document.createElement('canvas'); 
                        const scale = 800 / i.width;
                        cvs.width = 800; 
                        cvs.height = i.height * scale;
                        const ctx = cvs.getContext('2d'); 
                        ctx.drawImage(i, 0, 0, cvs.width, cvs.height);
                        setImg(cvs.toDataURL('image/jpeg', 0.7)); 
                        setProcessing(false);
                    };
                };
            }
        };

        const toggleTag = (id) => { 
            if (tags.includes(id)) {
                setTags(tags.filter(t => t !== id)); 
            } else {
                setTags([...tags, id]); 
            }
        };

        const handleSave = () => {
            onSave({
                rating: r, 
                locationRating: locR, 
                rent: Number(rent), 
                distance: Number(dist), 
                comment: c, 
                image: img, 
                tags,
                studentLevel: studentLevel, // <-- NEW DATA FIELD
            });
        };

        return (
            <div className="space-y-6">
                
                {/* NEW: STUDENT LEVEL DROPDOWN */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                        Student Status
                    </label>
                    <div className="relative">
                        <GraduationCap size={16} className="absolute left-3 top-3 text-gray-400"/>
                        <select
                            value={studentLevel}
                            onChange={(e) => setStudentLevel(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-9 pr-3 text-gray-900 focus:border-yellow-500 outline-none appearance-none"
                        >
                            <option value="">Prefer not to answer</option>
                            <option value="Undergraduate">Undergraduate</option>
                            <option value="Graduate">Graduate</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                           <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
                {/* END NEW DROPDOWN */}

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                        Overall Experience
                    </label>
                    <StarRating rating={r} size={32} interactive={true} onRate={setR} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                            Rent ($)
                        </label>
                        <div className="relative">
                            <DollarSign size={16} className="absolute left-3 top-3 text-gray-400"/>
                            <input 
                                type="number" 
                                value={rent} 
                                onChange={e=>setRent(e.target.value)} 
                                className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-9 pr-3 text-gray-900 focus:border-yellow-500 outline-none"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                            Walk to Campus (min)
                        </label>
                        <div className="relative">
                            <Footprints size={16} className="absolute left-3 top-3 text-gray-400"/>
                            <input 
                                type="number" 
                                value={dist} 
                                onChange={e=>setDist(e.target.value)} 
                                className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-9 pr-3 text-gray-900 focus:border-yellow-500 outline-none"
                                placeholder="0"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                        Amenities
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {AMENITY_TAGS.map(tag => (
                            <button 
                                key={tag.id} 
                                onClick={() => toggleTag(tag.id)} 
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${tags.includes(tag.id) ? 'bg-yellow-50 border-yellow-400 text-yellow-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                {tag.icon} {tag.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                        Location Rating
                    </label>
                    <StarRating rating={locR} size={24} interactive={true} onRate={setLocR} />
                </div>

                <textarea 
                    className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-yellow-500 outline-none h-24 resize-none" 
                    placeholder="Write your review..." 
                    value={c} 
                    onChange={e => setC(e.target.value)}
                ></textarea>

                <div 
                    onClick={() => fileInputRef.current.click()} 
                    className={`border-2 border-dashed ${img ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300 bg-gray-50'} hover:border-yellow-500 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer`}
                >
                    {img ? (
                        <div className="relative w-full">
                            <img src={img} className="h-24 w-full object-cover rounded-lg" />
                            <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm">
                                Change
                            </div>
                        </div>
                    ) : (
                        <>
                            <Camera className="text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500">Add Photo (Optional)</span>
                        </>
                    )}
                    <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                </div>

                <button 
                    onClick={handleSave} 
                    disabled={r === 0 || processing} 
                    className="w-full py-3 rounded-lg font-bold bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {processing ? "Processing..." : isEditing ? "Save Changes" : "Post Review"}
                </button>
            </div>
        );
    };

    // --- VIEW RENDERER HELPER ---
    const renderContent = () => {
        if (view === 'HOME') {
            return (
                <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
                    <Navbar 
                        isMobileMenuOpen={isMobileMenuOpen}
                        setIsMobileMenuOpen={setIsMobileMenuOpen}
                        user={user}
                        handleLogout={handleLogout}
                        setView={setView}
                        setCategory={setCategory}
                        view={view}
                        setShowAuthModal={setShowAuthModal}
                    />
                    <div className="bg-white border-b border-gray-200 pt-12 pb-16 px-6 text-center">
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
                            Find your home at Waterloo.
                        </h1>
                        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">
                            The student-powered housing database. See what residences are 
                            <span className="text-yellow-600 font-bold"> really</span> like.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={() => { setCategory('ON'); setView('LIST_ON'); }} 
                                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                            >
                                Browse On-Campus
                            </button>
                            <button 
                                onClick={() => { setCategory('OFF'); setView('LIST_OFF'); }} 
                                className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-bold py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all"
                            >
                                Browse Off-Campus
                            </button>
                        </div>
                    </div>

                    <div className="max-w-6xl mx-auto px-4 mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 flex-grow">
                        <div className="md:col-span-2 space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="text-yellow-500" size={20}/>
                                <h2 className="text-xl font-bold text-gray-900">Fresh Reviews</h2>
                            </div>
                            {loading ? (
                                <div className="space-y-4">
                                    {[1,2,3].map(i => (
                                        <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
                                    ))}
                                </div>
                            ) : homeFeed.length === 0 ? (
                                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
                                    <p className="text-gray-500">No reviews yet. Be the first!</p>
                                </div>
                            ) : (
                                homeFeed.map(review => (
                                    <ReviewCard 
                                        key={review.id} 
                                        review={review} 
                                        showPropertyContext={true} 
                                        onEditClick={handleEditFromHome} // <-- Passes handler to enable edit from home
                                    />
                                ))
                            )}
                        </div>

                        <div className="space-y-8">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                                    Trending Off-Campus
                                </h3>
                                <div className="space-y-3">
                                    {POPULAR_OFF_CAMPUS.slice(0, 4).map(prop => (
                                        <div 
                                            key={prop.id} 
                                            onClick={() => selectProperty(prop)} 
                                            className="flex items-center justify-between group cursor-pointer"
                                        >
                                            <span className="font-bold text-gray-700 group-hover:text-blue-600 transition-colors">
                                                {prop.name}
                                            </span>
                                            <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-blue-400"/>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => { setCategory('OFF'); setView('LIST_OFF'); }} 
                                    className="mt-4 text-sm font-bold text-blue-600 hover:underline w-full text-left"
                                >
                                    View all rentals →
                                </button>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                                    Popular Residences
                                </h3>
                                <div className="space-y-3">
                                    {ON_CAMPUS_DORMS.slice(0, 4).map(prop => (
                                        <div 
                                            key={prop.id} 
                                            onClick={() => selectProperty(prop)} 
                                            className="flex items-center justify-between group cursor-pointer"
                                        >
                                            <span className="font-bold text-gray-700 group-hover:text-yellow-600 transition-colors">
                                                {prop.name.split('(')[0]}
                                            </span>
                                            <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-yellow-400"/>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => { setCategory('ON'); setView('LIST_ON'); }} 
                                    className="mt-4 text-sm font-bold text-yellow-600 hover:underline w-full text-left"
                                >
                                    View all dorms →
                                </button>
                            </div>
                        </div>
                    </div>
                    <Footer />
                </div>
            );
        }

        if (view === 'LIST_ON' || view === 'LIST_OFF') {
            const list = view === 'LIST_ON' ? ON_CAMPUS_DORMS : POPULAR_OFF_CAMPUS;
            const tagClass = view === 'LIST_ON' 
                ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                : 'bg-blue-50 text-blue-700 border-blue-200';
            
            return (
                <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
                    <Navbar 
                        isMobileMenuOpen={isMobileMenuOpen}
                        setIsMobileMenuOpen={setIsMobileMenuOpen}
                        user={user}
                        handleLogout={handleLogout}
                        setView={setView}
                        setCategory={setCategory}
                        view={view}
                        setShowAuthModal={setShowAuthModal}
                    />
                    <div className="max-w-4xl mx-auto px-6 py-8 flex-grow">
                        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
                            <div className="w-full md:w-auto">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                                    Your Faculty
                                </label>
                                <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-lg border border-gray-300 shadow-sm w-full md:w-64">
                                    <GraduationCap size={18} className="text-gray-400"/>
                                    <select 
                                        value={userFaculty} 
                                        onChange={(e) => setUserFaculty(e.target.value)} 
                                        className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer w-full"
                                    >
                                        {FACULTIES.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {view === 'LIST_OFF' && (
                                <div className="w-full md:flex-grow">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                                        Search Address
                                    </label>
                                    <form onSubmit={handleSearchSubmit} className="relative flex gap-2">
                                        <div className="relative flex-grow">
                                            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                            <input 
                                                type="text" 
                                                className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-12 pr-4 text-gray-900 focus:border-blue-500 outline-none shadow-sm" 
                                                placeholder="e.g. 203 Lester St" 
                                                value={searchTerm} 
                                                onChange={e => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <button 
                                            type="submit" 
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors shadow-sm"
                                        >
                                            Go
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            {view === 'LIST_ON' ? 'On-Campus Residences' : 'Popular Student Rentals'}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {list.map(prop => (
                                <div 
                                    key={prop.id} 
                                    onClick={() => selectProperty(prop)} 
                                    className="bg-white border border-gray-200 p-5 rounded-xl cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                {prop.name}
                                            </h3>
                                            {/* Logic updated to highlight Graduate Apartment type */}
                                            <span className={`inline-block mt-2 px-2.5 py-0.5 border text-xs font-medium rounded-full ${prop.type === 'Graduate Apartment' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : tagClass}`}>
                                                {prop.type}
                                            </span>
                                        </div>
                                        <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Footer />
                </div>
            );
        }

        if (view === 'PROPERTY') {
            return (
                <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
                    <Navbar 
                        isMobileMenuOpen={isMobileMenuOpen}
                        setIsMobileMenuOpen={setIsMobileMenuOpen}
                        user={user}
                        handleLogout={handleLogout}
                        setView={setView}
                        setCategory={setCategory}
                        view={view}
                        setShowAuthModal={setShowAuthModal}
                    />
                    <div className="max-w-4xl mx-auto px-6 py-8 flex-grow">
                        <div className="flex justify-between items-center mb-8">
                            <button 
                                onClick={() => setView(category === 'ON' ? 'LIST_ON' : 'LIST_OFF')} 
                                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium"
                            >
                                <ArrowLeft size={20} /> Back to List
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="hidden md:flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Context:</span>
                                    <select 
                                        value={userFaculty} 
                                        onChange={(e) => setUserFaculty(e.target.value)} 
                                        className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
                                    >
                                        {FACULTIES.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                </div>
                                <button 
                                    onClick={openMaps} 
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 hover:border-blue-200 transition-colors"
                                >
                                    <Map size={16} /> View on Maps
                                </button>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between md:items-start gap-6">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 mb-2">
                                        {selectedProp.name}
                                    </h1>
                                    <p className="text-gray-500 flex items-center gap-2 mb-6">
                                        <MapPin size={16}/> Waterloo, ON
                                    </p>
                                    <div className="flex gap-3 flex-wrap">
                                        {stats.avgRent > 0 && (
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                                                <DollarSign size={14}/> Avg Rent: ${stats.avgRent}
                                            </span>
                                        )}
                                        {stats.avgDist > 0 && (
                                            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                                                <Footprints size={14}/> ~{stats.avgDist} min walk (to {userFaculty})
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="text-center">
                                        <div className="text-4xl font-black text-gray-900">{stats.avgRating}</div>
                                        <div className="text-xs font-bold text-gray-400 tracking-wider mt-1">RATING</div>
                                    </div>
                                    <div className="h-10 w-px bg-gray-200"></div>
                                    <div className="text-center">
                                        <div className="text-4xl font-black text-gray-900">{reviews.length}</div>
                                        <div className="text-xs font-bold text-gray-400 tracking-wider mt-1">REVIEWS</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-6 border-b border-gray-200 mb-6">
                            <button 
                                onClick={() => setPropertyTab('REVIEWS')} 
                                className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${propertyTab === 'REVIEWS' ? 'text-gray-900 border-yellow-500' : 'text-gray-500 border-transparent hover:text-gray-900'}`}
                            >
                                <Star size={16}/> Reviews
                            </button>
                            <button 
                                onClick={() => setPropertyTab('QA')} 
                                className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${propertyTab === 'QA' ? 'text-gray-900 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-900'}`}
                            >
                                <MessageCircle size={16}/> Community Q&A
                            </button>
                        </div>

                        {propertyTab === 'REVIEWS' && (
                            <>
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
                                        <Filter size={16} className="text-gray-400 ml-2" />
                                        <select 
                                            value={sortBy} 
                                            onChange={(e) => setSortBy(e.target.value)} 
                                            className="bg-transparent text-sm font-medium text-gray-700 py-1.5 pr-8 pl-2 focus:outline-none cursor-pointer"
                                        >
                                            <option value="NEWEST">Newest First</option>
                                            <option value="RENT_LOW">Lowest Rent</option>
                                            <option value="LOCATION_BEST">Best Location</option>
                                            <option value="MOST_HELPFUL">Most Helpful</option>
                                        </select>
                                    </div>
                                    <button 
                                        onClick={() => setShowReviewModal(true)} 
                                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow w-full md:w-auto justify-center"
                                    >
                                        <Plus size={18} /> Write Review
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {loading ? (
                                        <p className="text-gray-400 text-center py-8">Loading reviews...</p>
                                    ) : reviews.length === 0 ? (
                                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                                            <MessageSquare className="mx-auto text-gray-300 mb-3" size={48} />
                                            <p className="text-gray-500 font-medium">No reviews yet.</p>
                                        </div>
                                    ) : (
                                        reviews.map(review => (
                                            <ReviewCard key={review.id} review={review} />
                                        ))
                                    )}
                                </div>
                            </>
                        )}

                        {propertyTab === 'QA' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-blue-900">Have a question?</h3>
                                        <p className="text-sm text-blue-700">
                                            Ask current residents about noise, parties, or management.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setShowQuestionModal(true)} 
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors"
                                    >
                                        Ask Question
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {loading ? (
                                        <p className="text-gray-400 text-center py-8">Loading questions...</p>
                                    ) : questions.length === 0 ? (
                                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                                            <MessageCircle className="mx-auto text-gray-300 mb-3" size={48} />
                                            <p className="text-gray-500 font-medium">No questions yet.</p>
                                        </div>
                                    ) : (
                                        questions.map(q => (
                                            <QuestionCard key={q.id} question={q} />
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {showReviewModal && (
                            <Modal title={`Rate ${selectedProp.name}`} onClose={() => setShowReviewModal(false)}>
                                <ReviewModalContent 
                                    initialData={{}} 
                                    onSave={submitReview}
                                    isEditing={false}
                                    onClose={() => setShowReviewModal(false)}
                                />
                            </Modal>
                        )}
                        
                        {/* EDIT REVIEW MODAL */}
                        {showEditModal && reviewToEdit && (
                            <Modal title={`Edit Review for ${reviewToEdit.propertyName}`} onClose={() => setShowEditModal(false)}>
                                <ReviewModalContent
                                    initialData={reviewToEdit}
                                    onSave={(formData) => updateReview(reviewToEdit.id, formData)}
                                    isEditing={true}
                                    onClose={() => setShowEditModal(false)}
                                />
                            </Modal>
                        )}

                        {showQuestionModal && (
                            <Modal title="Ask the Community" onClose={() => setShowQuestionModal(false)}>
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500">Your question will be public. Be specific!</p>
                                    <textarea 
                                        id="q-input" 
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 outline-none h-32 resize-none" 
                                        placeholder="e.g. Is the laundry room busy on weekends?"
                                    ></textarea>
                                    <button 
                                        onClick={() => { 
                                            const val = document.getElementById('q-input').value; 
                                            if(val) submitQuestion(val); 
                                        }} 
                                        className="w-full py-3 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                                    >
                                        Post Question
                                    </button>
                                </div>
                            </Modal>
                        )}
                    </div>
                    <Footer />
                </div>
            );
        }

        if (view === 'ABOUT') {
            return (
                <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
                    <Navbar 
                        isMobileMenuOpen={isMobileMenuOpen}
                        setIsMobileMenuOpen={setIsMobileMenuOpen}
                        user={user}
                        handleLogout={handleLogout}
                        setView={setView}
                        setCategory={setCategory}
                        view={view}
                        setShowAuthModal={setShowAuthModal}
                    />
                    <div className="max-w-3xl mx-auto px-6 py-12 flex-grow">
                        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                                <Info className="text-yellow-600" size={32}/>
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 mb-6">About Rate My Rez</h1>
                            <div className="prose prose-gray max-w-none text-gray-600 space-y-6">
                                <p className="text-lg">
                                    Looking for housing in Waterloo is stressful. You have to decide between overpriced luxury apartments, 
                                    run-down student houses, or competitive on-campus lotteries. And usually, you're signing a lease based 
                                    on a 3-minute tour or heavily edited photos.
                                </p>
                                <p><strong>Rate My Rez</strong> was built to solve this asymmetry.</p>
                                <h3 className="text-gray-900 font-bold text-xl">For First Years</h3>
                                <p>
                                    Moving away from home is scary. We provide transparent, unfiltered reviews of residence life 
                                    (V1 vs REV vs CMH) so you know exactly what you're walking into—from the cafeteria food quality 
                                    to the noise levels on Friday nights.
                                </p>
                                <h3 className="text-gray-900 font-bold text-xl">For Upper Years</h3>
                                <p>
                                    The off-campus market is a jungle. Landlords hide pest issues, broken elevators, and thin walls. 
                                    This platform gives you the leverage of community knowledge to find hidden gems and avoid slumlord traps.
                                </p>
                                <div className="bg-gray-50 p-6 rounded-xl border-l-4 border-yellow-500 italic text-gray-700">
                                    "By students, for students. No paid listings. No filtered reviews. Just the truth."
                                </div>
                            </div>
                        </div>
                    </div>
                    <Footer />
                </div>
            );
        }

        if (view === 'CONTACT') {
            return (
                <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
                    <Navbar 
                        isMobileMenuOpen={isMobileMenuOpen}
                        setIsMobileMenuOpen={setIsMobileMenuOpen}
                        user={user}
                        handleLogout={handleLogout}
                        setView={setView}
                        setCategory={setCategory}
                        view={view}
                        setShowAuthModal={setShowAuthModal}
                    />
                    <div className="max-w-3xl mx-auto px-6 py-12 flex-grow">
                        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <Mail className="text-blue-600" size={32}/>
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 mb-2">Get in Touch</h1>
                            <p className="text-gray-500 mb-8">
                                Have a feature request? Found a bug? Or just want to say hi?
                            </p>
                            <div className="inline-block bg-gray-50 border border-gray-200 p-6 rounded-xl">
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Direct Email</p>
                                <a 
                                    href="mailto:uwratemyrez@gmail.com" 
                                    className="text-2xl font-bold text-blue-600 hover:underline"
                                >
                                    uwratemyrez@gmail.com
                                </a>
                            </div>
                            <div className="mt-8 text-sm text-gray-400">
                                <p>
                                    Rate My Rez is a student project and is not officially affiliated with the University of Waterloo.
                                </p>
                            </div>
                        </div>
                    </div>
                    <Footer />
                </div>
            );
        }
    };

    // Global auth modal - renders on all pages
    return (
        <>
            {renderContent()}
            {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} auth={auth} />}
            <Analytics /> 
        </>
    );
}

const ArrowRightIcon = ({ className }) => (
    <svg 
        className={className} 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <path d="M5 12h14"/>
        <path d="m12 5 7 7-7 7"/>
    </svg>
);