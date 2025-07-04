import type { Nullable } from "core/types";
import type { Observer, Observable } from "core/Misc/observable";
import type { PointerInfo } from "core/Events/pointerEvents";
import { PointerEventTypes } from "core/Events/pointerEvents";
import type { IExplorerExtensibilityGroup } from "core/Debug/debugLayer";
import { GizmoManager } from "core/Gizmos/gizmoManager";
import type { Scene } from "core/scene";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSyncAlt, faImage, faCrosshairs, faArrowsAlt, faCompress, faRedoAlt, faVectorSquare, faLocationDot } from "@fortawesome/free-solid-svg-icons";
import { ExtensionsComponent } from "../extensionsComponent";
import * as React from "react";

import type { GlobalState } from "../../globalState";
import { UtilityLayerRenderer } from "core/Rendering/utilityLayerRenderer";
import { PropertyChangedEvent } from "../../../components/propertyChangedEvent";
import type { LightGizmo } from "core/Gizmos/lightGizmo";
import type { CameraGizmo } from "core/Gizmos/cameraGizmo";
import type { Camera } from "core/Cameras/camera";
import { TmpVectors, Vector3 } from "core/Maths/math";
import { GizmoCoordinatesMode } from "core/Gizmos/gizmo";
import type { Bone } from "core/Bones/bone";

import { setDebugNode } from "../treeNodeDebugger";
import { FrameGraphUtils } from "core/FrameGraph/frameGraphUtils";

interface ISceneTreeItemComponentProps {
    scene: Scene;
    gizmoCamera?: Camera;
    onRefresh: () => void;
    selectedEntity?: any;
    extensibilityGroups?: IExplorerExtensibilityGroup[];
    onSelectionChangedObservable?: Observable<any>;
    globalState: GlobalState;
}

export class SceneTreeItemComponent extends React.Component<
    ISceneTreeItemComponentProps,
    { isSelected: boolean; isInPickingMode: boolean; gizmoMode: number; isInWorldCoodinatesMode: boolean }
