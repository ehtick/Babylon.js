import type { Nullable } from "../types";
import { Vector2, Vector3 } from "../Maths/math.vector";
import type { AbstractMesh } from "../Meshes/abstractMesh";
import type { ImageProcessingConfiguration } from "../Materials/imageProcessingConfiguration";
import { ImageProcessingConfigurationDefines } from "../Materials/imageProcessingConfiguration.defines";
import type { ColorGradient, FactorGradient, Color3Gradient, IValueGradient } from "../Misc/gradients";
import type { BoxParticleEmitter } from "../Particles/EmitterTypes/boxParticleEmitter";
import { Constants } from "../Engines/constants";
import type { BaseTexture } from "../Materials/Textures/baseTexture";
import { Color4 } from "../Maths/math.color";
import type { AbstractEngine } from "../Engines/abstractEngine";

import "../Engines/Extensions/engine.dynamicBuffer";
import type { IClipPlanesHolder } from "../Misc/interfaces/iClipPlanesHolder";
import type { Plane } from "../Maths/math.plane";
import type { Animation } from "../Animations/animation";
import type { Scene } from "../scene";
import type { ProceduralTexture } from "../Materials/Textures/Procedurals/proceduralTexture";
import type { RawTexture } from "../Materials/Textures/rawTexture";
import type { IParticleEmitterType } from "./EmitterTypes/IParticleEmitterType";
import type { PointParticleEmitter } from "./EmitterTypes/pointParticleEmitter";
import type { HemisphericParticleEmitter } from "./EmitterTypes/hemisphericParticleEmitter";
import type { SphereDirectedParticleEmitter, SphereParticleEmitter } from "./EmitterTypes/sphereParticleEmitter";
import type { CylinderDirectedParticleEmitter, CylinderParticleEmitter } from "./EmitterTypes/cylinderParticleEmitter";
import type { ConeDirectedParticleEmitter, ConeParticleEmitter } from "./EmitterTypes/coneParticleEmitter";
import { RegisterClass } from "../Misc/typeStore";

/**
 * This represents the base class for particle system in Babylon.
 * Particles are often small sprites used to simulate hard-to-reproduce phenomena like fire, smoke, water, or abstract visual effects like magic glitter and faery dust.
 * Particles can take different shapes while emitted like box, sphere, cone or you can write your custom function.
 * @example https://doc.babylonjs.com/features/featuresDeepDive/particles/particle_system/particle_system_intro
 */
export class BaseParticleSystem implements IClipPlanesHolder {
    /**
     * Source color is added to the destination color without alpha affecting the result. Great for additive glow effects (fire, magic, lasers)
     */
    public static BLENDMODE_ONEONE = 0;
    /**
     * Blend current color and particle color using particle’s alpha. Same as Constants.ALPHA_COMBINE, the go-to for transparency. 100% alpha means source, 0% alpha means background. Glass, UI fade, smoke
     */
    public static BLENDMODE_STANDARD = 1;
    /**
     * Add current color and particle color multiplied by particle’s alpha
     */
    public static BLENDMODE_ADD = 2;
    /**
     * Multiply current color with particle color
     */
    public static BLENDMODE_MULTIPLY = 3;
    /**
     * Multiply current color with particle color then add current color and particle color multiplied by particle’s alpha
     */
    public static BLENDMODE_MULTIPLYADD = 4;
    /**
     * Subtracts source (particle) from destination (current color), leading to darker results
     * - NOTE: Init as -1 so we can properly map all modes to Engine Const's (otherwise ALPHA_SUBTRACT will conflict with BLENDMODE_MULTIPLY since both use 3)
     */
    public static BLENDMODE_SUBTRACT = -1;

    /**
     * List of animations used by the particle system.
     */
    public animations: Animation[] = [];

    /**
     * Gets or sets the unique id of the particle system
     */
    public uniqueId: number;

    /**
     * The id of the Particle system.
     */
    public id: string;

    /**
     * The friendly name of the Particle system.
     */
    public name: string;

    /**
     * Snippet ID if the particle system was created from the snippet server
     */
    public snippetId: string;

    /**
     * The rendering group used by the Particle system to chose when to render.
     */
    public renderingGroupId = 0;

    /**
     * The emitter represents the Mesh or position we are attaching the particle system to.
     */
    public emitter: Nullable<AbstractMesh | Vector3> = Vector3.Zero();

