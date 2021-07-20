import React from 'react';
import { ToolbarIconButton } from '../Buttons/ToolbarIconButton';
import { IDraftToolbarProps } from './DraftToolbar';

interface IDraftSubScriptFormat {
    formatProps: IDraftToolbarProps;
}

const DraftSubScriptFormat = (props: IDraftSubScriptFormat) => {
    const {
        formatProps: { setFormat, currentFormat },
    } = props;

    const onClick = () => {
        setFormat('subScript');
    };

    return (
        <div>
            <ToolbarIconButton
                title="Apply subscript formatting"
                // id={TB.SUB_SCRIPT}
                active={currentFormat?.subScript}
                disabled={currentFormat?.superScript}
                icon="ms-Icon ms-Icon--Subscript"
                onClick={onClick}
            />
        </div>
    );
};

export default DraftSubScriptFormat;
