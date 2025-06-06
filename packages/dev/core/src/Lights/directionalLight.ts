import { serialize } from "../Misc/decorators";
import type { Camera } from "../Cameras/camera";
import type { Scene } from "../scene";
import { Matrix, Vector3 } from "../Maths/math.vector";
import { Node } from "../node";
import type { AbstractMesh } from "../Meshes/abstractMesh";
import { Light } from "./light";
import { ShadowLight } from "./shadowLight";
import type { Effect } from "../Materials/effect";
import { RegisterClass } from "../Misc/typeStore";
import type { Nullable } from "../types";
import { Constants } from "core/Engines/constants";

Node.AddNodeConstructor("Light_Type_1", (name, scene) => {
    return () => new DirectionalLight(name, Vector3.Zero(), scene);
});

/**
 * A directional light is defined by a direction (what a surprise!).
 * The light is emitted from everywhere in the specified direction, and has an infinite range.
 * An example of a directional light is when a distance planet is lit by the apparently parallel lines of light from its sun. Light in a downward direction will light the top of an object.
 * Documentation: https://doc.babylonjs.com/features/featuresDeepDive/lights/lights_introduction
 */
export class DirectionalLight extends ShadowLight {
    private _shadowFrustumSize = 0;
    /**
     * Fix frustum size for the shadow generation. This is disabled if the value is 0.
     */
    @serialize()
    public get shadowFrustumSize(): number {
        return this._shadowFrustumSize;
    }
    /**
     * Specifies a fix frustum size for the shadow generation.
     */
    public set shadowFrustumSize(value: number) {
        this._shadowFrustumSize = value;
        this.forceProjectionMatrixCompute();
    }

    private _shadowOrthoScale = 0.1;
    /**
     * Gets the shadow projection scale against the optimal computed one.
     * 0.1 by default which means that the projection window is increase by 10% from the optimal size.
     * This does not impact in fixed frustum size (shadowFrustumSize being set)
     */
    @serialize()
    public get shadowOrthoScale(): number {
        return this._shadowOrthoScale;
    }
    /**
     * Sets the shadow projection scale against the optimal computed one.
     * 0.1 by default which means that the projection window is increase by 10% from the optimal size.
     * This does not impact in fixed frustum size (shadowFrustumSize being set)
     */
    public set shadowOrthoScale(value: number) {
        this._shadowOrthoScale = value;
        this.forceProjectionMatrixCompute();
    }

    /**
     * Automatically compute the projection matrix to best fit (including all the casters)
     * on each frame.
     */
    @serialize()
    public autoUpdateExtends = true;

    /**
     * Automatically compute the shadowMinZ and shadowMaxZ for the projection matrix to best fit (including all the casters)
     * on each frame. autoUpdateExtends must be set to true for this to work
     */
    @serialize()
    public autoCalcShadowZBounds = false;

    // Cache
    @serialize("orthoLeft")
    private _orthoLeft = Number.MAX_VALUE;
    @serialize("orthoRight")
    private _orthoRight = Number.MIN_VALUE;
    @serialize("orthoTop")
    private _orthoTop = Number.MIN_VALUE;
    @serialize("orthoBottom")
    private _orthoBottom = Number.MAX_VALUE;

    /**
     * Gets or sets the orthoLeft property used to build the light frustum
     */
    public get orthoLeft(): number {
        return this._orthoLeft;
    }

    public set orthoLeft(left: number) {
        this._orthoLeft = left;
    }

    /**
     * Gets or sets the orthoRight property used to build the light frustum
     */
    public get orthoRight(): number {
        return this._orthoRight;
    }

    public set orthoRight(right: number) {
        this._orthoRight = right;
    }

    /**
     * Gets or sets the orthoTop property used to build the light frustum
     */
    public get orthoTop(): number {
        return this._orthoTop;
    }

    public set orthoTop(top: number) {
        this._orthoTop = top;
    }

    /**
     * Gets or sets the orthoBottom property used to build the light frustum
     */
    public get orthoBottom(): number {
        return this._orthoBottom;
    }

    public set orthoBottom(bottom: number) {
        this._orthoBottom = bottom;
    }

    /**
     * Creates a DirectionalLight object in the scene, oriented towards the passed direction (Vector3).
     * The directional light is emitted from everywhere in the given direction.
     * It can cast shadows.
     * Documentation : https://doc.babylonjs.com/features/featuresDeepDive/lights/lights_introduction
     * @param name The friendly name of the light
     * @param direction The direction of the light
     * @param scene The scene the light belongs to
     */
    constructor(name: string, direction: Vector3, scene?: Scene) {
        super(name, scene);
        this.position = direction.scale(-1.0);
        this.direction = direction;
    }