    /**
     * The maximum number of particles to emit per frame
     */
    public emitRate = 10;

    /**
     * If you want to launch only a few particles at once, that can be done, as well.
     */
    public manualEmitCount = -1;

    /**
     * The overall motion speed (0.01 is default update speed, faster updates = faster animation)
     */
    public updateSpeed = 0.01;

    /** @internal */
    public _targetStopDuration = 0;
    /**
     * The amount of time the particle system is running (depends of the overall update speed).
     */
    public get targetStopDuration() {
        return this._targetStopDuration;
    }

    public set targetStopDuration(value: number) {
        if (this._targetStopDuration === value) {
            return;
        }

        this._targetStopDuration = value;
    }

    /**
     * Specifies whether the particle system will be disposed once it reaches the end of the animation.
     */
    public disposeOnStop = false;

    /**
     * Minimum power of emitting particles.
     */
    public minEmitPower = 1;
    /**
     * Maximum power of emitting particles.
     */
    public maxEmitPower = 1;

    /**
     * Minimum life time of emitting particles.
     */
    public minLifeTime = 1;
    /**
     * Maximum life time of emitting particles.
     */
    public maxLifeTime = 1;

    /**
     * Minimum Size of emitting particles.
     */
    public minSize = 1;
    /**
     * Maximum Size of emitting particles.
     */
    public maxSize = 1;

    /**
     * Minimum scale of emitting particles on X axis.
     */
    public minScaleX = 1;
    /**
     * Maximum scale of emitting particles on X axis.
     */
    public maxScaleX = 1;

    /**
     * Minimum scale of emitting particles on Y axis.
     */
    public minScaleY = 1;
    /**
     * Maximum scale of emitting particles on Y axis.
     */
    public maxScaleY = 1;

    /**
     * Gets or sets the minimal initial rotation in radians.
     */
    public minInitialRotation = 0;
    /**
     * Gets or sets the maximal initial rotation in radians.
     */
    public maxInitialRotation = 0;

    /**
     * Minimum angular speed of emitting particles (Z-axis rotation for each particle).
     */
    public minAngularSpeed = 0;
    /**
     * Maximum angular speed of emitting particles (Z-axis rotation for each particle).
     */
    public maxAngularSpeed = 0;

    /**
     * The texture used to render each particle. (this can be a spritesheet)
     */
    public particleTexture: Nullable<BaseTexture>;

    /**
     * The layer mask we are rendering the particles through.
     */
    public layerMask: number = 0x0fffffff;

    /**
     * This can help using your own shader to render the particle system.
     * The according effect will be created
     */
    public customShader: any = null;

    /**
     * By default particle system starts as soon as they are created. This prevents the
     * automatic start to happen and let you decide when to start emitting particles.
     */
    public preventAutoStart: boolean = false;

    /**
     * Gets or sets a boolean indicating that this particle system will allow fog to be rendered on it (false by default)
     */
    public applyFog = false;

    /** @internal */
    _wasDispatched = false;

    protected _rootUrl = "";
    protected _noiseTexture: Nullable<ProceduralTexture>;

    /**
     * Returns true if the particle system was generated by a node particle system set
     */
    public get isNodeGenerated(): boolean {
        return false;
    }

    /**
     * Gets or sets a texture used to add random noise to particle positions
     */
    public get noiseTexture(): Nullable<ProceduralTexture> {
        return this._noiseTexture;
    }

    public set noiseTexture(value: Nullable<ProceduralTexture>) {
        if (this._noiseTexture === value) {
            return;
        }

        this._noiseTexture = value;
        this._reset();
    }

    /** Gets or sets the strength to apply to the noise value (default is (10, 10, 10)) */
    public noiseStrength = new Vector3(10, 10, 10);

    /**
     * Callback triggered when the particle animation is ending.
     */
    public onAnimationEnd: Nullable<() => void> = null;

    /**
     * Blend mode use to render the particle
     * For original blend modes which are exposed from ParticleSystem (OneOne, Standard, Add, Multiply, MultiplyAdd, and Subtract), use ParticleSystem.BLENDMODE_FOO
     * For all other blend modes, use Engine Constants.ALPHA_FOO blend modes
     */
    public blendMode = BaseParticleSystem.BLENDMODE_ONEONE;

    /**
     * Forces the particle to write their depth information to the depth buffer. This can help preventing other draw calls
     * to override the particles.
     */
    public forceDepthWrite = false;

