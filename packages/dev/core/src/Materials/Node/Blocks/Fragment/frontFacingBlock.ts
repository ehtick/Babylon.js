import { NodeMaterialBlock } from "../../nodeMaterialBlock";
import { NodeMaterialBlockConnectionPointTypes } from "../../Enums/nodeMaterialBlockConnectionPointTypes";
import type { NodeMaterialBuildState } from "../../nodeMaterialBuildState";
import type { NodeMaterialConnectionPoint } from "../../nodeMaterialBlockConnectionPoint";
import { NodeMaterialBlockTargets } from "../../Enums/nodeMaterialBlockTargets";
import { RegisterClass } from "../../../../Misc/typeStore";
import { ShaderLanguage } from "../../../../Materials/shaderLanguage";
/**
 * Block used to test if the fragment shader is front facing
 */
export class FrontFacingBlock extends NodeMaterialBlock {
    /**
     * Creates a new FrontFacingBlock
     * @param name defines the block name
     */
    public constructor(name: string) {
        super(name, NodeMaterialBlockTargets.Fragment);

        this.registerOutput("output", NodeMaterialBlockConnectionPointTypes.Float, NodeMaterialBlockTargets.Fragment);
    }

    /**
     * Gets the current class name
     * @returns the class name
     */
    public override getClassName() {
        return "FrontFacingBlock";
    }

    /**
     * Gets the output component
     */
    public get output(): NodeMaterialConnectionPoint {
        return this._outputs[0];
    }

    protected override _buildBlock(state: NodeMaterialBuildState) {
        super._buildBlock(state);

        if (state.target === NodeMaterialBlockTargets.Vertex) {
            state.sharedData.raiseBuildError("FrontFacingBlock must only be used in a fragment shader");
            return this;
        }

        const output = this._outputs[0];

        state.compilationString +=
            state._declareOutput(output) +
            ` = ${state._generateTernary("1.0", "0.0", state.shaderLanguage === ShaderLanguage.GLSL ? "gl_FrontFacing" : "fragmentInputs.frontFacing")};\n`;

        return this;
    }
}

RegisterClass("BABYLON.FrontFacingBlock", FrontFacingBlock);
