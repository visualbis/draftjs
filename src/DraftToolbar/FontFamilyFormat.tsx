import React from 'react';
import { TB } from '../Service/UIconstants';
import { Select } from '@visualbi/bifrost-ui/dist/react/forms/Select';
import { IDraftToolbarProps } from './DraftToolbar';



interface IDraftFontFamilyFormatProps {
    formatProps: IDraftToolbarProps;
}

const fontFamilies = [
    {
        displayName: 'Arial',
        label: 'Arial',
        value: 'Arial',
    },
    {
        displayName: 'Calibri',
        label: 'Calibri',
        value: 'Calibri',
    },
    {
        displayName: 'Comic Sans MS',
        label: 'Comic Sans MS',
        value: 'Comic Sans MS',
    },
    {
        displayName: 'Consolas',
        label: 'Consolas',
        value: 'Consolas',
    },
    {
        displayName: 'Corbel',
        label: 'Corbel',
        value: 'Corbel',
    },
    {
        displayName: 'Courier New',
        label: 'Courier New',
        value: 'Courier New',
    },
    {
        displayName: 'Space Mono',
        label: 'Space Mono',
        value: 'Space Mono',
    },
    {
        displayName: 'Times New Roman',
        label: 'Times New Roman',
        value: 'Times New Roman',
    },
    {
        displayName: 'Trebuchet MS',
        label: 'Trebuchet MS',
        value: 'Trebuchet MS',
    },
];

const DraftFontFamilyFormat = (props: IDraftFontFamilyFormatProps) => {
    const {
        formatProps: { setFormat, currentFormat },
    } = props;

    const onSelect = (value:string) => {
        setFormat('fontfamily', value);
    };

    return (
        <div style={{ width: 120, marginRight: 5 }}>
            <Select
                value={currentFormat?.font ?? fontFamilies[0].value}
                options={fontFamilies}
                title="Choose a font"
                onChange={onSelect}
            />
        </div>
    );
};

export default DraftFontFamilyFormat;