    /** Gets or sets a value indicating how many cycles (or frames) must be executed before first rendering (this value has to be set before starting the system). Default is 0 */
    public preWarmCycles = 0;

    /** Gets or sets a value indicating the time step multiplier to use in pre-warm mode (default is 1) */
    public preWarmStepOffset = 1;

    /**
     * If using a spritesheet (isAnimationSheetEnabled) defines the speed of the sprite loop (default is 1 meaning the animation will play once during the entire particle lifetime)
     */
    public spriteCellChangeSpeed = 1;
    /**
     * If using a spritesheet (isAnimationSheetEnabled) defines the first sprite cell to display
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public startSpriteCellID = 0;
    /**
     * If using a spritesheet (isAnimationSheetEnabled) defines the last sprite cell to display
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public endSpriteCellID = 0;
    /**
     * If using a spritesheet (isAnimationSheetEnabled), defines the sprite cell width to use
     */
    public spriteCellWidth = 0;
    /**
     * If using a spritesheet (isAnimationSheetEnabled), defines the sprite cell height to use
     */
    public spriteCellHeight = 0;
    /**
     * If using a spritesheet (isAnimationSheetEnabled), defines wether the sprite animation is looping
     */
    public spriteCellLoop = true;
    /**
     * This allows the system to random pick the start cell ID between startSpriteCellID and endSpriteCellID
     */
    public spriteRandomStartCell = false;

    /** Gets or sets a Vector2 used to move the pivot (by default (0,0)) */
    public translationPivot = new Vector2(0, 0);

    protected _animationSheetEnabled = false;
    /** @internal */
    public get _isAnimationSheetEnabled() {
        return this._animationSheetEnabled;
    }

    public set _isAnimationSheetEnabled(value: boolean) {
        if (this._animationSheetEnabled === value) {
            return;
        }

        this._animationSheetEnabled = value;
    }

    /**
     * Gets or sets a boolean indicating that hosted animations (in the system.animations array) must be started when system.start() is called
     */
    public beginAnimationOnStart = false;

    /**
     * Gets or sets the frame to start the animation from when beginAnimationOnStart is true
     */
    public beginAnimationFrom = 0;

    /**
     * Gets or sets the frame to end the animation on when beginAnimationOnStart is true
     */
    public beginAnimationTo = 60;

    /**
     * Gets or sets a boolean indicating if animations must loop when beginAnimationOnStart is true
     */
    public beginAnimationLoop = false;

    /**
     * Gets or sets a world offset applied to all particles
     */
    public worldOffset = new Vector3(0, 0, 0);

    /**
     * Gets or sets the active clipplane 1
     */
    public clipPlane: Nullable<Plane>;

    /**
     * Gets or sets the active clipplane 2
     */
    public clipPlane2: Nullable<Plane>;

    /**
     * Gets or sets the active clipplane 3
     */
    public clipPlane3: Nullable<Plane>;

    /**
     * Gets or sets the active clipplane 4
     */
    public clipPlane4: Nullable<Plane>;

    /**
     * Gets or sets the active clipplane 5
     */
    public clipPlane5: Nullable<Plane>;

    /**
     * Gets or sets the active clipplane 6
     */
    public clipPlane6: Nullable<Plane>;

    /**
     * Gets or sets whether an animation sprite sheet is enabled or not on the particle system
     */
    public get isAnimationSheetEnabled(): boolean {
        return this._isAnimationSheetEnabled;
    }

    public set isAnimationSheetEnabled(value: boolean) {
        if (this._isAnimationSheetEnabled == value) {
            return;
        }

        this._isAnimationSheetEnabled = value;

        this._reset();
    }

    private _useLogarithmicDepth: boolean = false;

    /**
     * Gets or sets a boolean enabling the use of logarithmic depth buffers, which is good for wide depth buffers.
     */
    public get useLogarithmicDepth(): boolean {
        return this._useLogarithmicDepth;
    }

    public set useLogarithmicDepth(value: boolean) {
        this._useLogarithmicDepth = value && this.getScene()!.getEngine().getCaps().fragmentDepthSupported;
    }

    /**
     * Get hosting scene
     * @returns the scene
     */
    public getScene(): Nullable<Scene> {
        return this._scene;
    }

    /**
     * You can use gravity if you want to give an orientation to your particles.
     */
    public gravity = Vector3.Zero();

