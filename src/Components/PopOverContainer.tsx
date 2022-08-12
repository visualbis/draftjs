import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const PopOverContainer =
    ({ width }) =>
    (props: any) => {
        const boundingRect = props.store.getReferenceElement()?.getBoundingClientRect();
        const mentionWidth = width ?? 223;
        const clientWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        const clientHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

        if (!boundingRect) {
            return null;
        }
        const container = document.body.getElementsByClassName('mention-list-container')[0];
        if (!container) {
            return null;
        }
        const style: React.CSSProperties = boundingRect
            ? {
                  position: boundingRect ? 'fixed' : null,
                  left:
                      clientWidth - boundingRect.left < mentionWidth
                          ? boundingRect.left - mentionWidth
                          : boundingRect.left + 20,
                     top: clientHeight - boundingRect.top < boundingRect.height ? boundingRect.top - boundingRect.height : boundingRect.top + 20,
                  backgroundColor: '#fff',
                  zIndex: 1000,
                  boxShadow: '0px 4px 4px rgb(0 0 0 / 25%)',
                  maxHeight: '160px',
                  overflowY: 'auto',
              }
            : null;

        return createPortal(
            <div className="mention-list" style={style}>
                {props.children}
            </div>,
            container,
        );
    };

export default PopOverContainer;
