// frontend/src/services/AudioMonitor.js

class AudioMonitor {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;
    this.isMonitoring = false;
    this.dataArray = null;
    this.callbacks = {};
    
    // Adjustable thresholds
    this.config = {
      speechThreshold: -35,      // dB - speech detection threshold
      loudThreshold: -20,        // dB - suspicious loud noise
      silenceThreshold: -70,     // dB - considered silence
      minSpeechDuration: 500,    // ms - minimum speech length
      sampleRate: 100,           // ms - analysis interval
      debounceTime: 2000,        // ms - prevent violation spam
      maxViolationsPerMinute: 5  // Max violations to log per minute
    };
    
    this.speechTimer = null;
    this.lastViolationTime = 0;
    this.violationCounts = new Map(); // Track violations per type
    this.audioHistory = [];
    this.maxHistoryLength = 300; // 30 seconds at 100ms intervals
  }

  async start() {
    try {
      // Request microphone with optimal settings
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // Don't auto-adjust - we need raw levels
          sampleRate: 16000
        }
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create analyser node for frequency analysis
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;
      source.connect(this.analyser);
      
      // Prepare data array
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isMonitoring = true;
      this.startMonitoringLoop();
      
      console.log('🎤 Audio monitoring started successfully');
      return true;
      
    } catch (err) {
      console.warn('⚠️ Microphone permission denied or unavailable. Continuing without audio.');
      this.emit('Error', { message: err.message, code: err.name });
      return false;
    }
  }

  stop() {
    this.isMonitoring = false;
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    if (this.speechTimer) {
      clearTimeout(this.speechTimer);
      this.speechTimer = null;
    }
    
    this.violationCounts.clear();
    console.log('⏹️ Audio monitoring stopped');
  }

  startMonitoringLoop() {
    const analyze = () => {
      if (!this.isMonitoring) return;
      
      try {
        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate audio metrics
        const average = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;
        const peak = Math.max(...this.dataArray);
        
        // Convert to dB
        const avgDB = this.frequencyToDB(average);
        const peakDB = this.frequencyToDB(peak);
        
        // Add to history
        this.audioHistory.push({
          timestamp: Date.now(),
          avgDB,
          peakDB
        });
        
        // Keep history limited
        if (this.audioHistory.length > this.maxHistoryLength) {
          this.audioHistory.shift();
        }
        
        // Emit audio level for UI
        this.emit('AudioLevel', { average: avgDB, peak: peakDB });
        
        // Run detections
        this.detectSpeech(avgDB);
        this.detectLoudNoise(peakDB);
        this.detectSilence(avgDB);
        this.detectMultipleSpeakers();
        
      } catch (err) {
        console.error('Audio analysis error:', err);
      }
      
      // Schedule next analysis
      setTimeout(analyze, this.config.sampleRate);
    };
    
    analyze();
  }

  /**
   * Check if we should log a violation (rate limiting)
   */
  shouldLogViolation(violationType) {
    const now = Date.now();
    const lastTime = this.violationCounts.get(violationType)?.lastTime || 0;
    const count = this.violationCounts.get(violationType)?.count || 0;
    
    // Reset counts every minute
    if (now - lastTime > 60000) {
      this.violationCounts.set(violationType, { count: 1, lastTime: now });
      return true;
    }
    
    // Check if under limit
    if (count < this.config.maxViolationsPerMinute) {
      this.violationCounts.set(violationType, { count: count + 1, lastTime });
      return true;
    }
    
    return false;
  }

  detectSpeech(levelDB) {
    const now = Date.now();
    
    if (levelDB > this.config.speechThreshold) {
      // Speech detected - start timer to ensure it's sustained
      if (!this.speechTimer) {
        this.speechTimer = setTimeout(() => {
          // Sustained speech confirmed
          const duration = this.config.minSpeechDuration;
          this.emit('SpeechDetected', {
            level: levelDB,
            duration: duration,
            timestamp: now
          });
          
          // Log violation with rate limiting
          if (this.shouldLogViolation('speech') && now - this.lastViolationTime > this.config.debounceTime) {
            this.emit('Violation', {
              type: 'speech_detected',
              severity: 'medium',
              level: levelDB,
              message: 'Speech detected during exam',
              metadata: { level: levelDB, duration }
            });
            this.lastViolationTime = now;
          }
          
          this.speechTimer = null;
        }, this.config.minSpeechDuration);
      }
    } else {
      // No speech - clear timer
      if (this.speechTimer) {
        clearTimeout(this.speechTimer);
        this.speechTimer = null;
      }
    }
  }

  detectLoudNoise(peakDB) {
    const now = Date.now();
    
    if (peakDB > this.config.loudThreshold) {
      if (this.shouldLogViolation('loud') && now - this.lastViolationTime > this.config.debounceTime) {
        this.emit('LoudNoise', {
          level: peakDB,
          timestamp: now
        });
        
        this.emit('Violation', {
          type: 'loud_noise',
          severity: 'high',
          level: peakDB,
          message: `Suspicious loud noise detected (${peakDB.toFixed(1)} dB)`,
          metadata: { level: peakDB }
        });
        
        this.lastViolationTime = now;
      }
    }
  }

  detectSilence(levelDB) {
    const now = Date.now();
    const silenceThreshold = 10000; // 10 seconds
    
    // Find last non-silence event
    const lastNonSilence = [...this.audioHistory].reverse().find(
      h => h.avgDB > this.config.silenceThreshold
    );
    
    if (lastNonSilence && (now - lastNonSilence.timestamp) > silenceThreshold) {
      if (this.shouldLogViolation('silence')) {
        this.emit('Violation', {
          type: 'prolonged_silence',
          severity: 'medium',
          duration: Math.floor((now - lastNonSilence.timestamp) / 1000),
          message: 'No audio detected for extended period - you may have left',
          metadata: { duration: Math.floor((now - lastNonSilence.timestamp) / 1000) }
        });
        
        // Clear history to prevent repeated alerts
        this.audioHistory = this.audioHistory.slice(-10);
      }
    }
  }

  detectMultipleSpeakers() {
    if (this.audioHistory.length < 20) return;
    
    // Get recent audio levels
    const recent = this.audioHistory.slice(-20);
    const levels = recent.map(h => h.avgDB);
    
    // Calculate variance in audio levels
    const mean = levels.reduce((a, b) => a + b, 0) / levels.length;
    const variance = levels.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / levels.length;
    
    // High variance suggests multiple speakers (different volumes/pitches)
    if (variance > 150 && mean > this.config.speechThreshold) {
      if (this.shouldLogViolation('multiple')) {
        this.emit('Violation', {
          type: 'multiple_speakers',
          severity: 'high',
          variance: variance,
          message: 'Multiple speakers detected - possible cheating',
          metadata: { variance, mean }
        });
      }
    }
  }

  frequencyToDB(value) {
    // Convert frequency value (0-255) to approximate decibels (-100 to 0)
    return (value / 255) * 100 - 100;
  }

  getStats() {
    if (this.audioHistory.length === 0) {
      return { 
        averageLevel: -100, 
        peakLevel: -100, 
        activity: 0,
        isActive: false
      };
    }
    
    const last10 = this.audioHistory.slice(-10);
    const avgLevel = last10.reduce((sum, h) => sum + h.avgDB, 0) / last10.length;
    const peakLevel = Math.max(...last10.map(h => h.peakDB));
    const activity = last10.filter(h => h.avgDB > this.config.speechThreshold).length / last10.length;
    
    return {
      averageLevel: avgLevel,
      peakLevel: peakLevel,
      activity: activity * 100, // percentage
      isActive: avgLevel > this.config.speechThreshold
    };
  }

  emit(eventName, data) {
    if (this.callbacks[eventName]) {
      this.callbacks[eventName].forEach(cb => cb(data));
    }
  }

  on(eventName, callback) {
    if (!this.callbacks[eventName]) {
      this.callbacks[eventName] = [];
    }
    this.callbacks[eventName].push(callback);
  }

  off(eventName, callback) {
    if (this.callbacks[eventName]) {
      this.callbacks[eventName] = this.callbacks[eventName].filter(cb => cb !== callback);
    }
  }
}

export default AudioMonitor;