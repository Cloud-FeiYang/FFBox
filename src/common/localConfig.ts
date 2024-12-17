import path from 'path';
import Conf from 'conf';

const appDataPath = (
    () => { switch (process.platform) {
        case 'win32': return process.env.APPDATA;
        case 'linux': return process.env.XDG_CONFIG_HOME;
        case 'darwin': return path.join(process.env.HOME, 'Library', 'Application Support');
    } }
)();
const ffboxConf = new Conf({ cwd: path.join(appDataPath, 'FFBox') });

const localConfig = {
    get: async (key: string) => {
        if (!ffboxConf) {
            return undefined;
        }
        return ffboxConf.get(key);
    },
    set: async (key: string, value: any) => {
        if (!ffboxConf) {
            return undefined;
        }
        return ffboxConf.set(key, value);
    },
    delete: async (key: string) => {
        if (!ffboxConf) {
            return undefined;
        }
        return ffboxConf.delete(key);
    },
};

export default localConfig;