    /** @internal */
    public _colorGradients: Nullable<Array<ColorGradient>> = null;
    /** @internal */
    public _sizeGradients: Nullable<Array<FactorGradient>> = null;
    /** @internal */
    public _lifeTimeGradients: Nullable<Array<FactorGradient>> = null;
    /** @internal */
    public _angularSpeedGradients: Nullable<Array<FactorGradient>> = null;
    /** @internal */
    public _velocityGradients: Nullable<Array<FactorGradient>> = null;
    /** @internal */
    public _limitVelocityGradients: Nullable<Array<FactorGradient>> = null;
    /** @internal */
    public _dragGradients: Nullable<Array<FactorGradient>> = null;
    protected _emitRateGradients: Nullable<Array<FactorGradient>> = null;
    /** @internal */
    public _startSizeGradients: Nullable<Array<FactorGradient>> = null;
    protected _rampGradients: Nullable<Array<Color3Gradient>> = null;
    /** @internal */
    public _colorRemapGradients: Nullable<Array<FactorGradient>> = null;
    /** @internal */
    public _alphaRemapGradients: Nullable<Array<FactorGradient>> = null;

    protected _hasTargetStopDurationDependantGradient() {
        return (
            (this._startSizeGradients && this._startSizeGradients.length > 0) ||
            (this._emitRateGradients && this._emitRateGradients.length > 0) ||
            (this._lifeTimeGradients && this._lifeTimeGradients.length > 0)
        );
    }

    protected _setEngineBasedOnBlendMode(blendMode: number): void {
        switch (blendMode) {
            case BaseParticleSystem.BLENDMODE_MULTIPLYADD:
                // Don't want to update engine since there is no equivalent engine alpha mode, instead it gets handled within particleSystem
                return;
            case BaseParticleSystem.BLENDMODE_ADD:
                blendMode = Constants.ALPHA_ADD;
                break;
            case BaseParticleSystem.BLENDMODE_ONEONE:
                blendMode = Constants.ALPHA_ONEONE;
                break;
            case BaseParticleSystem.BLENDMODE_STANDARD:
                blendMode = Constants.ALPHA_COMBINE;
                break;
            case BaseParticleSystem.BLENDMODE_MULTIPLY:
                blendMode = Constants.ALPHA_MULTIPLY;
                break;
            case BaseParticleSystem.BLENDMODE_SUBTRACT:
                blendMode = Constants.ALPHA_SUBTRACT;
                break;
            default:
                // For all other blend modes that were added after the initial particleSystem implementation,
                // the ParticleSystem.BLENDMODE_FOO are already mapped to the underlying Constants.ALPHA_FOO
                break;
        }
        this._engine.setAlphaMode(blendMode);
    }

    /**
     * Defines the delay in milliseconds before starting the system (0 by default)
     */
    public startDelay = 0;

    /**
     * Gets the current list of drag gradients.
     * You must use addDragGradient and removeDragGradient to update this list
     * @returns the list of drag gradients
     */
    public getDragGradients(): Nullable<Array<FactorGradient>> {
        return this._dragGradients;
    }

    /** Gets or sets a value indicating the damping to apply if the limit velocity factor is reached */
    public limitVelocityDamping = 0.4;

    /**
     * Gets the current list of limit velocity gradients.
     * You must use addLimitVelocityGradient and removeLimitVelocityGradient to update this list
     * @returns the list of limit velocity gradients
     */
    public getLimitVelocityGradients(): Nullable<Array<FactorGradient>> {
        return this._limitVelocityGradients;
    }

    /**
     * Gets the current list of color gradients.
     * You must use addColorGradient and removeColorGradient to update this list
     * @returns the list of color gradients
     */
    public getColorGradients(): Nullable<Array<ColorGradient>> {
        return this._colorGradients;
    }

    /**
     * Gets the current list of size gradients.
     * You must use addSizeGradient and removeSizeGradient to update this list
     * @returns the list of size gradients
     */
    public getSizeGradients(): Nullable<Array<FactorGradient>> {
        return this._sizeGradients;
    }

    /**
     * Gets the current list of color remap gradients.
     * You must use addColorRemapGradient and removeColorRemapGradient to update this list
     * @returns the list of color remap gradients
     */
    public getColorRemapGradients(): Nullable<Array<FactorGradient>> {
        return this._colorRemapGradients;
    }

