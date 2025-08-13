'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/infrastructure/firebase';
import { 
  FaQrcode, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaExclamationTriangle,
  FaCameraRetro,
  FaUser,
  FaClock,
  FaTicketAlt,
  FaEye,
  FaEyeSlash,
  FaHistory
} from 'react-icons/fa';
import styles from './TicketScanner.module.css';

interface ScanResult {
  success: boolean;
  message: string;
  code?: string;
  ticket?: {
    id: string;
    ticketNumber: string;
    userName: string;
    eventTitle: string;
    ticketType: string;
    amount: number;
    entryTime: string;
  };
  error?: string;
  usedAt?: string;
  usedBy?: string;
}

interface EntryLog {
  id: string;
  ticketNumber: string;
  attendeeName: string;
  entryTime: string;
  ticketType: string;
}

const TicketScannerPage = () => {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.eventId as string;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [entryHistory, setEntryHistory] = useState<EntryLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [manualEntry, setManualEntry] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth(), async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      
      await checkAuthorization(user.uid);
    });

    return () => unsubscribe();
  }, [auth, eventId]);

  const checkAuthorization = async (userId: string) => {
    try {
      setLoading(true);
      
      // First try events collection
      let eventRef = doc(db(), 'events', eventId);
      let eventDoc = await getDoc(eventRef);
      
      // If not found, try activities collection
      if (!eventDoc.exists()) {
        eventRef = doc(db(), 'activities', eventId);
        eventDoc = await getDoc(eventRef);
      }

      if (!eventDoc.exists()) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      const eventData = eventDoc.data();
      setEventDetails(eventData);

      // Check if user is authorized to scan for this event
      const isOwner = eventData.createdBy === userId;
      const isOrganization = eventData.organizationId === userId;
      const isAuthorizedStaff = eventData.authorizedStaff?.includes(userId);

      setIsAuthorized(isOwner || isOrganization || isAuthorizedStaff);
      
    } catch (error) {
      console.error('Error checking authorization:', error);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScannerActive(true);
        startScanning();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScannerActive(false);
  };

  const startScanning = () => {
    const scanInterval = setInterval(() => {
      if (scannerActive && videoRef.current && canvasRef.current) {
        captureAndScan();
      }
    }, 1000); // Scan every second

    // Clear interval when component unmounts or scanner stops
    return () => clearInterval(scanInterval);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for QR code scanning
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Here you would use a QR code library like jsQR
    // For now, we'll simulate QR detection
    // In a real implementation, you'd use: const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    // This is a placeholder - you'll need to install and import jsQR
    // const code = jsQR(imageData.data, imageData.width, imageData.height);
    // if (code) {
    //   await processQRCode(code.data);
    // }
  };

  const processQRCode = async (qrData: string) => {
    if (processing) return; // Prevent multiple simultaneous scans
    
    setProcessing(true);
    
    try {
      // Extract ticket number from QR code
      // QR code should contain the ticket number
      const ticketNumber = qrData.trim();
      
      await verifyTicket(ticketNumber);
      
    } catch (error) {
      console.error('Error processing QR code:', error);
      setLastScanResult({
        success: false,
        message: 'Error processing QR code',
        code: 'SCAN_ERROR'
      });
    } finally {
      setProcessing(false);
    }
  };

  const verifyTicket = async (ticketNumber: string) => {
    try {
      const response = await fetch('/api/tickets/verify-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketNumber,
          scannerId: auth().currentUser?.uid,
          scannerType: 'user', // or 'organization' based on your logic
          eventId
        }),
      });

      const result = await response.json();
      setLastScanResult(result);

      if (result.success) {
        // Add to entry history
        const newEntry: EntryLog = {
          id: result.ticket.id,
          ticketNumber: result.ticket.ticketNumber,
          attendeeName: result.ticket.userName,
          entryTime: result.ticket.entryTime,
          ticketType: result.ticket.ticketType
        };
        setEntryHistory(prev => [newEntry, ...prev]);
      }

      // Clear result after 5 seconds
      setTimeout(() => setLastScanResult(null), 5000);

    } catch (error) {
      console.error('Error verifying ticket:', error);
      setLastScanResult({
        success: false,
        message: 'Network error. Please try again.',
        code: 'NETWORK_ERROR'
      });
    }
  };

  const handleManualEntry = async () => {
    if (!manualEntry.trim()) return;
    
    await verifyTicket(manualEntry.trim());
    setManualEntry('');
  };

  const getStatusIcon = (result: ScanResult) => {
    if (result.success) return <FaCheckCircle className={styles.successIcon} />;
    
    switch (result.code) {
      case 'ALREADY_USED':
        return <FaExclamationTriangle className={styles.warningIcon} />;
      default:
        return <FaTimesCircle className={styles.errorIcon} />;
    }
  };

  const getStatusClass = (result: ScanResult) => {
    if (result.success) return styles.successResult;
    if (result.code === 'ALREADY_USED') return styles.warningResult;
    return styles.errorResult;
  };

  if (loading) {
    return (
      <div className={styles.scannerPage}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading scanner...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className={styles.scannerPage}>
        <div className={styles.unauthorizedState}>
          <FaTimesCircle className={styles.unauthorizedIcon} />
          <h2>Access Denied</h2>
          <p>You are not authorized to scan tickets for this event.</p>
          <button 
            className={styles.backButton}
            onClick={() => router.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.scannerPage}>
      {/* Header */}
      <div className={styles.scannerHeader}>
        <div className={styles.eventInfo}>
          <h1>{eventDetails?.title}</h1>
          <p>{eventDetails?.venue} • {new Date(eventDetails?.selectedDate).toLocaleDateString()}</p>
        </div>
        <button
          className={styles.historyButton}
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? <FaEyeSlash /> : <FaEye />}
          {showHistory ? 'Hide' : 'Show'} History
        </button>
      </div>

      <div className={styles.scannerContent}>
        {/* Camera Scanner */}
        <div className={styles.scannerSection}>
          <div className={styles.cameraContainer}>
            {!scannerActive ? (
              <div className={styles.cameraPlaceholder}>
                <FaCameraRetro className={styles.cameraIcon} />
                <h3>QR Code Scanner</h3>
                <p>Start camera to scan tickets</p>
                <button 
                  className={styles.startCameraButton}
                  onClick={startCamera}
                >
                  <FaQrcode /> Start Scanner
                </button>
              </div>
            ) : (
              <div className={styles.cameraView}>
                <video 
                  ref={videoRef} 
                  className={styles.videoElement}
                  autoPlay 
                  playsInline 
                  muted
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className={styles.scanOverlay}>
                  <div className={styles.scanFrame}></div>
                  <p>Position QR code within the frame</p>
                </div>
                <button 
                  className={styles.stopCameraButton}
                  onClick={stopCamera}
                >
                  Stop Scanner
                </button>
              </div>
            )}
          </div>

          {/* Manual Entry */}
          <div className={styles.manualEntry}>
            <h4>Manual Ticket Entry</h4>
            <div className={styles.manualInputGroup}>
              <input
                type="text"
                placeholder="Enter ticket number..."
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
                className={styles.manualInput}
                onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
              />
              <button 
                onClick={handleManualEntry}
                className={styles.manualSubmitButton}
                disabled={!manualEntry.trim() || processing}
              >
                Verify
              </button>
            </div>
          </div>

          {/* Scan Result */}
          {lastScanResult && (
            <div className={`${styles.scanResult} ${getStatusClass(lastScanResult)}`}>
              <div className={styles.resultHeader}>
                {getStatusIcon(lastScanResult)}
                <h4>{lastScanResult.message}</h4>
              </div>
              
              {lastScanResult.success && lastScanResult.ticket && (
                <div className={styles.ticketDetails}>
                  <div className={styles.ticketInfo}>
                    <FaUser /> {lastScanResult.ticket.userName}
                  </div>
                  <div className={styles.ticketInfo}>
                    <FaTicketAlt /> {lastScanResult.ticket.ticketType}
                  </div>
                  <div className={styles.ticketInfo}>
                    <FaClock /> {new Date(lastScanResult.ticket.entryTime).toLocaleTimeString()}
                  </div>
                </div>
              )}

              {lastScanResult.code === 'ALREADY_USED' && (
                <p className={styles.usedInfo}>
                  Previously used on {new Date(lastScanResult.usedAt!).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Entry History */}
        {showHistory && (
          <div className={styles.historySection}>
            <div className={styles.historyHeader}>
              <FaHistory />
              <h3>Entry History</h3>
              <span className={styles.entryCount}>
                {entryHistory.length} {entryHistory.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            
            <div className={styles.historyList}>
              {entryHistory.length === 0 ? (
                <div className={styles.noEntries}>
                  <p>No entries yet</p>
                </div>
              ) : (
                entryHistory.map((entry) => (
                  <div key={entry.id} className={styles.historyItem}>
                    <div className={styles.entryInfo}>
                      <div className={styles.attendeeName}>{entry.attendeeName}</div>
                      <div className={styles.ticketNumber}>#{entry.ticketNumber}</div>
                    </div>
                    <div className={styles.entryTime}>
                      {new Date(entry.entryTime).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketScannerPage; 