import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'ff_token';
const USER_KEY = 'ff_user';

const CHALLENGES = [
    { id: 'smile', label: '😊 Please SMILE!', instruction: 'Show a happy expression' },
    { id: 'turn_left', label: '⬅️ Turn Head LEFT', instruction: 'Rotate head slightly to your left' },
    { id: 'turn_right', label: '➡️ Turn Head RIGHT', instruction: 'Rotate head slightly to your right' }
];

const FaceCapture = () => {
    const webcamRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [user, setUser] = useState(null);
    const [enrollName, setEnrollName] = useState('');
    const [enrolling, setEnrolling] = useState(false);

    // Liveness State
    const [challengeStep, setChallengeStep] = useState(0); // 0 = Idle, 1 = Smile, 2 = Left, 3 = Right, 4 = Final
    const [challengeStatus, setChallengeStatus] = useState(null); // 'waiting', 'processing', 'success', 'failed'

    const googleBtnRef = useRef(null);
    const [gsiReady, setGsiReady] = useState(false);
    const [authError, setAuthError] = useState(null);

    // Restore an existing session from localStorage on mount.
    useEffect(() => {
        const stored = localStorage.getItem(USER_KEY);
        if (localStorage.getItem(TOKEN_KEY) && stored) {
            try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
        }
    }, []);

    // The Google Identity Services script loads async, so wait until it's ready
    // before trying to render the button (otherwise the button never appears).
    useEffect(() => {
        if (window.google?.accounts?.id) { setGsiReady(true); return; }
        const t = setInterval(() => {
            if (window.google?.accounts?.id) { setGsiReady(true); clearInterval(t); }
        }, 150);
        // Give up after ~8s so we can surface a clear error instead of hanging.
        const timeout = setTimeout(() => clearInterval(t), 8000);
        return () => { clearInterval(t); clearTimeout(timeout); };
    }, []);

    const handleCredential = useCallback(async (response) => {
        setAuthError(null);
        try {
            const { data } = await axios.post(`${API_URL}/auth/google`, {
                credential: response.credential
            });
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            setUser(data.user);
        } catch (error) {
            setAuthError(error.response?.data?.error || error.message || 'No se pudo iniciar sesión');
        }
    }, []);

    // Render the Google Identity Services button once the script is ready.
    useEffect(() => {
        if (user || !gsiReady || !GOOGLE_CLIENT_ID || !googleBtnRef.current) return;
        try {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredential
            });
            window.google.accounts.id.renderButton(googleBtnRef.current, {
                theme: 'filled_blue',
                size: 'large',
                text: 'signin_with'
            });
        } catch (e) {
            setAuthError('No se pudo inicializar Google Sign-In: ' + e.message);
        }
    }, [user, gsiReady, handleCredential]);

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        if (window.google) window.google.accounts.id.disableAutoSelect();
        setUser(null);
    };

    const capture = useCallback(() => {
        return webcamRef.current.getScreenshot();
    }, [webcamRef]);

    // Build an axios config carrying the backend session token so the API
    // (which requires authentication) accepts the request.
    const authConfig = (extra = {}) => {
        const token = localStorage.getItem(TOKEN_KEY);
        return {
            ...extra,
            headers: {
                ...(extra.headers || {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        };
    };

    const startProcess = () => {
        setResult(null);
        setChallengeStep(1); // Start directly with Step 1
        setChallengeStatus('waiting');
    };

    const nextChallenge = async (stepIndex) => {
        if (stepIndex >= CHALLENGES.length) {
            // All challenges passed, do final identification
            setChallengeStep(4); // 4 = Final Identification
            performIdentification();
            return;
        }

        setChallengeStep(stepIndex + 1); // 1-based index for UI
        setChallengeStatus('waiting');
    };

    const verifyAction = async () => {
        const currentChallenge = CHALLENGES[challengeStep - 1]; // Step is 1-based
        if (!currentChallenge) return;

        setLoading(true);
        setChallengeStatus('processing');
        const imageSrc = capture();

        try {
            // Convert base64 to blob
            const res = await fetch(imageSrc);
            const blob = await res.blob();
            const file = new File([blob], "challenge.jpg", { type: "image/jpeg" });

            const formData = new FormData();
            formData.append('image', file);

            // Re-use search endpoint to get attributes
            // Note: We ignore the match result here, we only care about attributes
            const response = await axios.post(`${API_URL}/search`, formData, await authConfig());
            const face = response.data.detectedFace;

            if (!face) {
                alert("No face detected!");
                setChallengeStatus('failed');
                setLoading(false);
                return;
            }

            // Check attributes logic
            // Ntech response structure from logs:
            // face.features.emotions = { name: "happy", confidence: 0.99 }
            // face.features.headpose_pitch = { name: 19.2, confidence: 1 }
            // face.features.headpose_yaw = { name: -3.3, confidence: 1 }

            const features = face.features || {};
            const emotions = features.emotions || {};
            const headposeYaw = features.headpose_yaw || {};

            console.log("Challenge Attributes (Fixed):", features);

            let passed = false;

            switch (currentChallenge.id) {
                case 'smile':
                    // Check if dominant emotion is 'happy' with high confidence
                    passed = (emotions.name === 'happy' && emotions.confidence > 0.6);
                    break;
                case 'turn_left':
                    // Yaw magnitude check (> 15 degrees)
                    // Note: Direction sign (-/+) depends on camera mirror and API. 
                    // Accepting ABS > 15 for now to verify Movement.
                    const yawValue = headposeYaw.name || 0;
                    passed = Math.abs(yawValue) > 15;
                    break;
                case 'turn_right':
                    const yawValueRight = headposeYaw.name || 0;
                    passed = Math.abs(yawValueRight) > 15;
                    break;
                default:
                    passed = false;
            }

            if (passed) {
                setChallengeStatus('success');
                setTimeout(() => {
                    nextChallenge(challengeStep);
                }, 1000);
            } else {
                setChallengeStatus('failed');
                // Give hint
                let msg = "Try again!";
                if (currentChallenge.id === 'smile') msg = `Emotion detected: ${emotions.name || 'none'} (${((emotions.confidence || 0) * 100).toFixed(0)}%)`;
                if (currentChallenge.id.includes('turn')) {
                    const y = headposeYaw.name || 0;
                    msg = `Angle: ${y.toFixed(1)}° (Need > 15°)`;
                }

                alert(`Challenge Failed: ${currentChallenge.instruction}. ${msg}`);
            }

        } catch (error) {
            console.error("Challenge error", error);
            setChallengeStatus('failed');
            alert("Error checking challenge: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const performIdentification = async () => {
        setLoading(true);

        // Wait 1s then capture
        setTimeout(async () => {
            try {
                const imageSrc = capture();
                const res = await fetch(imageSrc);
                const blob = await res.blob();
                const file = new File([blob], "final.jpg", { type: "image/jpeg" });
                const formData = new FormData();
                formData.append('image', file);

                const response = await axios.post(`${API_URL}/search`, formData, await authConfig());
                setResult(response.data);
            } catch (error) {
                console.error("ID error", error);
                alert("Identification failed");
                setChallengeStep(0); // Reset
            } finally {
                setLoading(false);
            }
        }, 500);
    };

    const retake = () => {
        setResult(null);
        setEnrollName('');
        setChallengeStep(0);
    };

    const enrollFace = async () => {
        if (!enrollName.trim() || !result?.detectedFace?.id) return;
        setEnrolling(true);
        try {
            await axios.post(`${API_URL}/enroll`, {
                detectionId: result.detectedFace.id,
                name: enrollName,
                imageUrl: result.imageUrl
            }, await authConfig());
            alert('Person enrolled successfully!');
            setResult(prev => ({
                ...prev,
                status: 'MATCH',
                bestMatch: { card: { name: enrollName, id: 'new' }, similarity: 1.0 }
            }));
        } catch (error) {
            console.error("Error enrolling", error);
            alert("Error enrolling: " + (error.response?.data?.error || error.message));
        } finally {
            setEnrolling(false);
        }
    };

    const openDoorManual = async () => {
        try { await axios.post(`${API_URL}/door/open`, {}, await authConfig()); alert('Door command sent!'); }
        catch (e) { alert(e.message); }
    };

    if (!user) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1>Facial Validation App</h1>
                <p>Sign in with an authorized Google account to continue.</p>
                <div ref={googleBtnRef} style={{ display: 'inline-block', marginTop: '20px', minHeight: '44px' }} />
                {!GOOGLE_CLIENT_ID && (
                    <p style={{ color: '#c0392b', marginTop: '16px' }}>
                        Configuración faltante: <code>REACT_APP_GOOGLE_CLIENT_ID</code> no está definido en el build del frontend.
                    </p>
                )}
                {GOOGLE_CLIENT_ID && !gsiReady && (
                    <p style={{ color: '#888', marginTop: '16px' }}>Cargando Google Sign-In…</p>
                )}
                {authError && (
                    <p style={{ color: '#c0392b', marginTop: '16px' }}>{authError}</p>
                )}
            </div>
        );
    }

    const currentInstruction = challengeStep > 0 && challengeStep <= CHALLENGES.length
        ? CHALLENGES[challengeStep - 1]
        : null;

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Face Verification (Active Liveness)</h1>
                <div>
                    <button onClick={openDoorManual} style={{ marginRight: '10px', backgroundColor: '#4a90e2', color: 'white', padding: '8px' }}>Open Door</button>
                    <button onClick={logout}>Logout</button>
                </div>
            </header>

            <div className="webcam-container" style={{ textAlign: 'center' }}>
                <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    width={640}
                    height={480}
                    videoConstraints={{ facingMode: "user" }}
                />
            </div>

            <div className="controls" style={{ marginTop: '20px', textAlign: 'center' }}>

                {challengeStep === 0 && !result && (
                    <button onClick={startProcess} style={{ fontSize: '1.5em', padding: '15px 30px', backgroundColor: '#28a745', color: 'white', borderRadius: '50px', cursor: 'pointer' }}>
                        START VERIFICATION 🛡️
                    </button>
                )}

                {currentInstruction && (
                    <div className="challenge-box" style={{ padding: '20px', margin: '20px auto', maxWidth: '500px', border: '2px solid #007bff', borderRadius: '10px', backgroundColor: '#e9f5ff' }}>
                        <h3 style={{ color: '#007bff' }}>Step {challengeStep}/3</h3>
                        <h1 style={{ fontSize: '2.5em', margin: '10px 0' }}>{currentInstruction.label}</h1>
                        <p style={{ fontSize: '1.2em' }}>{currentInstruction.instruction}</p>

                        <button onClick={verifyAction} disabled={loading} style={{ fontSize: '1.2em', padding: '10px 20px', marginTop: '10px' }}>
                            {loading ? 'Verifying...' : '✅ I AM DOING IT'}
                        </button>

                        {challengeStatus === 'failed' && <p style={{ color: 'red', fontWeight: 'bold' }}>❌ Not detected properly. Try again.</p>}
                        {challengeStatus === 'success' && <p style={{ color: 'green', fontWeight: 'bold' }}>✅ Success!</p>}
                    </div>
                )}

                {challengeStep === 4 && loading && <h2 style={{ color: '#007bff' }}>Identificando usuario... 🔍</h2>}

                {result && (
                    <div className="results" style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
                        {result.status === 'MATCH' ? (
                            <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '15px', borderRadius: '5px' }}>
                                <h1 style={{ margin: 0 }}>✅ ACCESS GRANTED</h1>
                                <h2>Welcome, {result.bestMatch?.card?.name}</h2>
                                <small>Confidence: {(result.bestMatch?.similarity * 100).toFixed(1)}%</small>
                            </div>
                        ) : (
                            <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '5px' }}>
                                <h1>❌ NOT RECOGNIZED</h1>
                                <p>Face detected, but not found in database.</p>
                                <button onClick={retake}>Try Again</button>
                            </div>
                        )}

                        {result.status !== 'MATCH' && (
                            <div style={{ marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                                <h4>Register this person?</h4>
                                <input
                                    type="text"
                                    placeholder="Enter Name"
                                    value={enrollName}
                                    onChange={(e) => setEnrollName(e.target.value)}
                                    style={{ padding: '8px', marginRight: '10px' }}
                                />
                                <button onClick={enrollFace} disabled={enrolling || !enrollName.trim()}>
                                    {enrolling ? 'Saving...' : 'Enroll Face'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaceCapture;
