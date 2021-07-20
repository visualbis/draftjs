const fs = require('fs'); 
let packageJSON = require('./package.json');
const buildNumber = process.env.buildNumber || ''; 
 
function getVersion() {
    let version = packageJSON.version; 
    version = version.replace(/-rc\w*/g, '');
    const versionParts = version.split('.');    
    if (buildNumber) {
        versionParts[2] = parseInt(versionParts[2]) + '-alpha' + buildNumber;
    }else{
        versionParts[2] = parseInt(versionParts[2]) + 1;
    }
    version = versionParts.join('.'); 
    return version;
}

function updateVersionNumber() {
    const versionNumber = getVersion();
    packageJSON.version = versionNumber;
    fs.writeFileSync('./package.json', JSON.stringify(packageJSON, null, 4));
}

function logVersionNumber() {
    console.log(`npm install @visualbi/viz-pdf@${packageJSON.version}`);
}

async function main() {
    updateVersionNumber();
    logVersionNumber();

}

main();