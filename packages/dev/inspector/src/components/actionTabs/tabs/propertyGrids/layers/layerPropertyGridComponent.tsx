import * as React from "react";

import type { Observable } from "core/Misc/observable";

import type { PropertyChangedEvent } from "../../../../propertyChangedEvent";
import { LineContainerComponent } from "shared-ui-components/lines/lineContainerComponent";
import { TextLineComponent } from "shared-ui-components/lines/textLineComponent";
import type { LockObject } from "shared-ui-components/tabs/propertyGrids/lockObject";
import type { GlobalState } from "../../../../globalState";
import type { IExplorerExtensibilityGroup } from "core/Debug/debugLayer";
import { TextInputLineComponent } from "shared-ui-components/lines/textInputLineComponent";
import { SliderLineComponent } from "shared-ui-components/lines/sliderLineComponent";
import type { EffectLayer } from "core/Layers/effectLayer";
import { GlowLayer } from "core/Layers/glowLayer";
import { HighlightLayer } from "core/Layers/highlightLayer";
import { CheckBoxLineComponent } from "shared-ui-components/lines/checkBoxLineComponent";

interface ILayerPropertyGridComponentProps {
    globalState: GlobalState;
    layer: EffectLayer;
    extensibilityGroups?: IExplorerExtensibilityGroup[];
    lockObject: LockObject;
    onPropertyChangedObservable?: Observable<PropertyChangedEvent>;
}

export class LayerPropertyGridComponent extends React.Component<ILayerPropertyGridComponentProps> {
    constructor(props: ILayerPropertyGridComponentProps) {
        super(props);
    }

    override render() {
        const layer = this.props.layer;

        return (
            <>
                <LineContainerComponent title="GENERAL" selection={this.props.globalState}>
                    <TextLineComponent label="Class" value={layer.getClassName()} />
                    <TextInputLineComponent
                        lockObject={this.props.lockObject}
                        label="Name"
                        target={layer}
                        propertyName="name"
                        onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                    />
                    {layer.getClassName() === GlowLayer.EffectName && (
                        <div className="fragment">
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Intensity"
                                target={layer}
                                propertyName="intensity"
                                minimum={0}
                                maximum={2}
                                step={0.01}
                                decimalCount={2}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Blur Kernel Size"
                                target={layer}
                                propertyName="blurKernelSize"
                                minimum={0}
                                maximum={64}
                                step={1}
                                decimalCount={0}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                        </div>
                    )}
                    {layer.getClassName() === HighlightLayer.EffectName && (
                        <div className="fragment">
                            <CheckBoxLineComponent
                                label="Inner Glow"
                                target={layer}
                                propertyName="innerGlow"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <CheckBoxLineComponent
                                label="Outer Glow"
                                target={layer}
                                propertyName="outerGlow"
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Blur Horizontal Size"
                                target={layer}
                                propertyName="blurHorizontalSize"
                                minimum={0}
                                maximum={4}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                            <SliderLineComponent
                                lockObject={this.props.lockObject}
                                label="Blur Vertical Size"
                                target={layer}
                                propertyName="blurVerticalSize"
                                minimum={0}
                                maximum={4}
                                step={0.01}
                                onPropertyChangedObservable={this.props.onPropertyChangedObservable}
                            />
                        </div>
                    )}
                </LineContainerComponent>
            </>
        );
    }
}
