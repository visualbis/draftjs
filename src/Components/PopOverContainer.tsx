import React, { Component } from 'react';

export default class PopOverContainer extends Component<any> {
    render() {
        const boundingRect = this.props.store.getReferenceElement()?.getBoundingClientRect();
        if (!boundingRect) {
            return null;
        }
        const style: React.CSSProperties = boundingRect
            ? {
                  position: boundingRect ? 'fixed' : null,
                  left: boundingRect?.left + 20,
                  top: boundingRect?.top + 10,
                  backgroundColor: '#fff',
                  zIndex: 1000,
                  boxShadow: '0px 4px 4px rgb(0 0 0 / 25%)',
                  maxHeight: '160px',
                  overflowY: 'auto',
              }
            : null;
        return (
            <div className="mention-list" style={style}>
                {this.props.children}
            </div>
        );
    }
}
