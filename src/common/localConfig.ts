import path from 'path';

// 由于编译产物是 CommonJS，这里会变成 require("conf")。又由于 conf 使用 ESM，且是外部依赖而不是放在产物中，故会产生 CommonJS 不能 require ESM 的错误
// import Conf from 'conf';
// const conf = new Conf({ projectName: 'FFBox' });

// 编译产物是 CommonJS，因此不能用顶层 await
// const [conf] = await (async () => {
//     const Conf = await import('conf');
//     console.log(Conf.default);
//     const appDataPath = [process.env.APPDATA, process.env.XDG_CONFIG_HOME, process.env.XDG_CONFIG_HOME][['win32', 'linux', 'darwin'].indexOf(process.platform)];
//     const conf = new Conf.default({ cwd: path.join(appDataPath, 'FFBox') });
//     console.log(conf.path);

//     return [conf];
// })();

// 综合考虑后的导入方案。由于顶层不支持 await，所以没办法在顶层就拿到初始化完毕的依赖，而是只能拿到一个依赖初始化函数，通过调用此函数获得初始化完成的依赖
// 使用 map 是考虑到不止 conf 一个依赖需要这样导入的情况，尽管现在确实只有一个依赖要这么干
// 确实比较恶心，详情见开发日志
// 可以不这么做，只要用旧版的 conf 即可。这里只是做个演练
const [ConfLoader] = ['conf'].map((moduleName) => (() => {
    let modul: any = undefined;
    import(moduleName).then((m) => {
        // console.log(moduleName, '已加载');
        modul = m;
    });
    return async () => {
        for (let i = 999; i > 0; i--) {
            if (modul) {
                return modul.default;
            } else {
                await new Promise((r) => setTimeout(() => r(undefined), 10));
            }
        }
        return Promise.reject();
    }
})()) as any as [
    () => Promise<typeof import("conf", { with: { "resolution-mode": "import" } }).default>
];

const ffboxConfConstructor = (async () => {
    const Conf = await ConfLoader();
    const appDataPath = (
        () => { switch (process.platform) {
            case 'win32': return process.env.APPDATA;
            case 'linux': return process.env.XDG_CONFIG_HOME;
            case 'darwin': return path.join(process.env.HOME, 'Library', 'Application Support');
        } }
    )();
    try {
        return new Conf({ cwd: path.join(appDataPath, 'FFBox') });
        // return new Conf({ cwd: 'Z:/a' });
    } catch (e) {
        return null;
    }
})();
let ffboxConf: Awaited<typeof ffboxConfConstructor>;

const localConfig = {
    get: async (key: string) => {
        ffboxConf = ffboxConf || await ffboxConfConstructor;
        if (!ffboxConf) {
            return undefined;
        }
        return ffboxConf.get(key);
    },
    set: async (key: string, value: any) => {
        ffboxConf = ffboxConf || await ffboxConfConstructor;
        if (!ffboxConf) {
            return undefined;
        }
        return ffboxConf.set(key, value);
    },
    delete: async (key: string) => {
        ffboxConf = ffboxConf || await ffboxConfConstructor;
        if (!ffboxConf) {
            return undefined;
        }
        return ffboxConf.delete(key);
    },
};

export default localConfig;
