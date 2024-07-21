const path = require('path');
const ChildProcess = require('child_process');
const spawn = ChildProcess.spawn;

module.exports = function () {
    if (process.platform === 'win32') {
        const issPath = path.resolve('WindowsInstaller/FFBox.iss');
        spawn('iscc', [issPath], { stdio: 'inherit' });
    }
}