    /**
     * Gets the current list of alpha remap gradients.
     * You must use addAlphaRemapGradient and removeAlphaRemapGradient to update this list
     * @returns the list of alpha remap gradients
     */
    public getAlphaRemapGradients(): Nullable<Array<FactorGradient>> {
        return this._alphaRemapGradients;
    }

    /**
     * Gets the current list of life time gradients.
     * You must use addLifeTimeGradient and removeLifeTimeGradient to update this list
     * @returns the list of life time gradients
     */
    public getLifeTimeGradients(): Nullable<Array<FactorGradient>> {
        return this._lifeTimeGradients;
    }

    /**
     * Gets the current list of angular speed gradients.
     * You must use addAngularSpeedGradient and removeAngularSpeedGradient to update this list
     * @returns the list of angular speed gradients
     */
    public getAngularSpeedGradients(): Nullable<Array<FactorGradient>> {
        return this._angularSpeedGradients;
    }

    /**
     * Gets the current list of velocity gradients.
     * You must use addVelocityGradient and removeVelocityGradient to update this list
     * @returns the list of velocity gradients
     */
    public getVelocityGradients(): Nullable<Array<FactorGradient>> {
        return this._velocityGradients;
    }

    /**
     * Gets the current list of start size gradients.
     * You must use addStartSizeGradient and removeStartSizeGradient to update this list
     * @returns the list of start size gradients
     */
    public getStartSizeGradients(): Nullable<Array<FactorGradient>> {
        return this._startSizeGradients;
    }

    /**
     * Gets the current list of emit rate gradients.
     * You must use addEmitRateGradient and removeEmitRateGradient to update this list
     * @returns the list of emit rate gradients
     */
    public getEmitRateGradients(): Nullable<Array<FactorGradient>> {
        return this._emitRateGradients;
    }

    /**
     * Random direction of each particle after it has been emitted, between direction1 and direction2 vectors.
     * This only works when particleEmitterTyps is a BoxParticleEmitter
     */
    public get direction1(): Vector3 {
        if ((<BoxParticleEmitter>this.particleEmitterType).direction1) {
            return (<BoxParticleEmitter>this.particleEmitterType).direction1;
        }

        return Vector3.Zero();
    }

    public set direction1(value: Vector3) {
        if ((<BoxParticleEmitter>this.particleEmitterType).direction1) {
            (<BoxParticleEmitter>this.particleEmitterType).direction1 = value;
        }
    }

    /**
     * Random direction of each particle after it has been emitted, between direction1 and direction2 vectors.
     * This only works when particleEmitterTyps is a BoxParticleEmitter
     */
    public get direction2(): Vector3 {
        if ((<BoxParticleEmitter>this.particleEmitterType).direction2) {
            return (<BoxParticleEmitter>this.particleEmitterType).direction2;
        }

        return Vector3.Zero();
    }

    public set direction2(value: Vector3) {
        if ((<BoxParticleEmitter>this.particleEmitterType).direction2) {
            (<BoxParticleEmitter>this.particleEmitterType).direction2 = value;
        }
    }

    /**
     * Minimum box point around our emitter. Our emitter is the center of particles source, but if you want your particles to emit from more than one point, then you can tell it to do so.
     * This only works when particleEmitterTyps is a BoxParticleEmitter
     */
    public get minEmitBox(): Vector3 {
        if ((<BoxParticleEmitter>this.particleEmitterType).minEmitBox) {
            return (<BoxParticleEmitter>this.particleEmitterType).minEmitBox;
        }

        return Vector3.Zero();
    }

    public set minEmitBox(value: Vector3) {
        if ((<BoxParticleEmitter>this.particleEmitterType).minEmitBox) {
            (<BoxParticleEmitter>this.particleEmitterType).minEmitBox = value;
        }
    }

    /**
     * Maximum box point around our emitter. Our emitter is the center of particles source, but if you want your particles to emit from more than one point, then you can tell it to do so.
     * This only works when particleEmitterTyps is a BoxParticleEmitter
     */
    public get maxEmitBox(): Vector3 {
        if ((<BoxParticleEmitter>this.particleEmitterType).maxEmitBox) {
            return (<BoxParticleEmitter>this.particleEmitterType).maxEmitBox;
        }

        return Vector3.Zero();
    }

    public set maxEmitBox(value: Vector3) {
        if ((<BoxParticleEmitter>this.particleEmitterType).maxEmitBox) {
            (<BoxParticleEmitter>this.particleEmitterType).maxEmitBox = value;
        }
    }

