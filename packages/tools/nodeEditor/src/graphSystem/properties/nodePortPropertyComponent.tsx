import * as React from "react";
import { LineContainerComponent } from "shared-ui-components/lines/lineContainerComponent";
import { CheckBoxLineComponent } from "../../sharedComponents/checkBoxLineComponent";
import type { StateManager } from "shared-ui-components/nodeGraphSystem/stateManager";
import { TextInputLineComponent } from "shared-ui-components/lines/textInputLineComponent";
import type { NodePort } from "shared-ui-components/nodeGraphSystem/nodePort";
import { TextLineComponent } from "shared-ui-components/lines/textLineComponent";
import type { NodeMaterialConnectionPoint } from "core/Materials";
import { NodeMaterialBlockConnectionPointTypes } from "core/Materials";
import { GetListOfAcceptedTypes } from "shared-ui-components/nodeGraphSystem/tools";
import { PropertyTabComponentBase } from "shared-ui-components/components/propertyTabComponentBase";

export interface IFrameNodePortPropertyTabComponentProps {
    stateManager: StateManager;
    nodePort: NodePort;
}

export class NodePortPropertyTabComponent extends React.Component<IFrameNodePortPropertyTabComponentProps> {
    constructor(props: IFrameNodePortPropertyTabComponentProps) {
        super(props);
    }

    toggleExposeOnFrame(value: boolean) {
        this.props.nodePort.exposedOnFrame = value;
        this.props.stateManager.onExposePortOnFrameObservable.notifyObservers(this.props.nodePort.node);
    }

    override render() {
        const port = this.props.nodePort.portData.data as NodeMaterialConnectionPoint;
        const acceptedConnectionPointTypes = GetListOfAcceptedTypes(
            NodeMaterialBlockConnectionPointTypes,
            NodeMaterialBlockConnectionPointTypes.All,
            NodeMaterialBlockConnectionPointTypes.AutoDetect,
            port,
            [NodeMaterialBlockConnectionPointTypes.BasedOnInput]
        );

        const info = this.props.nodePort.hasLabel() ? (
            <>
                {this.props.nodePort.hasLabel() && (
                    <TextInputLineComponent lockObject={this.props.stateManager.lockObject} label="Port Label" propertyName="portName" target={this.props.nodePort} />
                )}
                <TextLineComponent label="Type" value={NodeMaterialBlockConnectionPointTypes[port.type]} />
                {acceptedConnectionPointTypes.length > 0 && acceptedConnectionPointTypes.map((t, i) => <TextLineComponent label={i === 0 ? "Accepted Types" : ""} value={t} />)}
                {this.props.nodePort.node.enclosingFrameId !== -1 && (
                    <CheckBoxLineComponent
                        label="Expose Port on Frame"
                        target={this.props.nodePort}
                        isSelected={() => this.props.nodePort.exposedOnFrame}
                        onSelect={(value: boolean) => this.toggleExposeOnFrame(value)}
                        propertyName="exposedOnFrame"
                        disabled={this.props.nodePort.disabled}
                    />
                )}
            </>
        ) : (
            <TextLineComponent label="This node is a constant input node and cannot be exposed to the frame." value=" "></TextLineComponent>
        );

        return (
            <PropertyTabComponentBase>
                <LineContainerComponent title="GENERAL">{info}</LineContainerComponent>
            </PropertyTabComponentBase>
        );
    }
}
