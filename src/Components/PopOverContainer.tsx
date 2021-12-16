import React, { Component } from 'react';

export default class PopOverContainer extends Component<any> {
    render() {
        const boundingRect = this.props.store.getReferenceElement()?.getBoundingClientRect();
        const mentionWidth = 223;
        const clientWidth  = window.innerWidth || document.documentElement.clientWidth || 
        document.body.clientWidth;
        if (!boundingRect) {
            return null;
        }
        const style: React.CSSProperties = boundingRect
            ? {
                  position: boundingRect ? 'fixed' : null,
                  left: clientWidth - boundingRect?.left < mentionWidth ?  boundingRect?.left - mentionWidth :  boundingRect?.left + 20,
                  top: boundingRect?.top + 15,
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
