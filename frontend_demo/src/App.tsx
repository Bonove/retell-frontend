import React, { useEffect, useState } from "react";
import "./App.css";
import { RetellWebClient } from "retell-client-js-sdk";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
const agentId = process.env.REACT_APP_AGENT_ID;
const BASE_PATH = process.env.REACT_APP_BASE_PATH || '';

if (!agentId) {
  throw new Error('REACT_APP_AGENT_ID is not defined in environment variables');
}

interface RegisterCallResponse {
  access_token: string;
}

const retellWebClient = new RetellWebClient();

const App = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCheckingMic, setIsCheckingMic] = useState(false);

  // Initialize the SDK
  useEffect(() => {
    retellWebClient.on("call_started", () => {
      console.log("call started");
      setHasError(false);
      setIsTransitioning(false);
      setIsCheckingMic(false);
    });
    
    retellWebClient.on("call_ended", () => {
      console.log("call ended");
      setIsCalling(false);
      setHasError(false);
      setIsTransitioning(false);
    });
    
    retellWebClient.on("agent_start_talking", () => {
      console.log("agent_start_talking");
    });
    
    retellWebClient.on("agent_stop_talking", () => {
      console.log("agent_stop_talking");
    });
    
    retellWebClient.on("audio", (audio) => {
      // console.log(audio);
    });
    
    retellWebClient.on("update", (update) => {
      // console.log(update);
    });
    
    retellWebClient.on("metadata", (metadata) => {
      // console.log(metadata);
    });
    
    retellWebClient.on("error", (error) => {
      console.error("An error occurred:", error);
      setHasError(true);
      retellWebClient.stopCall();
      setIsCalling(false);
      setIsTransitioning(false);
      setIsCheckingMic(false);
    });
  }, []);

  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microfoon permissie geweigerd:', error);
      return false;
    }
  };

  const toggleConversation = async () => {
    // Voorkom dubbele triggers tijdens transitie of mic check
    if (isTransitioning || isCheckingMic) return;

    if (isCalling) {
      setIsTransitioning(true);
      retellWebClient.stopCall();
    } else {
      try {
        // Start met microfoon check
        setIsCheckingMic(true);
        const hasMicPermission = await checkMicrophonePermission();
        
        if (!hasMicPermission) {
          setHasError(true);
          setIsCheckingMic(false);
          return;
        }

        // Als we microfoon permissie hebben, start de call
        setIsTransitioning(true);
        setHasError(false);
        const registerCallResponse = await registerCall(agentId);
        if (registerCallResponse.access_token) {
          await retellWebClient.startCall({
            accessToken: registerCallResponse.access_token,
          });
          setIsCalling(true);
        }
      } catch (error) {
        console.error("Failed to start call:", error);
        setHasError(true);
        setIsTransitioning(false);
      }
      setIsCheckingMic(false);
    }
  };

  async function registerCall(agentId: string): Promise<RegisterCallResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/create-web-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
  
      const data: RegisterCallResponse = await response.json();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  const getMicrophoneClass = () => {
    if (isCheckingMic || isTransitioning) return 'mic-processing';
    if (hasError) return 'mic-error';
    if (isCalling) return 'mic-listening';
    return '';
  };

  const getStatusText = () => {
    if (isCheckingMic) return 'Microfoon toestemming vragen...';
    if (isTransitioning) return 'Verbinding maken...';
    if (hasError) return 'Microfoon toestemming geweigerd';
    if (isCalling) return 'Luisteren';
    return 'Klik om te starten';
  };

  return (
    <div className="app-container">
      <div className="header">
        <img 
          src={`${process.env.PUBLIC_URL}/tmc-taxameter-centrale-logo-2.png`}
          alt="TMC Taxameter Centrale logo"
          className="logo"
        />
        <h1 className={isCalling ? 'hidden' : ''}>
          Waarmee kan ik u van dienst zijn?
        </h1>
      </div>

      <div className="voice-container">
        <div 
          className={`microphone-animation ${getMicrophoneClass()}`}
          onClick={toggleConversation}
        >
          {isCalling && !hasError && (
            <>
              <div className="listening-halo halo-1"></div>
              <div className="listening-halo halo-2"></div>
              <div className="listening-halo halo-3"></div>
            </>
          )}
          <svg className="mic-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <div className="status-text">{getStatusText()}</div>
      </div>
    </div>
  );
};

export default App;