> {
    private _gizmoLayerOnPointerObserver: Nullable<Observer<PointerInfo>>;
    private _onPointerObserver: Nullable<Observer<PointerInfo>>;
    private _onSelectionChangeObserver: Nullable<Observer<any>>;
    private _selectedEntity: any;

    private _posDragEnd: Nullable<Observer<PropertyChangedEvent>> = null;
    private _scaleDragEnd: Nullable<Observer<PropertyChangedEvent>> = null;
    private _rotateDragEnd: Nullable<Observer<PropertyChangedEvent>> = null;

    constructor(props: ISceneTreeItemComponentProps) {
        super(props);

        const scene = this.props.scene;
        let gizmoMode = 0;
        if (scene.reservedDataStore && scene.reservedDataStore.gizmoManager) {
            const manager: GizmoManager = scene.reservedDataStore.gizmoManager;
            if (manager.positionGizmoEnabled) {
                gizmoMode = 1;
            } else if (manager.rotationGizmoEnabled) {
                gizmoMode = 2;
            } else if (manager.scaleGizmoEnabled) {
                gizmoMode = 3;
            } else if (manager.boundingBoxGizmoEnabled) {
                gizmoMode = 4;
            }
            // autopicking is disable by default
            manager.enableAutoPicking = false;
        }

        this.state = { isSelected: false, isInPickingMode: false, gizmoMode: gizmoMode, isInWorldCoodinatesMode: false };
    }

    override shouldComponentUpdate(nextProps: ISceneTreeItemComponentProps, nextState: { isSelected: boolean; isInPickingMode: boolean }) {
        if (nextProps.selectedEntity) {
            if (nextProps.scene === nextProps.selectedEntity) {
                nextState.isSelected = true;
                return true;
            } else {
                nextState.isSelected = false;
            }
        }
        this.updateGizmoAutoPicking(nextState.isInPickingMode);
        return true;
    }

    updateGizmoAutoPicking(isInPickingMode: boolean) {
        const scene = this.props.scene;
        if (scene.reservedDataStore && scene.reservedDataStore.gizmoManager) {
            const manager: GizmoManager = scene.reservedDataStore.gizmoManager;
            manager.enableAutoPicking = isInPickingMode;
        }
    }

    override componentDidMount() {
        if (!this.props.onSelectionChangedObservable) {
            return;
        }

        const scene = this.props.scene;
        this._onSelectionChangeObserver = this.props.onSelectionChangedObservable.add((entity) => {
            this._selectedEntity = entity;
            if (entity && scene.reservedDataStore && scene.reservedDataStore.gizmoManager) {
                const manager: GizmoManager = scene.reservedDataStore.gizmoManager;

                const className = entity.getClassName();

                if (className === "TransformNode" || className.indexOf("Mesh") !== -1) {
                    manager.attachToMesh(entity);
                } else if (className.indexOf("Light") !== -1) {
                    if (!this._selectedEntity.reservedDataStore || !this._selectedEntity.reservedDataStore.lightGizmo) {
                        this.props.globalState.enableLightGizmo(this._selectedEntity, true, this.props.gizmoCamera);
                        this.forceUpdate();
                    }
                    manager.attachToNode(this._selectedEntity.reservedDataStore.lightGizmo.attachedNode);
                } else if (className.indexOf("Camera") !== -1) {
                    if (!this._selectedEntity.reservedDataStore || !this._selectedEntity.reservedDataStore.cameraGizmo) {
                        this.props.globalState.enableCameraGizmo(this._selectedEntity, true, this.props.gizmoCamera);
                        this.forceUpdate();
                    }
                    manager.attachToNode(this._selectedEntity.reservedDataStore.cameraGizmo.attachedNode);
                } else if (className.indexOf("Bone") !== -1) {
                    manager.attachToMesh(this._selectedEntity._linkedTransformNode ? this._selectedEntity._linkedTransformNode : this._selectedEntity);
                    if (!this._selectedEntity._linkedTransformNode) {
                        manager.additionalTransformNode = this._getMeshFromBone(this._selectedEntity, scene);
                    }
                } else {
                    manager.attachToNode(null);
                }
            }
        });
    }

    private _getMeshFromBone(bone: Bone, scene: Scene) {
        const skeleton = bone.getSkeleton();

        // First try to find a mesh for which we've enabled the skeleton viewer
        for (const mesh of scene.meshes) {
            const skeletonViewer = mesh.reservedDataStore?.skeletonViewer;
            if (skeletonViewer && skeletonViewer.skeleton === skeleton) {
                return mesh;
            }
        }

        // Not found, return the first mesh that uses the skeleton
        for (const mesh of scene.meshes) {
            if (mesh.skeleton === skeleton) {
                return mesh;
            }
        }

        return undefined;
    }

    override componentWillUnmount() {
        const scene = this.props.scene;

        if (this._onPointerObserver) {
            scene.onPointerObservable.remove(this._onPointerObserver);
            this._onPointerObserver = null;
        }

        if (this._gizmoLayerOnPointerObserver) {
            scene.onPointerObservable.remove(this._gizmoLayerOnPointerObserver);
            this._gizmoLayerOnPointerObserver = null;
        }

        if (this._onSelectionChangeObserver && this.props.onSelectionChangedObservable) {
            this.props.onSelectionChangedObservable.remove(this._onSelectionChangeObserver);
        }
    }

    onSelect() {
        if (!this.props.onSelectionChangedObservable) {
            return;
        }
        const scene = this.props.scene;
        // Put scene object into window.debugNode
        setDebugNode(scene);
        this.props.onSelectionChangedObservable.notifyObservers(scene);
    }

    onCoordinatesMode() {
        const scene = this.props.scene;
        const manager: GizmoManager = scene.reservedDataStore.gizmoManager;
        // flip coordinate system
        manager.coordinatesMode = this.state.isInWorldCoodinatesMode ? GizmoCoordinatesMode.Local : GizmoCoordinatesMode.World;
        this.setState({ isInWorldCoodinatesMode: !this.state.isInWorldCoodinatesMode });
    }
    onPickingMode() {
        const scene = this.props.scene;

        if (this._onPointerObserver) {
            scene.onPointerObservable.remove(this._onPointerObserver);
            this._onPointerObserver = null;
        }

        if (!this.state.isInPickingMode) {
            this._onPointerObserver = scene.onPointerObservable.add(() => {
                const pickPosition = scene.unTranslatedPointer;
                const pickInfo = scene.pick(
                    pickPosition.x,
                    pickPosition.y,
                    (mesh) => mesh.isEnabled() && mesh.isVisible && mesh.getTotalVertices() > 0,
                    false,
                    undefined,
                    (p0, p1, p2, ray) => {
                        if (!this.props.globalState.ignoreBackfacesForPicking) {
                            return true;
                        }

                        const p0p1 = TmpVectors.Vector3[0];
                        const p1p2 = TmpVectors.Vector3[1];
                        let normal = TmpVectors.Vector3[2];

                        p1.subtractToRef(p0, p0p1);
                        p2.subtractToRef(p1, p1p2);

                        normal = Vector3.Cross(p0p1, p1p2);

                        return Vector3.Dot(normal, ray.direction) < 0;
                    }
                );

                // Pick light gizmos first
                if (this.props.globalState.lightGizmos.length > 0) {
                    const gizmoScene = this.props.globalState.lightGizmos[0].gizmoLayer.utilityLayerScene;
                    const pickInfo = gizmoScene.pick(pickPosition.x, pickPosition.y, (m: any) => {
                        for (const g of this.props.globalState.lightGizmos as any) {
                            if (g.attachedNode == m) {
                                return true;
                            }
                        }
                        return false;
                    });
                    if (pickInfo && pickInfo.hit && this.props.onSelectionChangedObservable) {
                        this.props.onSelectionChangedObservable.notifyObservers(pickInfo.pickedMesh);
                        return;
                    }
                }
                // Pick camera gizmos
                if (this.props.globalState.cameraGizmos.length > 0) {
                    const gizmoScene = this.props.globalState.cameraGizmos[0].gizmoLayer.utilityLayerScene;
                    const pickInfo = gizmoScene.pick(pickPosition.x, pickPosition.y, (m: any) => {
                        for (const g of this.props.globalState.cameraGizmos as any) {
                            if (g.attachedNode == m) {
                                return true;
                            }
                        }
                        return false;
                    });
                    if (pickInfo && pickInfo.hit && this.props.onSelectionChangedObservable) {
                        this.props.onSelectionChangedObservable.notifyObservers(pickInfo.pickedMesh);
                        return;
                    }
                }
                if (pickInfo && pickInfo.hit && this.props.onSelectionChangedObservable) {
                    this.props.onSelectionChangedObservable.notifyObservers(pickInfo.pickedMesh);
                }
            }, PointerEventTypes.POINTERTAP);
        }

        this.setState({ isInPickingMode: !this.state.isInPickingMode });
    }

    setGizmoMode(mode: number) {
        const scene = this.props.scene;

        if (!scene.reservedDataStore) {
            scene.reservedDataStore = {};
        }

        if (this._gizmoLayerOnPointerObserver) {
            scene.onPointerObservable.remove(this._gizmoLayerOnPointerObserver);
            this._gizmoLayerOnPointerObserver = null;
        }

        if (!scene.reservedDataStore.gizmoManager) {
            const layer1 = scene.frameGraph ? FrameGraphUtils.CreateUtilityLayerRenderer(scene.frameGraph) : new UtilityLayerRenderer(scene);
            const layer2 = scene.frameGraph ? FrameGraphUtils.CreateUtilityLayerRenderer(scene.frameGraph) : new UtilityLayerRenderer(scene);

            scene.reservedDataStore.gizmoManager = new GizmoManager(scene, undefined, layer1, layer2);
        }

        if (this.props.gizmoCamera) {
            scene.reservedDataStore.gizmoManager.utilityLayer.setRenderCamera(this.props.gizmoCamera);
        }

        const manager: GizmoManager = scene.reservedDataStore.gizmoManager;
        // Allow picking of light gizmo when a gizmo mode is selected
        this._gizmoLayerOnPointerObserver = UtilityLayerRenderer.DefaultUtilityLayer.utilityLayerScene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type == PointerEventTypes.POINTERDOWN) {
                if (pointerInfo.pickInfo && pointerInfo.pickInfo.pickedMesh) {
                    let node: Nullable<any> = pointerInfo.pickInfo.pickedMesh;
                    // Attach to the most parent node
                    while (node && node.parent != null) {
                        node = node.parent;
                    }
                    for (const gizmo of this.props.globalState.lightGizmos) {
                        if (gizmo._rootMesh == node) {
                            manager.attachToNode(gizmo.attachedNode);
                        }
                    }
                }
            }
        });

        manager.boundingBoxGizmoEnabled = false;
        manager.positionGizmoEnabled = false;
        manager.rotationGizmoEnabled = false;
        manager.scaleGizmoEnabled = false;

        if (this.state.gizmoMode === mode) {
            mode = 0;
            manager.dispose();
            scene.reservedDataStore.gizmoManager = null;
        } else {
            switch (mode) {
                case 1:
                    manager.positionGizmoEnabled = true;
                    if (!this._posDragEnd) {
                        // Record movement for generating replay code
                        this._posDragEnd = manager.gizmos.positionGizmo!.onDragEndObservable.add(() => {
                            if (manager.gizmos.positionGizmo && manager.gizmos.positionGizmo.attachedNode) {
                                const lightGizmo: Nullable<LightGizmo> = manager.gizmos.positionGizmo.attachedNode.reservedDataStore
                                    ? manager.gizmos.positionGizmo.attachedNode.reservedDataStore.lightGizmo
                                    : null;
                                const objLight: any = lightGizmo && lightGizmo.light ? lightGizmo.light : manager.gizmos.positionGizmo.attachedNode;

                                if (objLight.position) {
                                    const e = new PropertyChangedEvent();
                                    e.object = objLight;
                                    e.property = "position";
                                    e.value = objLight.position;
                                    this.props.globalState.onPropertyChangedObservable.notifyObservers(e);
                                } else {
                                    const cameraGizmo: Nullable<CameraGizmo> = manager.gizmos.positionGizmo.attachedNode.reservedDataStore
                                        ? manager.gizmos.positionGizmo.attachedNode.reservedDataStore.cameraGizmo
                                        : null;
                                    const objCamera: any = cameraGizmo && cameraGizmo.camera ? cameraGizmo.camera : manager.gizmos.positionGizmo.attachedNode;

                                    if (objCamera.position) {
                                        const e = new PropertyChangedEvent();
                                        e.object = objCamera;
                                        e.property = "position";
                                        e.value = objCamera.position;
                                        this.props.globalState.onPropertyChangedObservable.notifyObservers(e);
                                    }
                                }
                            }
                        });
                    }

                    break;
                case 2:
                    manager.rotationGizmoEnabled = true;
                    if (!this._rotateDragEnd) {
                        // Record movement for generating replay code
                        this._rotateDragEnd = manager.gizmos.rotationGizmo!.onDragEndObservable.add(() => {
                            if (manager.gizmos.rotationGizmo && manager.gizmos.rotationGizmo.attachedNode) {
                                const lightGizmo: Nullable<LightGizmo> = manager.gizmos.rotationGizmo.attachedNode.reservedDataStore
                                    ? manager.gizmos.rotationGizmo.attachedNode.reservedDataStore.lightGizmo
                                    : null;
                                const objLight: any = lightGizmo && lightGizmo.light ? lightGizmo.light : manager.gizmos.rotationGizmo.attachedNode;
                                const cameraGizmo: Nullable<CameraGizmo> = manager.gizmos.rotationGizmo.attachedNode.reservedDataStore
                                    ? manager.gizmos.rotationGizmo.attachedNode.reservedDataStore.cameraGizmo
                                    : null;
                                const objCamera: any = cameraGizmo && cameraGizmo.camera ? cameraGizmo.camera : manager.gizmos.rotationGizmo.attachedNode;

                                if (objLight.rotationQuaternion) {
                                    const e = new PropertyChangedEvent();
                                    e.object = objLight;
                                    e.property = "rotationQuaternion";
                                    e.value = objLight.rotationQuaternion;
                                    this.props.globalState.onPropertyChangedObservable.notifyObservers(e);
                                } else if (objLight.rotation) {
                                    const e = new PropertyChangedEvent();
                                    e.object = objLight;
                                    e.property = "rotation";
                                    e.value = objLight.rotation;
                                    this.props.globalState.onPropertyChangedObservable.notifyObservers(e);
                                } else if (objLight.direction) {
                                    const e = new PropertyChangedEvent();
                                    e.object = objLight;
                                    e.property = "direction";
                                    e.value = objLight.direction;
                                    this.props.globalState.onPropertyChangedObservable.notifyObservers(e);
                                } else if (objCamera.rotationQuaternion) {
                                    const e = new PropertyChangedEvent();
                                    e.object = objCamera;
                                    e.property = "rotationQuaternion";
                                    e.value = objCamera.rotationQuaternion;
                                    this.props.globalState.onPropertyChangedObservable.notifyObservers(e);
                                } else if (objCamera.rotation) {
                                    const e = new PropertyChangedEvent();
                                    e.object = objCamera;
                                    e.property = "rotation";
                                    e.value = objCamera.rotation;
                                    this.props.globalState.onPropertyChangedObservable.notifyObservers(e);
                                }
                            }
                        });
                    }

                    break;
                case 3:
                    manager.scaleGizmoEnabled = true;
                    if (!this._scaleDragEnd) {
                        // Record movement for generating replay code
                        this._scaleDragEnd = manager.gizmos.scaleGizmo!.onDragEndObservable.add(() => {
                            if (manager.gizmos.scaleGizmo && manager.gizmos.scaleGizmo.attachedMesh) {
                                const lightGizmo: Nullable<LightGizmo> = manager.gizmos.scaleGizmo.attachedMesh.reservedDataStore
                                    ? manager.gizmos.scaleGizmo.attachedMesh.reservedDataStore.lightGizmo
                                    : null;
                                const obj: any = lightGizmo && lightGizmo.light ? lightGizmo.light : manager.gizmos.scaleGizmo.attachedMesh;

                                if (obj.scaling) {
                                    const e = new PropertyChangedEvent();
                                    e.object = obj;
                                    e.property = "scaling";
                                    e.value = obj.scaling;
                                    this.props.globalState.onPropertyChangedObservable.notifyObservers(e);
                                }
                            }
                        });
                    }

                    break;
                case 4:
                    manager.boundingBoxGizmoEnabled = true;
                    if (manager.gizmos.boundingBoxGizmo) {
                        manager.gizmos.boundingBoxGizmo.fixedDragMeshScreenSize = true;
                    }
                    break;
            }

            if (this._selectedEntity && this._selectedEntity.getClassName) {
                const className = this._selectedEntity.getClassName();

                if (className === "TransformNode" || className.indexOf("Mesh") !== -1) {
                    manager.attachToMesh(this._selectedEntity);
                } else if (className.indexOf("Light") !== -1) {
                    if (!this._selectedEntity.reservedDataStore || !this._selectedEntity.reservedDataStore.lightGizmo) {
                        this.props.globalState.enableLightGizmo(this._selectedEntity, true, this.props.gizmoCamera);
                        this.forceUpdate();
                    }
                    manager.attachToNode(this._selectedEntity.reservedDataStore.lightGizmo.attachedNode);
                } else if (className.indexOf("Camera") !== -1) {
                    if (!this._selectedEntity.reservedDataStore || !this._selectedEntity.reservedDataStore.cameraGizmo) {
                        this.props.globalState.enableCameraGizmo(this._selectedEntity, true, this.props.gizmoCamera);
                        this.forceUpdate();
                    }
                    manager.attachToNode(this._selectedEntity.reservedDataStore.cameraGizmo.attachedNode);
                } else if (className.indexOf("Bone") !== -1) {
                    manager.attachToMesh(this._selectedEntity._linkedTransformNode ? this._selectedEntity._linkedTransformNode : this._selectedEntity);
                    if (!this._selectedEntity._linkedTransformNode) {
                        manager.additionalTransformNode = this._getMeshFromBone(this._selectedEntity, scene);
                    }
                }
            }
        }

        this.setState({ gizmoMode: mode });
    }

    override render() {
        return (
            <div className={this.state.isSelected ? "itemContainer selected" : "itemContainer"}>
                <div className="sceneNode">
                    <div className="sceneTitle" onClick={() => this.onSelect()}>
                        <FontAwesomeIcon icon={faImage} />
                        &nbsp;Scene
                    </div>
                    <div
                        className={this.state.gizmoMode === 1 ? "translation selected icon" : "translation icon"}
                        onClick={() => this.setGizmoMode(1)}
                        title="Enable/Disable position mode"
                    >
                        <FontAwesomeIcon icon={faArrowsAlt} />
                    </div>
                    <div
                        className={this.state.gizmoMode === 2 ? "rotation selected icon" : "rotation icon"}
                        onClick={() => this.setGizmoMode(2)}
                        title="Enable/Disable rotation mode"
                    >
                        <FontAwesomeIcon icon={faRedoAlt} />
                    </div>
                    <div className={this.state.gizmoMode === 3 ? "scaling selected icon" : "scaling icon"} onClick={() => this.setGizmoMode(3)} title="Enable/Disable scaling mode">
                        <FontAwesomeIcon icon={faCompress} />
                    </div>
                    <div
                        className={this.state.gizmoMode === 4 ? "bounding selected icon" : "bounding icon"}
                        onClick={() => this.setGizmoMode(4)}
                        title="Enable/Disable bounding box mode"
                    >
                        <FontAwesomeIcon icon={faVectorSquare} />
                    </div>
                    <div className="separator" />
                    <div
                        className={this.state.isInPickingMode ? "pickingMode selected icon" : "pickingMode icon"}
                        onClick={() => this.onPickingMode()}
                        title="Turn picking mode on/off"
                    >
                        <FontAwesomeIcon icon={faCrosshairs} />
                    </div>
                    <div
                        className={this.state.isInWorldCoodinatesMode ? "coordinates selected icon" : "coordinates icon"}
                        onClick={() => this.onCoordinatesMode()}
                        title="Switch between world and local coordinates"
                    >
                        <FontAwesomeIcon icon={faLocationDot} />
                    </div>
                    <div className="refresh icon" onClick={() => this.props.onRefresh()} title="Refresh the explorer">
                        <FontAwesomeIcon icon={faSyncAlt} />
                    </div>
                    {<ExtensionsComponent target={this.props.scene} extensibilityGroups={this.props.extensibilityGroups} />}
                </div>
            </div>
        );
    }
}
