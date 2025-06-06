import type { AudioEngineV2 } from "./audioEngineV2";

let StaticSoundBufferId = 1;

/**
 * Options for creating a static sound buffer.
 */
export interface IStaticSoundBufferOptions {
    /**
     * Whether to skip codec checking before attempting to load each source URL when `source` is a string array. Defaults to `false`.
     * - Has no effect if the sound's source is not a string array.
     * @see {@link CreateSoundAsync} `source` parameter.
     */
    skipCodecCheck: boolean;
}

/**
 * Options for cloning a static sound buffer.
 * - @see {@link StaticSoundBuffer.clone}.
 */
export interface IStaticSoundBufferCloneOptions {
    /**
     * The name of the cloned sound buffer. Defaults to `StaticSoundBuffer #${id}`.
     */
    name: string;
}

/**
 * Abstract class representing a static sound buffer.
 *
 * A static sound buffer is a fully downloaded and decoded array of audio data that is ready to be played.
 *
 * Static sound buffers can be reused multiple times by different {@link StaticSound} instances.
 *
 * Static sound buffers are created by the {@link CreateSoundBufferAsync} function.
 *
 * @see {@link StaticSound.buffer}
 */
export abstract class StaticSoundBuffer {
    /**
     * The engine that the sound buffer belongs to.
     */
    public readonly engine: AudioEngineV2;

    /**
     * The name of the sound buffer.
     */
    public name: string = `StaticSoundBuffer #${StaticSoundBufferId++}`;

    protected constructor(engine: AudioEngineV2) {
        this.engine = engine;
    }

    /**
     * The sample rate of the sound buffer.
     */
    public abstract readonly sampleRate: number;

    /**
     * The length of the sound buffer, in sample frames.
     */
    public abstract readonly length: number;

    /**
     * The duration of the sound buffer, in seconds.
     */
    public abstract readonly duration: number;

    /**
     * The number of channels in the sound buffer.
     */
    public abstract readonly channelCount: number;

    /**
     * Clones the sound buffer.
     * @param options Options for cloning the sound buffer.
     */
    public abstract clone(options?: Partial<IStaticSoundBufferCloneOptions>): StaticSoundBuffer;
}
