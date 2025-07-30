// AudioService.ts
// This service handles audio recording and processing

import { EventEmitter } from 'events';

export enum AudioEvents {
  RECORDING_START = 'recording_start',
  RECORDING_STOP = 'recording_stop',
  AUDIO_DATA = 'audio_data',
  AUDIO_LEVEL = 'audio_level',
  ERROR = 'error',
}

export interface AudioLevel {
  instant: number; // Instant audio level (0-1)
  slow: number;    // Slow average (0-1)
  clip: boolean;   // Whether the audio is clipping
}

export interface AudioServiceOptions {
  sampleRate?: number;
  channelCount?: number;
  processingInterval?: number;
}

class AudioService extends EventEmitter {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isRecording: boolean = false;
  private audioQueue: Blob[] = [];
  private levelCheckInterval: number | null = null;
  private options: AudioServiceOptions;
  private levelData: AudioLevel = { instant: 0, slow: 0, clip: false };
  private slowMeter: number = 0;
  
  constructor(options?: AudioServiceOptions) {
    super();
    
    this.options = {
      sampleRate: 16000, // 16kHz is good for speech
      channelCount: 1,   // Mono
      processingInterval: 100, // Level check every 100ms
      ...options
    };
  }
  
  /**
   * Request microphone access and initialize audio processing
   */
  public async initialize(): Promise<boolean> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.options.sampleRate,
          channelCount: this.options.channelCount
        },
        video: false
      });
      
      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: this.options.sampleRate
      });
      
      // Create audio source from microphone stream
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Create gain node
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;
      
      // Create analyser for audio levels
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.2;
      
      // Create processor node for raw audio data
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      // Connect nodes: source -> gain -> analyser -> processor -> destination (for analysis only)
      this.source.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      // Process audio data
      this.processor.onaudioprocess = (event) => {
        if (!this.isRecording) return;
        
        // Get audio data from input channel
        const audioData = event.inputBuffer.getChannelData(0);
        
        // Convert float32 array to 16-bit PCM
        const pcmData = this.floatTo16BitPCM(audioData);
        
        // Create blob with PCM data
        const blob = new Blob([pcmData], { type: 'audio/pcm' });
        
        // Emit audio data
        this.emit(AudioEvents.AUDIO_DATA, blob);
      };
      
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      this.emit(AudioEvents.ERROR, {
        code: 'audio_init_failed',
        message: 'Failed to initialize audio capture',
        details: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  /**
   * Start recording audio
   */
  public startRecording(): boolean {
    if (this.isRecording) return true;
    
    if (!this.stream || !this.audioContext || !this.processor) {
      console.error('Audio system not initialized');
      this.emit(AudioEvents.ERROR, {
        code: 'not_initialized',
        message: 'Audio system not initialized'
      });
      return false;
    }
    
    try {
      this.isRecording = true;
      
      // Start audio level monitoring
      this.startLevelMonitoring();
      
      this.emit(AudioEvents.RECORDING_START);
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.emit(AudioEvents.ERROR, {
        code: 'recording_start_failed',
        message: 'Failed to start audio recording',
        details: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  /**
   * Stop recording audio
   */
  public stopRecording(): void {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    
    // Stop audio level monitoring
    this.stopLevelMonitoring();
    
    this.emit(AudioEvents.RECORDING_STOP);
  }
  
  /**
   * Start monitoring audio levels
   */
  private startLevelMonitoring(): void {
    if (!this.analyser || this.levelCheckInterval !== null) return;
    
    // Create buffer for analyser
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    // Update levels at regular intervals
    this.levelCheckInterval = window.setInterval(() => {
      if (!this.analyser) return;
      
      // Get audio levels from analyser
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS (root mean square) of the frequency data
      let sum = 0;
      let clipCount = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i] / 255;
        sum += value * value;
        
        // Count clipping instances
        if (value > 0.95) clipCount++;
      }
      
      const instant = Math.sqrt(sum / dataArray.length);
      
      // Update slow meter with some smoothing
      this.slowMeter = 0.95 * this.slowMeter + 0.05 * instant;
      
      // Update level data
      this.levelData = {
        instant,
        slow: this.slowMeter,
        clip: clipCount > 5
      };
      
      // Emit level update
      this.emit(AudioEvents.AUDIO_LEVEL, this.levelData);
    }, this.options.processingInterval);
  }
  
  /**
   * Stop monitoring audio levels
   */
  private stopLevelMonitoring(): void {
    if (this.levelCheckInterval !== null) {
      clearInterval(this.levelCheckInterval);
      this.levelCheckInterval = null;
    }
  }
  
  /**
   * Convert float32 audio data to 16-bit PCM
   */
  private floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new ArrayBuffer(input.length * 2);
    const view = new DataView(output);
    
    for (let i = 0; i < input.length; i++) {
      // Clamp value between -1 and 1
      const s = Math.max(-1, Math.min(1, input[i]));
      // Convert to 16-bit signed integer
      const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
      // Write to buffer as little-endian
      view.setInt16(i * 2, val, true);
    }
    
    return output;
  }
  
  /**
   * Set microphone gain
   */
  public setGain(value: number): void {
    if (this.gainNode) {
      // Clamp gain between 0 and 2
      this.gainNode.gain.value = Math.max(0, Math.min(2, value));
    }
  }
  
  /**
   * Get current audio level
   */
  public getAudioLevel(): AudioLevel {
    return { ...this.levelData };
  }
  
  /**
   * Check if currently recording
   */
  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
  
  /**
   * Release all resources
   */
  public dispose(): void {
    this.stopRecording();
    
    // Disconnect audio nodes
    if (this.source) this.source.disconnect();
    if (this.gainNode) this.gainNode.disconnect();
    if (this.analyser) this.analyser.disconnect();
    if (this.processor) this.processor.disconnect();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Stop all tracks in the stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    // Clear references
    this.stream = null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.processor = null;
    this.gainNode = null;
    this.source = null;
  }
}

// Create singleton instance
const audioService = new AudioService();
export default audioService;