    /**
     * Returns the string "DirectionalLight".
     * @returns The class name
     */
    public override getClassName(): string {
        return "DirectionalLight";
    }

    /**
     * Returns the integer 1.
     * @returns The light Type id as a constant defines in Light.LIGHTTYPEID_x
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public override getTypeID(): number {
        return Light.LIGHTTYPEID_DIRECTIONALLIGHT;
    }

    /**
     * Sets the passed matrix "matrix" as projection matrix for the shadows cast by the light according to the passed view matrix.
     * Returns the DirectionalLight Shadow projection matrix.
     * @param matrix
     * @param viewMatrix
     * @param renderList
     */
    protected _setDefaultShadowProjectionMatrix(matrix: Matrix, viewMatrix: Matrix, renderList: Array<AbstractMesh>): void {
        if (this.shadowFrustumSize > 0) {
            this._setDefaultFixedFrustumShadowProjectionMatrix(matrix);
        } else {
            this._setDefaultAutoExtendShadowProjectionMatrix(matrix, viewMatrix, renderList);
        }
    }

    /**
     * Sets the passed matrix "matrix" as fixed frustum projection matrix for the shadows cast by the light according to the passed view matrix.
     * Returns the DirectionalLight Shadow projection matrix.
     * @param matrix
     */
    protected _setDefaultFixedFrustumShadowProjectionMatrix(matrix: Matrix): void {
        const activeCamera = this.getScene().activeCamera;

        if (!activeCamera) {
            return;
        }

        Matrix.OrthoLHToRef(
            this.shadowFrustumSize,
            this.shadowFrustumSize,
            this.shadowMinZ !== undefined ? this.shadowMinZ : activeCamera.minZ,
            this.shadowMaxZ !== undefined ? this.shadowMaxZ : activeCamera.maxZ,
            matrix,
            this.getScene().getEngine().isNDCHalfZRange
        );
    }

    /**
     * Sets the passed matrix "matrix" as auto extend projection matrix for the shadows cast by the light according to the passed view matrix.
     * Returns the DirectionalLight Shadow projection matrix.
     * @param matrix
     * @param viewMatrix
     * @param renderList
     */
    protected _setDefaultAutoExtendShadowProjectionMatrix(matrix: Matrix, viewMatrix: Matrix, renderList: Array<AbstractMesh>): void {
        const activeCamera = this.getScene().activeCamera;

        // Check extends
        if (this.autoUpdateExtends || this._orthoLeft === Number.MAX_VALUE) {
            const tempVector3 = Vector3.Zero();

            this._orthoLeft = Number.MAX_VALUE;
            this._orthoRight = -Number.MAX_VALUE;
            this._orthoTop = -Number.MAX_VALUE;
            this._orthoBottom = Number.MAX_VALUE;

            let shadowMinZ = Number.MAX_VALUE;
            let shadowMaxZ = -Number.MAX_VALUE;

            for (let meshIndex = 0; meshIndex < renderList.length; meshIndex++) {
                const mesh = renderList[meshIndex];

                if (!mesh) {
                    continue;
                }

                const boundingInfo = mesh.getBoundingInfo();
                const boundingBox = boundingInfo.boundingBox;

                for (let index = 0; index < boundingBox.vectorsWorld.length; index++) {
                    Vector3.TransformCoordinatesToRef(boundingBox.vectorsWorld[index], viewMatrix, tempVector3);

                    if (tempVector3.x < this._orthoLeft) {
                        this._orthoLeft = tempVector3.x;
                    }
                    if (tempVector3.y < this._orthoBottom) {
                        this._orthoBottom = tempVector3.y;
                    }

                    if (tempVector3.x > this._orthoRight) {
                        this._orthoRight = tempVector3.x;
                    }
                    if (tempVector3.y > this._orthoTop) {
                        this._orthoTop = tempVector3.y;
                    }
                    if (this.autoCalcShadowZBounds) {
                        if (tempVector3.z < shadowMinZ) {
                            shadowMinZ = tempVector3.z;
                        }
                        if (tempVector3.z > shadowMaxZ) {
                            shadowMaxZ = tempVector3.z;
                        }
                    }
                }
            }

            if (this.autoCalcShadowZBounds) {
                this._shadowMinZ = shadowMinZ;
                this._shadowMaxZ = shadowMaxZ;
            }
        }

        const xOffset = this._orthoRight - this._orthoLeft;
        const yOffset = this._orthoTop - this._orthoBottom;

        const minZ = this.shadowMinZ !== undefined ? this.shadowMinZ : activeCamera?.minZ || Constants.ShadowMinZ;
        const maxZ = this.shadowMaxZ !== undefined ? this.shadowMaxZ : activeCamera?.maxZ || Constants.ShadowMaxZ;

        const useReverseDepthBuffer = this.getScene().getEngine().useReverseDepthBuffer;

        Matrix.OrthoOffCenterLHToRef(
            this._orthoLeft - xOffset * this.shadowOrthoScale,
            this._orthoRight + xOffset * this.shadowOrthoScale,
            this._orthoBottom - yOffset * this.shadowOrthoScale,
            this._orthoTop + yOffset * this.shadowOrthoScale,
            useReverseDepthBuffer ? maxZ : minZ,
            useReverseDepthBuffer ? minZ : maxZ,
            matrix,
            this.getScene().getEngine().isNDCHalfZRange
        );
    }

