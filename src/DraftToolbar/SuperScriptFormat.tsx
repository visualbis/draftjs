import React from 'react';
import { ToolbarIconButton } from '../Buttons/ToolbarIconButton';
import { IDraftToolbarProps } from './DraftToolbar';

interface IDraftSuperScriptFormat {
    formatProps: IDraftToolbarProps;
}

const DraftSuperScriptFormat = (props: IDraftSuperScriptFormat) => {
    const {
        formatProps: { setFormat, currentFormat },
    } = props;

    const onClick = () => {
        setFormat('superScript');
    };

    return (
        <div>
            <ToolbarIconButton
                title="Apply subscript formatting"
                // id={TB.SUB_SCRIPT}
                active={currentFormat?.superScript}
                disabled={currentFormat?.subScript}
                icon="ms-Icon ms-Icon--Superscript"
                onClick={onClick}
            />
        </div>
    );
};

export default DraftSuperScriptFormat;
