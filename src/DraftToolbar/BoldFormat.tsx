import React from 'react';
import { TB } from '../Service/UIconstants';
import { ToolbarIconButton } from '../Buttons/ToolbarIconButton';
import { IDraftToolbarProps } from './DraftToolbar';

interface IDraftBoldFormatProps {
    formatProps: IDraftToolbarProps;
}

const DraftBoldFormat = (props: IDraftBoldFormatProps) => {
    const {
        formatProps: { setFormat, currentFormat },
    } = props;

    const onClick = () => {
        setFormat('bold', currentFormat?.bold ? 'active' : '');
    };

    return (
        <ToolbarIconButton
            // title="Apply bold formatting"
            id={TB.FONT_BOLD}
            active={currentFormat?.bold}
            disabled={false}
            icon={'ms-Icon ms-Icon--Bold'}
            onClick={onClick}
        />
    );
};

export default DraftBoldFormat;