    /**
     * Random color of each particle after it has been emitted, between color1 and color2 vectors
     */
    public color1 = new Color4(1.0, 1.0, 1.0, 1.0);
    /**
     * Random color of each particle after it has been emitted, between color1 and color2 vectors
     */
    public color2 = new Color4(1.0, 1.0, 1.0, 1.0);
    /**
     * Color the particle will have at the end of its lifetime
     */
    public colorDead = new Color4(0, 0, 0, 1.0);

    /**
     * An optional mask to filter some colors out of the texture, or filter a part of the alpha channel
     */
    public textureMask = new Color4(1.0, 1.0, 1.0, 1.0);

    /**
     * The particle emitter type defines the emitter used by the particle system.
     * It can be for example box, sphere, or cone...
     */
    public particleEmitterType: IParticleEmitterType;

    /** @internal */
    public _isSubEmitter = false;

    /** @internal */
    public _billboardMode = Constants.PARTICLES_BILLBOARDMODE_ALL;
    /**
     * Gets or sets the billboard mode to use when isBillboardBased = true.
     * Value can be: ParticleSystem.BILLBOARDMODE_ALL, ParticleSystem.BILLBOARDMODE_Y, ParticleSystem.BILLBOARDMODE_STRETCHED
     */
    public get billboardMode(): number {
        return this._billboardMode;
    }

    public set billboardMode(value: number) {
        if (this._billboardMode === value) {
            return;
        }

        this._billboardMode = value;
        this._reset();
    }

    /** @internal */
    public _isBillboardBased = true;
    /**
     * Gets or sets a boolean indicating if the particles must be rendered as billboard or aligned with the direction
     */
    public get isBillboardBased(): boolean {
        return this._isBillboardBased;
    }

    public set isBillboardBased(value: boolean) {
        if (this._isBillboardBased === value) {
            return;
        }

        this._isBillboardBased = value;
        this._reset();
    }

    /**
     * The scene the particle system belongs to.
     */
    protected _scene: Nullable<Scene>;

    /**
     * The engine the particle system belongs to.
     */
    protected _engine: AbstractEngine;

    /**
     * Local cache of defines for image processing.
     */
    protected _imageProcessingConfigurationDefines = new ImageProcessingConfigurationDefines();

    /**
     * Default configuration related to image processing available in the standard Material.
     */
    protected _imageProcessingConfiguration: Nullable<ImageProcessingConfiguration>;

    /**
     * Gets the image processing configuration used either in this material.
     */
    public get imageProcessingConfiguration(): Nullable<ImageProcessingConfiguration> {
        return this._imageProcessingConfiguration;
    }

    /**
     * Sets the Default image processing configuration used either in the this material.
     *
     * If sets to null, the scene one is in use.
     */
    public set imageProcessingConfiguration(value: Nullable<ImageProcessingConfiguration>) {
        this._attachImageProcessingConfiguration(value);
    }

    /**
     * Attaches a new image processing configuration to the Standard Material.
     * @param configuration
     */
    protected _attachImageProcessingConfiguration(configuration: Nullable<ImageProcessingConfiguration>): void {
        if (configuration === this._imageProcessingConfiguration) {
            return;
        }

        // Pick the scene configuration if needed.
        if (!configuration && this._scene) {
            this._imageProcessingConfiguration = this._scene.imageProcessingConfiguration;
        } else {
            this._imageProcessingConfiguration = configuration;
        }
    }

    /** @internal */
    protected _reset() {}

    /**
     * @internal
     */
    protected _removeGradientAndTexture(gradient: number, gradients: Nullable<IValueGradient[]>, texture: Nullable<RawTexture>): BaseParticleSystem {
        if (!gradients) {
            return this;
        }

        let index = 0;
        for (const valueGradient of gradients) {
            if (valueGradient.gradient === gradient) {
                gradients.splice(index, 1);
                break;
            }
            index++;
        }

        if (texture) {
            texture.dispose();
        }

        return this;
    }

    /**
     * Instantiates a particle system.
     * Particles are often small sprites used to simulate hard-to-reproduce phenomena like fire, smoke, water, or abstract visual effects like magic glitter and faery dust.
     * @param name The name of the particle system
     */
    public constructor(name: string) {
        this.id = name;
        this.name = name;
    }

