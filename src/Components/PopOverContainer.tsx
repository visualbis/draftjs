import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const PopOverContainer =
    ({ width, isPeopleMention }) =>
    (props: any) => {
        const boundingRect = props.store.getReferenceElement()?.getBoundingClientRect();
        const mentionWidth = width ?? 223;
        const clientWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        const clientHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        const childHeight = isPeopleMention ? 56.6 : 26;
        const height = Math.min(160, props.children.length * childHeight);
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
                          : boundingRect.left,
                  top:
                      clientHeight - (boundingRect.top + 20) < height
                          ? boundingRect.top - height
                          : boundingRect.top + 20,
                  backgroundColor: '#fff',
                  zIndex: 1000,
                  boxShadow: '0px 4px 4px rgb(0 0 0 / 25%)',
                  maxHeight: '160px',
                  overflowY: 'auto',
              }
            : null;

        return createPortal(
            <div className={`mention-list ${isPeopleMention ? 'people-mention' : ''}`} style={style}>
                {props.children}
            </div>,
            container,
        );
    };

export default PopOverContainer;
