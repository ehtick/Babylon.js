import { DataStorage } from "core/Misc/dataStorage.js";
import * as react from "react";
import downArrow from "../assets/imgs/downArrow.svg";

interface ILineContainerComponentProps {
    title: string;
    children: any[] | any;
    closed?: boolean;
}

export class LineContainerComponent extends react.Component<ILineContainerComponentProps, { isExpanded: boolean }> {
    constructor(props: ILineContainerComponentProps) {
        super(props);

        const initialState = DataStorage.ReadBoolean(this.props.title, !this.props.closed);

        this.state = { isExpanded: initialState };
    }

    switchExpandedState(): void {
        const newState = !this.state.isExpanded;

        DataStorage.WriteBoolean(this.props.title, newState);

        this.setState({ isExpanded: newState });
    }

    renderHeader() {
        const className = this.state.isExpanded ? "collapse" : "collapse closed";

        return (
            <div className="header" onClick={() => this.switchExpandedState()}>
                <div className="title">{this.props.title}</div>
                <div className={className}>
                    <img className="img" title={this.props.title} src={downArrow} />
                </div>
            </div>
        );
    }

    override render() {
        if (!this.state.isExpanded) {
            return (
                <div className="paneContainer">
                    <div className="paneContainer-content">{this.renderHeader()}</div>
                </div>
            );
        }

        return (
            <div className="paneContainer">
                <div className="paneContainer-content">
                    {this.renderHeader()}
                    <div className="paneList">{this.props.children}</div>
                </div>
            </div>
        );
    }
}