    /**
     * Creates a Point Emitter for the particle system (emits directly from the emitter position)
     * @param direction1 Particles are emitted between the direction1 and direction2 from within the box
     * @param direction2 Particles are emitted between the direction1 and direction2 from within the box
     */
    public createPointEmitter(direction1: Vector3, direction2: Vector3): PointParticleEmitter {
        throw new Error("Method not implemented.");
    }

    /**
     * Creates a Hemisphere Emitter for the particle system (emits along the hemisphere radius)
     * @param radius The radius of the hemisphere to emit from
     * @param radiusRange The range of the hemisphere to emit from [0-1] 0 Surface Only, 1 Entire Radius
     */
    public createHemisphericEmitter(radius = 1, radiusRange = 1): HemisphericParticleEmitter {
        throw new Error("Method not implemented.");
    }

    /**
     * Creates a Sphere Emitter for the particle system (emits along the sphere radius)
     * @param radius The radius of the sphere to emit from
     * @param radiusRange The range of the sphere to emit from [0-1] 0 Surface Only, 1 Entire Radius
     */
    public createSphereEmitter(radius = 1, radiusRange = 1): SphereParticleEmitter {
        throw new Error("Method not implemented.");
    }

    /**
     * Creates a Directed Sphere Emitter for the particle system (emits between direction1 and direction2)
     * @param radius The radius of the sphere to emit from
     * @param direction1 Particles are emitted between the direction1 and direction2 from within the sphere
     * @param direction2 Particles are emitted between the direction1 and direction2 from within the sphere
     */
    public createDirectedSphereEmitter(radius = 1, direction1 = new Vector3(0, 1.0, 0), direction2 = new Vector3(0, 1.0, 0)): SphereDirectedParticleEmitter {
        throw new Error("Method not implemented.");
    }

    /**
     * Creates a Cylinder Emitter for the particle system (emits from the cylinder to the particle position)
     * @param radius The radius of the emission cylinder
     * @param height The height of the emission cylinder
     * @param radiusRange The range of emission [0-1] 0 Surface only, 1 Entire Radius
     * @param directionRandomizer How much to randomize the particle direction [0-1]
     */
    public createCylinderEmitter(radius = 1, height = 1, radiusRange = 1, directionRandomizer = 0): CylinderParticleEmitter {
        throw new Error("Method not implemented.");
    }

    /**
     * Creates a Directed Cylinder Emitter for the particle system (emits between direction1 and direction2)
     * @param radius The radius of the cylinder to emit from
     * @param height The height of the emission cylinder
     * @param radiusRange the range of the emission cylinder [0-1] 0 Surface only, 1 Entire Radius (1 by default)
     * @param direction1 Particles are emitted between the direction1 and direction2 from within the cylinder
     * @param direction2 Particles are emitted between the direction1 and direction2 from within the cylinder
     */
    public createDirectedCylinderEmitter(
        radius = 1,
        height = 1,
        radiusRange = 1,
        direction1 = new Vector3(0, 1.0, 0),
        direction2 = new Vector3(0, 1.0, 0)
    ): CylinderDirectedParticleEmitter {
        throw new Error("Method not implemented.");
    }

    /**
     * Creates a Cone Emitter for the particle system (emits from the cone to the particle position)
     * @param radius The radius of the cone to emit from
     * @param angle The base angle of the cone
     */
    public createConeEmitter(radius = 1, angle = Math.PI / 4): ConeParticleEmitter {
        throw new Error("Method not implemented.");
    }

    public createDirectedConeEmitter(radius = 1, angle = Math.PI / 4, direction1 = new Vector3(0, 1.0, 0), direction2 = new Vector3(0, 1.0, 0)): ConeDirectedParticleEmitter {
        throw new Error("Method not implemented.");
    }

    /**
     * Creates a Box Emitter for the particle system. (emits between direction1 and direction2 from withing the box defined by minEmitBox and maxEmitBox)
     * @param direction1 Particles are emitted between the direction1 and direction2 from within the box
     * @param direction2 Particles are emitted between the direction1 and direction2 from within the box
     * @param minEmitBox Particles are emitted from the box between minEmitBox and maxEmitBox
     * @param maxEmitBox  Particles are emitted from the box between minEmitBox and maxEmitBox
     */
    public createBoxEmitter(direction1: Vector3, direction2: Vector3, minEmitBox: Vector3, maxEmitBox: Vector3): BoxParticleEmitter {
        throw new Error("Method not implemented.");
    }
}

// Register Class Name
RegisterClass("BABYLON.BaseParticleSystem", BaseParticleSystem);