    protected _buildUniformLayout(): void {
        this._uniformBuffer.addUniform("vLightData", 4);
        this._uniformBuffer.addUniform("vLightDiffuse", 4);
        this._uniformBuffer.addUniform("vLightSpecular", 4);
        this._uniformBuffer.addUniform("shadowsInfo", 3);
        this._uniformBuffer.addUniform("depthValues", 2);
        this._uniformBuffer.create();
    }

    /**
     * Sets the passed Effect object with the DirectionalLight transformed position (or position if not parented) and the passed name.
     * @param effect The effect to update
     * @param lightIndex The index of the light in the effect to update
     * @returns The directional light
     */
    public transferToEffect(effect: Effect, lightIndex: string): DirectionalLight {
        if (this.computeTransformedInformation()) {
            this._uniformBuffer.updateFloat4("vLightData", this.transformedDirection.x, this.transformedDirection.y, this.transformedDirection.z, 1, lightIndex);
            return this;
        }
        this._uniformBuffer.updateFloat4("vLightData", this.direction.x, this.direction.y, this.direction.z, 1, lightIndex);
        return this;
    }

    public transferToNodeMaterialEffect(effect: Effect, lightDataUniformName: string): Light {
        if (this.computeTransformedInformation()) {
            effect.setFloat3(lightDataUniformName, this.transformedDirection.x, this.transformedDirection.y, this.transformedDirection.z);
            return this;
        }

        effect.setFloat3(lightDataUniformName, this.direction.x, this.direction.y, this.direction.z);
        return this;
    }

    /**
     * Gets the minZ used for shadow according to both the scene and the light.
     *
     * Values are fixed on directional lights as it relies on an ortho projection hence the need to convert being
     * -1 and 1 to 0 and 1 doing (depth + min) / (min + max) -> (depth + 1) / (1 + 1) -> (depth * 0.5) + 0.5.
     * (when not using reverse depth buffer / NDC half Z range)
     * @param _activeCamera The camera we are returning the min for (not used)
     * @returns the depth min z
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public override getDepthMinZ(_activeCamera: Nullable<Camera>): number {
        const engine = this._scene.getEngine();
        return !engine.useReverseDepthBuffer && engine.isNDCHalfZRange ? 0 : 1;
    }

    /**
     * Gets the maxZ used for shadow according to both the scene and the light.
     *
     * Values are fixed on directional lights as it relies on an ortho projection hence the need to convert being
     * -1 and 1 to 0 and 1 doing (depth + min) / (min + max) -> (depth + 1) / (1 + 1) -> (depth * 0.5) + 0.5.
     * (when not using reverse depth buffer / NDC half Z range)
     * @param _activeCamera The camera we are returning the max for
     * @returns the depth max z
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public override getDepthMaxZ(_activeCamera: Nullable<Camera>): number {
        const engine = this._scene.getEngine();
        return engine.useReverseDepthBuffer && engine.isNDCHalfZRange ? 0 : 1;
    }

    /**
     * Prepares the list of defines specific to the light type.
     * @param defines the list of defines
     * @param lightIndex defines the index of the light for the effect
     */
    public prepareLightSpecificDefines(defines: any, lightIndex: number): void {
        defines["DIRLIGHT" + lightIndex] = true;
    }
}

// Register Class Name
RegisterClass("BABYLON.DirectionalLight", DirectionalLight);
