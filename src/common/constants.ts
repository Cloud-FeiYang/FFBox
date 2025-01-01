export const version = (() => {
    let ret = '4.3';
    if (!buildInfo) {
        ret += ' *'
    } else if (buildInfo.isDev) {
        ret += ` ${buildInfo.gitCommit}`
    }
    return ret;
})();
export const buildNumber = 14;
//	1.0	1.1	2.0	2.1	2.2	2.3	2.4 2.5 2.6 3.0 4.0 4.1 4.2 4.3
