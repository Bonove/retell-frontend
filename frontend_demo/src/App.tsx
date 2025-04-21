import React, { useEffect, useState } from "react";
import "./App.css";
import { RetellWebClient } from "retell-client-js-sdk";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
const agentId = process.env.REACT_APP_AGENT_ID;

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

  // Initialize the SDK
  useEffect(() => {
    retellWebClient.on("call_started", () => {
      console.log("call started");
      setHasError(false);
    });
    
    retellWebClient.on("call_ended", () => {
      console.log("call ended");
      setIsCalling(false);
      setHasError(false);
    });
    
    // When agent starts talking for the utterance
    // useful for animation
    retellWebClient.on("agent_start_talking", () => {
      console.log("agent_start_talking");
    });
    
    // When agent is done talking for the utterance
    // useful for animation
    retellWebClient.on("agent_stop_talking", () => {
      console.log("agent_stop_talking");
    });
    
    // Real time pcm audio bytes being played back, in format of Float32Array
    // only available when emitRawAudioSamples is true
    retellWebClient.on("audio", (audio) => {
      // console.log(audio);
    });
    
    // Update message such as transcript
    // You can get transcrit with update.transcript
    // Please note that transcript only contains last 5 sentences to avoid the payload being too large
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
    });
  }, []);

  const toggleConversation = async () => {
    if (isCalling) {
      retellWebClient.stopCall();
    } else {
      try {
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
      }
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
    if (hasError) return 'mic-error';
    if (isCalling) return 'mic-listening';
    return '';
  };

  const getStatusText = () => {
    if (hasError) return 'Error';
    if (isCalling) return 'Luisteren';
    return 'Klik om te starten';
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Waarmee kan ik u van dienst zijn?</h1>
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

      <div className="footer">
        <span>Powered by</span>
        <img
          src="/tmc-taxameter-centrale-logo-2.png"
          alt="TMC Taxameter Centrale logo"
        />
      </div>
    </div>
  );
};

export default App;