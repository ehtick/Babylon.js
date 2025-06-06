import { NodeMaterialBlock } from "../../nodeMaterialBlock";
import { NodeMaterialBlockConnectionPointTypes } from "../../Enums/nodeMaterialBlockConnectionPointTypes";
import type { NodeMaterialBuildState } from "../../nodeMaterialBuildState";
import type { NodeMaterialConnectionPoint } from "../../nodeMaterialBlockConnectionPoint";
import { NodeMaterialBlockTargets } from "../../Enums/nodeMaterialBlockTargets";
import { RegisterClass } from "../../../../Misc/typeStore";
import { ShaderLanguage } from "core/Materials/shaderLanguage";

/**
 * Block used to make gl_FragCoord available
 */
export class FragCoordBlock extends NodeMaterialBlock {
    /**
     * Creates a new FragCoordBlock
     * @param name defines the block name
     */
    public constructor(name: string) {
        super(name, NodeMaterialBlockTargets.Fragment);

        this.registerOutput("xy", NodeMaterialBlockConnectionPointTypes.Vector2, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("xyz", NodeMaterialBlockConnectionPointTypes.Vector3, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("xyzw", NodeMaterialBlockConnectionPointTypes.Vector4, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("x", NodeMaterialBlockConnectionPointTypes.Float, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("y", NodeMaterialBlockConnectionPointTypes.Float, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("z", NodeMaterialBlockConnectionPointTypes.Float, NodeMaterialBlockTargets.Fragment);
        this.registerOutput("w", NodeMaterialBlockConnectionPointTypes.Float, NodeMaterialBlockTargets.Fragment);
    }

    /**
     * Gets the current class name
     * @returns the class name
     */
    public override getClassName() {
        return "FragCoordBlock";
    }

    /**
     * Gets the xy component
     */
    public get xy(): NodeMaterialConnectionPoint {
        return this._outputs[0];
    }

    /**
     * Gets the xyz component
     */
    public get xyz(): NodeMaterialConnectionPoint {
        return this._outputs[1];
    }

    /**
     * Gets the xyzw component
     */
    public get xyzw(): NodeMaterialConnectionPoint {
        return this._outputs[2];
    }

    /**
     * Gets the x component
     */
    public get x(): NodeMaterialConnectionPoint {
        return this._outputs[3];
    }

    /**
     * Gets the y component
     */
    public get y(): NodeMaterialConnectionPoint {
        return this._outputs[4];
    }

    /**
     * Gets the z component
     */
    public get z(): NodeMaterialConnectionPoint {
        return this._outputs[5];
    }

    /**
     * Gets the w component
     */
    public get output(): NodeMaterialConnectionPoint {
        return this._outputs[6];
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected writeOutputs(state: NodeMaterialBuildState): string {
        let code = "";

        const coord = state.shaderLanguage === ShaderLanguage.WGSL ? "fragmentInputs.position" : "gl_FragCoord";

        for (const output of this._outputs) {
            if (output.hasEndpoints) {
                code += `${state._declareOutput(output)} = ${coord}.${output.name};\n`;
            }
        }

        return code;
    }

    protected override _buildBlock(state: NodeMaterialBuildState) {
        super._buildBlock(state);

        if (state.target === NodeMaterialBlockTargets.Vertex) {
            state.sharedData.raiseBuildError("FragCoordBlock must only be used in a fragment shader");
            return this;
        }

        state.compilationString += this.writeOutputs(state);

        return this;
    }
}

RegisterClass("BABYLON.FragCoordBlock", FragCoordBlock);
