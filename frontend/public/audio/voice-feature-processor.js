/**
 * VoiceFeatureProcessor - AudioWorklet for Voice Analysis
 * 
 * Real-time extraction of voice prosody features:
 * - Fundamental Frequency (F0) via Autocorrelation
 * - Jitter: Period-to-period variation
 * - Shimmer: Amplitude-to-amplitude variation
 * 
 * Runs in a separate audio thread to avoid blocking main thread.
 * 
 * Formulas:
 *   Autocorrelation: R[τ] = Σ(n=0 to N-1) x[n] · x[n+τ]
 *   Jitter = (1/(N-1)) × Σ|Ti - Ti+1|
 *   Shimmer = (1/(N-1)) × Σ|Ai - Ai+1|
 */

// Constants
const SAMPLE_RATE = 48000; // Will be updated from AudioWorkletGlobalScope
const BUFFER_SIZE = 2048;  // Samples for analysis (good for ~50-400Hz range)
const QUEUE_SIZE = 50;     // Number of periods to store for Jitter/Shimmer
const UPDATE_RATE = 10;    // Hz - send messages to main thread

// Frequency detection range (human voice)
const MIN_FREQ = 50;  // Hz (bass voice)
const MAX_FREQ = 400; // Hz (soprano/child voice)

// Silence threshold in dB
const SILENCE_THRESHOLD_DB = -50;

/**
 * VoiceFeatureProcessor
 * 
 * AudioWorkletProcessor for real-time voice prosody analysis.
 */
class VoiceFeatureProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        // Actual sample rate from audio context
        this.sampleRate = sampleRate || SAMPLE_RATE;

        // Calculate lag range for pitch detection
        // lag = sampleRate / frequency
        this.minLag = Math.floor(this.sampleRate / MAX_FREQ);
        this.maxLag = Math.ceil(this.sampleRate / MIN_FREQ);

        // Accumulation buffer for analysis
        this.buffer = new Float32Array(BUFFER_SIZE);
        this.bufferIndex = 0;

        // Circular queue for periods and amplitudes
        this.periods = new Float32Array(QUEUE_SIZE);
        this.amplitudes = new Float32Array(QUEUE_SIZE);
        this.queueIndex = 0;
        this.queueCount = 0;

        // Timing for 10Hz update rate
        this.framesSinceLastUpdate = 0;
        this.framesPerUpdate = Math.floor(this.sampleRate / 128 / UPDATE_RATE);

        // Last computed values
        this.lastPitch = 0;
        this.lastJitter = 0;
        this.lastShimmer = 0;
    }

    /**
     * Main processing method - called for every audio block (128 samples)
     */
    process(inputs, outputs, parameters) {
        const input = inputs[0];

        // Check if we have audio input
        if (!input || !input[0] || input[0].length === 0) {
            return true; // Keep processor alive
        }

        // Get mono channel (first channel)
        const samples = input[0];

        // Accumulate samples into buffer
        for (let i = 0; i < samples.length; i++) {
            this.buffer[this.bufferIndex] = samples[i];
            this.bufferIndex = (this.bufferIndex + 1) % BUFFER_SIZE;
        }

        // Update frame counter
        this.framesSinceLastUpdate++;

        // Only process and send at 10Hz rate
        if (this.framesSinceLastUpdate >= this.framesPerUpdate) {
            this.framesSinceLastUpdate = 0;

            // Check for silence
            const rms = this.calculateRMS(this.buffer);
            const db = 20 * Math.log10(rms + 1e-10);

            if (db < SILENCE_THRESHOLD_DB) {
                // Silence detected - send null values
                this.port.postMessage({
                    pitch: null,
                    jitter: null,
                    shimmer: null,
                    isSilent: true,
                    rmsDb: db,
                });
            } else {
                // Perform pitch detection
                const period = this.detectPitch(this.buffer);

                if (period > 0) {
                    // Valid pitch detected
                    const pitch = this.sampleRate / period;
                    const amplitude = this.calculatePeakAmplitude(this.buffer, period);

                    // Add to circular queue
                    this.periods[this.queueIndex] = period;
                    this.amplitudes[this.queueIndex] = amplitude;
                    this.queueIndex = (this.queueIndex + 1) % QUEUE_SIZE;
                    if (this.queueCount < QUEUE_SIZE) this.queueCount++;

                    // Calculate Jitter and Shimmer
                    const jitter = this.calculateJitter();
                    const shimmer = this.calculateShimmer();

                    // Store last values
                    this.lastPitch = pitch;
                    this.lastJitter = jitter;
                    this.lastShimmer = shimmer;

                    // Send to main thread
                    this.port.postMessage({
                        pitch: pitch,
                        jitter: jitter,
                        shimmer: shimmer,
                        period: period,
                        amplitude: amplitude,
                        isSilent: false,
                        rmsDb: db,
                    });
                } else {
                    // Pitch detection failed but not silent
                    this.port.postMessage({
                        pitch: this.lastPitch,
                        jitter: this.lastJitter,
                        shimmer: this.lastShimmer,
                        isSilent: false,
                        rmsDb: db,
                        pitchDetectionFailed: true,
                    });
                }
            }
        }

        return true; // Keep processor alive
    }

    /**
     * Calculate RMS (Root Mean Square) of buffer
     */
    calculateRMS(buffer) {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
        }
        return Math.sqrt(sum / buffer.length);
    }

    /**
     * Detect fundamental pitch using Autocorrelation
     * 
     * Autocorrelation formula:
     *   R[τ] = Σ(n=0 to N-1) x[n] · x[n+τ]
     * 
     * The peak in R[τ] (for τ > 0) corresponds to the period T0.
     * 
     * @returns Period in samples, or 0 if detection failed
     */
    detectPitch(buffer) {
        const n = buffer.length;
        const halfN = Math.floor(n / 2);

        // Calculate autocorrelation for lag range
        let maxCorr = 0;
        let bestLag = 0;

        // Only search in valid frequency range
        const searchMinLag = Math.max(this.minLag, 2);
        const searchMaxLag = Math.min(this.maxLag, halfN);

        for (let lag = searchMinLag; lag < searchMaxLag; lag++) {
            let corr = 0;

            // Autocorrelation sum
            for (let i = 0; i < n - lag; i++) {
                corr += buffer[i] * buffer[i + lag];
            }

            // Normalize by number of samples
            corr /= (n - lag);

            if (corr > maxCorr) {
                maxCorr = corr;
                bestLag = lag;
            }
        }

        // Calculate autocorrelation at lag 0 for normalization
        let r0 = 0;
        for (let i = 0; i < n; i++) {
            r0 += buffer[i] * buffer[i];
        }
        r0 /= n;

        // Check if peak is significant (normalized correlation > 0.3)
        const normalizedCorr = r0 > 0 ? maxCorr / r0 : 0;

        if (normalizedCorr > 0.3 && bestLag >= searchMinLag) {
            return bestLag;
        }

        return 0; // Detection failed
    }

    /**
     * Calculate peak amplitude within one period
     */
    calculatePeakAmplitude(buffer, period) {
        let maxAmp = 0;
        const n = Math.min(period * 2, buffer.length);

        for (let i = 0; i < n; i++) {
            const amp = Math.abs(buffer[i]);
            if (amp > maxAmp) maxAmp = amp;
        }

        return maxAmp;
    }

    /**
     * Calculate Jitter (period-to-period variation)
     * 
     * Jitter = (1/(N-1)) × Σ|Ti - Ti+1|
     * 
     * Returns absolute jitter in samples
     */
    calculateJitter() {
        if (this.queueCount < 2) return 0;

        let sum = 0;
        const count = this.queueCount - 1;

        for (let i = 0; i < count; i++) {
            const idx1 = (this.queueIndex - this.queueCount + i + QUEUE_SIZE) % QUEUE_SIZE;
            const idx2 = (idx1 + 1) % QUEUE_SIZE;
            sum += Math.abs(this.periods[idx1] - this.periods[idx2]);
        }

        return sum / count;
    }

    /**
     * Calculate Shimmer (amplitude-to-amplitude variation)
     * 
     * Shimmer = (1/(N-1)) × Σ|Ai - Ai+1|
     * 
     * Returns absolute shimmer in amplitude units
     */
    calculateShimmer() {
        if (this.queueCount < 2) return 0;

        let sum = 0;
        const count = this.queueCount - 1;

        for (let i = 0; i < count; i++) {
            const idx1 = (this.queueIndex - this.queueCount + i + QUEUE_SIZE) % QUEUE_SIZE;
            const idx2 = (idx1 + 1) % QUEUE_SIZE;
            sum += Math.abs(this.amplitudes[idx1] - this.amplitudes[idx2]);
        }

        return sum / count;
    }
}

// Register the processor
registerProcessor('voice-feature-processor', VoiceFeatureProcessor);
