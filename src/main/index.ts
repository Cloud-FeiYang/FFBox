import { app, dialog, BrowserWindow, ipcMain, Menu, shell } from 'electron';
// import ElectronStore from 'electron-store';
import { exec } from 'child_process';
import path from 'path';
import parsePath from 'parse-path';
import CryptoJS from 'crypto-js';
import fs from 'fs/promises';
import { TransferStatus } from '@common/types';
import ProcessInstance from '@common/processInstance';
import localConfig from '@common/localConfig';
import { convertFFBoxMenuToElectronMenuTemplate, getOs } from './utils';
import osBridge from './osBridge';
import * as mica from './mica';
// import { FFBoxService } from './service/FFBoxService';


class ElectronApp {
	mainWindow: BrowserWindow | null = null;
	// electronStore: ElectronStore;
	service: ProcessInstance | null = null;
	blockWindowClose = true;

	constructor() {
		this.mountAppEvents();
	}

	mountAppEvents(): void {
		// 本程序是启动的第二个实例时，将因获不到锁而退出
		if (!app.requestSingleInstanceLock()) {
			console.log('FFBox 已启动，暂不支持启动第二个实例');
			app.quit();
			process.exit(0);
		}
		app.whenReady().then(async () => {
			if (process.platform === 'win32') {
				app.setAppUserModelId(app.getName());
			}
			await osBridge.initPipe();
			this.createMainWindow();
			this.mountIpcEvents();
		});

		// 发现本程序启动了第二个实例的时候，弹出主窗口
		app.on('second-instance', () => {
			if (this.mainWindow) {
				this.mainWindow.focus();
			}
		});
		// macOS dock 操作相关适配，未验证
		app.on('activate', () => {
			if (BrowserWindow.getAllWindows()) {
				this.mainWindow?.focus();
			} else {
				this.createMainWindow();
			}
		});
		app.on('window-all-closed', () => {
			// FFBoxService 进程尽管没有指定 detached
			// 但在 macOS 上，主进程退出不会导致 service 退出；在 linux 上，主进程调用了 app.exit() 之后依然会等待 service 退出
			// 故保险起见主动关闭
			this.service?.sendSig(9);
			app.exit();
		});

		// Set app user model id for windows
		// electronApp.setAppUserModelId('com.electron');

		// Default open or close DevTools by F12 in development
		// and ignore CommandOrControl + R in production.
		// see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
		// app.on('browser-window-created', (_, window) => {
		// 	optimizer.watchWindowShortcuts(window);
		// });
	}

	createMainWindow(): void {
		const mainWindow = new BrowserWindow({
			width: 1080,
			height: 720,
			minWidth: 600,
			minHeight: 300,
			show: false,
			resizable: true,
			maximizable: true,
			center: true,
			// transparent: true,
			backgroundColor: '#00ffffff',
			frame: false,
			hasShadow: true,
			// titleBarOverlay: {
			// 	color: '#444444'
			// },
			// titleBarStyle: 'hidden',
			// autoHideMenuBar: true,
			...(process.platform === 'linux' ? { icon: path.join(__dirname, '../../build/icon.png') } : {}),
			webPreferences: {
				preload: path.join(__dirname, '../preload/index.cjs'),
				// nodeIntegration: true,
				// contextIsolation: false,
			},
		});
		this.mainWindow = mainWindow;

		// 设置默认使用外部应用（浏览器）打开链接
		mainWindow.webContents.setWindowOpenHandler(({ url }) => {
			if (['https:', 'http:'].includes(new URL(url).protocol)) {
				shell.openExternal(url);
			}
			return { action: 'deny' };
		});

		mainWindow.once('ready-to-show', () => {
			mainWindow!.show();
			osBridge.sendLoadStatus('show');
		});

		// HMR for renderer base on electron-vite cli.
		// Load the remote URL for development or the local html file for production.
		// if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
		// 	mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
		// } else {
		// 	mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
		// }
		if (app.isPackaged) {
			mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
		} else {
			// 环境变量来自 build.mjs 传入
			const url = `http://${process.env['VITE_DEV_SERVER_HOST']}:${process.env['VITE_DEV_SERVER_PORT']}`;
	
			mainWindow.loadURL(url);
			mainWindow.webContents.openDevTools();
		}
	
		mainWindow.on('close', (e) => {
			if (this.blockWindowClose) {
				e.preventDefault();
				mainWindow!.webContents.send('exitConfirm');
			}
		});

		mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
			// item.setSavePath(folderpath + `\\${item.getFilename()}`);	// 设置文件存放位置
			mainWindow.webContents.send('downloadStatusChange', { url: item.getURL(), status: TransferStatus.downloading });
			item.on('updated', (event, state) => {
				if (state === 'interrupted') {
					console.log(item.getURL(), '下载取消');
				} else if (state === 'progressing') {
					if (item.isPaused()) {
						console.log(item.getURL(), '下载暂停');
					} else {
						mainWindow.webContents.send('downloadProgress', { url: item.getURL(), loaded: item.getReceivedBytes(), total: item.getTotalBytes() });
					}
				}
			})
			item.once('done', (event, state) => {
				console.log(item.getURL(), `下载${state === 'completed' ? '完成' : '失败'}`);
				mainWindow.webContents.send('downloadStatusChange', { url: item.getURL(), status: TransferStatus.normal });
			})
		});	

		// 应用菜单
		const initialMenuTemplate = [
			{ label: 'FFBox' },
			{ label: '加载中' }
		]
		
		const menu = Menu.buildFromTemplate(initialMenuTemplate as any);
		Menu.setApplicationMenu(menu);

		// this.electronStore = new ElectronStore();
	}

	async createService(): Promise<void> {
		this.service = new ProcessInstance();
		// 目前做不了进程分离，因为启动的时候会瞬间弹一个黑框，十分不优雅。等后期给选项让用户决定行为再去做：https://github.com/nodejs/node/issues/21825
		// return this.service.start('FFBoxService.exe', [], { detached: true, stdio: 'ignore', windowsHide: true, shell: false });
		let servicePath = '';
		if (getOs() === 'Windows') {
			servicePath = 'FFBoxService.exe';
		} else if (getOs() === 'MacOS') {
			servicePath = path.join(process.resourcesPath, 'FFBoxService');
		} else if (getOs() === 'Linux') {
			// this.mainWindow.webContents.send('debugMessage', 'service 路径', process.execPath, __dirname, __filename, process.cwd(), path.join(process.execPath, '../FFBoxService'));
			await fs.access('./FFBoxService', fs.constants.X_OK).then((result) => {
				servicePath = './FFBoxService'; // 通过终端直接执行
			}).catch(() => {});
			await fs.access(path.join(process.cwd(), 'FFBoxService'), fs.constants.X_OK).then((result) => {
				servicePath = path.join(process.cwd(), 'FFBoxService'); // 无沙箱双击执行、通过终端直接执行
			}).catch(() => {});	
			await fs.access(path.join(process.execPath, '../FFBoxService'), fs.constants.X_OK).then((result) => {
				servicePath = path.join(process.execPath, '../FFBoxService'); // AppImage 双击执行（/tmp 目录）、deb 安装后双击执行（/opt/FFBox/）
			});
		}
		// this.mainWindow.webContents.send('debugMessage', '选出路径', servicePath);
		return new Promise((resolve, reject) => {
			this.service.start(servicePath).then(() => {
				// 需要加一点延迟才报告成功，主要是因为 service 启动 server 需要一定时间，待 server 启动好之后才让 renderer 去连接
				// 在 Windows 中可能不需要加这个延时，但是在 macOS 和 Linux 上似乎都是需要的
				// 另外，调试过程中发现，如果尝试使用 debugMessage 把调试消息发送给 renderer，当程序忙的时候 renderer 并不一定会按实际顺序去显示，因此需要适当增加延时以验证 Promise 正常工作
				// 150ms 延迟在 Linux 上很可能不够。但目前的设计是在 renderer 那边自动重试，主进程尽快报告完成。
				setTimeout(() => {
					osBridge.sendLoadStatus('service');
					resolve(undefined);
				}, 150);
			}).catch(() => {
				reject();
			});
		});
	}

	mountIpcEvents(): void {
		// 最小化按钮
		ipcMain.on('minimize', () => {
			this.mainWindow.minimize();
		});

		// 窗口模式按钮
		ipcMain.on('windowmode', () => {
			if (this.mainWindow.isMaximized()) {
				this.mainWindow.unmaximize();
			} else {
				this.mainWindow.maximize();
			}
		});

		// 窗口主动发送的确认关闭通知
		ipcMain.on('exitConfirm', () => {
			this.blockWindowClose = false;
		});

		// 窗口主动发送的关闭通知
		ipcMain.on('close', () => {
			this.mainWindow!.close();
		});

		// 打开 url
		ipcMain.on('jumpToUrl', (event, url: string) => {
			switch (getOs()) {
				case 'MacOS':
					exec('open ' + url);
					break;
				case 'Windows':
					exec('start ' + url);
					break;
				case 'Linux':
					exec('xdg-open' + url);
					break;
			}
		});

		// 打开文件
		ipcMain.on('openFile', (event, url: string) => {
			shell.openPath(url);
		});

		// 将包含多行路径的字符串归类为本地文件、本地目录、远程文件的数量统计，及每行的类型
		ipcMain.handle('getPathsCategorized', async (event, value: string) => {
			const paths = value.split('\n').filter((line) => line !== '');
			// const [localFiles, localDirs, remotes, unknowns] = [[], [], [], []] as string[][];
			let [localFilesCount, localDirsCount, remotesCount, unknownsCount] = [0, 0, 0, 0];
			const lineResults: ('lf' | 'ld' | 'r' | 'u')[] = [];
			for (const path of paths) {
				const fixedPath = path.startsWith('\\\\') ? 'file://' + path.slice(2) : path;	// 由于 node 的 URL 在解析 Windows 网络共享路径时会出错，故手动修一下
				const result = parsePath(fixedPath);
				if (result.parse_failed) {
					// unknowns.push(path);
					unknownsCount++;
					lineResults.push('u');
				} else if (result.host) {
					// remotes.push(path);
					remotesCount++;
					lineResults.push('r');
				} else {
					try {
						const stats = await fs.lstat(path);
						if (stats.isDirectory()) {
							// localDirs.push(path);
							localDirsCount++;
							lineResults.push('ld');
						} else {
							// localFiles.push(path);
							localFilesCount++;
							lineResults.push('lf');
						}
					} catch (e) {
						// unknowns.push(path);
						unknownsCount++;
						lineResults.push('u');
					}
				}
			}
			return { localFilesCount, localDirsCount, remotesCount, unknownsCount, lineResults };
		});

		/**
		 * 列出文件夹内的所有内容
		 * @params path 指定文件夹
		 * @params mode 'getFiles' | 'getDirectories'
		 * @params recursive 是否递归查找子文件夹
		 * @params fullPath 是否返回完整的绝对路径
		 */
		ipcMain.handle('listItemsInDirectory', async (event, options) => {
			async function dfs(basePath: string, recursive = false, fullPath = false) {
				const resultArr: Array<string> = [];
				const directoriesArr: Array<string> = [];
				const filesArr: Array<string> = [];
				const fnd = await fs.readdir(basePath);
				for (const fileName of fnd) {
					const filePath = path.join(basePath, fileName);
					const stats = await fs.stat(filePath);
					if (stats.isFile()) {
						filesArr.push(fullPath ? filePath : fileName);
					}
					if (stats.isDirectory()) {
						directoriesArr.push(fullPath ? filePath : fileName);
					}
				}
				if (options.mode === 'getFiles') {
					resultArr.push(...filesArr);
				}
				if (options.mode === 'getDirectories') {
					resultArr.push(...directoriesArr);
				}
				if (recursive) {
					for (const directory of directoriesArr) {
						const result = await dfs(fullPath ? directory : path.join(basePath, directory), recursive, fullPath);
						resultArr.push(...result.resultArr);
					}
					return { filesArr, directoriesArr, resultArr };
				}
				return {
					filesArr, // 当前文件夹下的所有文件
					directoriesArr, // 当前文件夹下的所有文件夹
					resultArr, // 依据选项查找的结果
				};
			}
	
			const stats = await fs.stat(options.path);
			if (stats.isFile()) {
				return undefined;
			}
			const result = await dfs(options.path, options.recursive, options.fullPath);
			return result.resultArr;
		});

		// 获取本地文件。如果文件大小未超过限制，则计算 hash，返回文件内容、大小，否则只返回大小
		ipcMain.handle('getLocalFile', async (event, url: string, limitSize: number) => {
			const stats = await fs.stat(url);
			if (!stats.isFile()) {
				// 理论上不应出现对非本地文件调用此方法的现象，此处是为了避免用户手动将文件改为文件夹之类的特殊情况
				return { size: 0, file: undefined };
			}
			if (stats.size > limitSize) {
				return { size: stats.size, file: undefined };
			}
			console.log(url, '读取文件');
			const buffer = await fs.readFile(url);
			return { size: stats.size, file: buffer };
		});

		// 闪烁任务栏图标
		ipcMain.on('flashFrame', (event, value) => {
			this.mainWindow!.flashFrame(value);
		});

		// 设置任务栏 / dock 进度状态
		ipcMain.on('setProgressBar', (event, progress: number, options: Electron.ProgressBarOptions | undefined) => {
			this.mainWindow!.setProgressBar(progress * 0.99 + 0.01, options);
			this.mainWindow!.setTitle(`FFBox${['normal', 'paused'].includes(options.mode) ? ` - ${(progress * 100).toFixed(0)}%` : ''}`);
		});

		// 打开开发者工具
		ipcMain.on('openDevTools', () => {
			this.mainWindow!.webContents.openDevTools();
		});

		/**
		 * 启动文件下载流程：
		 * taskitem 双击，发出带有下载 url 的 downloadFile 信号
		 * 主进程打开另存为对话框，记录该 url 对应的保存位置，然后发送 downloadStatusChange 信号，告知主窗口改变 UI
		 * webContents.downloadURL()，mainWindow.webContents.session.on('will-download') 在此处 handle 下载进度，不断向主窗口发送 downloadProgress
		 * 下载完成后再次发送 downloadStatusChange 信号，告知主窗口改变 UI
		 */
		ipcMain.on('downloadFile', (_event, params: { url: string; serverName: string; taskId: number }) => {
			this.mainWindow!.webContents.downloadURL(params.url);
			console.log('发动下载请求：', params.url);
		});

		// 启动一个 ffboxService，这个 ffboxService 目前钦定监听 localhost:33269，而 serviceBridge 会连接此 service
		ipcMain.handle('startService', () => this.createService());

		// osBridge 系列
		ipcMain.on('triggerSystemMenu', () => osBridge.triggerSystemMenu());
		ipcMain.on('triggerSnapLayout', () => osBridge.triggerSnapLayout());
		ipcMain.on('appReady', () => osBridge.sendLoadStatus('app'));
		ipcMain.on('rendererReady', () => osBridge.sendLoadStatus('renderer'));

		// 应用菜单更新
		ipcMain.on('setApplicationMenu', (event, menuStr: string) => {
			const menuTemplate = convertFFBoxMenuToElectronMenuTemplate(menuStr, this.mainWindow.webContents);
			const menu = Menu.buildFromTemplate(menuTemplate as any);
			Menu.setApplicationMenu(menu);	
		});

		// 打开“打开文件”对话框
		ipcMain.handle('showOpenDialog', async (event, options: Electron.OpenDialogOptions) => {
			const result = await dialog.showOpenDialog(this.mainWindow, options);
			return result.canceled ? [] : result.filePaths;
		});
		  
		// 读取 LICENSE 文件
		ipcMain.handle('readLicense', () => {
			return new Promise(async (resolve) => {
				let licensePath = '';
				if (getOs() === 'Windows') {
					licensePath = './LICENSE';
				} else if (getOs() === 'MacOS') {
					licensePath = path.join(process.resourcesPath, '../LICENSE');
				} else if (getOs() === 'Linux') {
					// this.mainWindow.webContents.send('debugMessage', 'service 路径', process.execPath, __dirname, __filename, process.cwd(), path.join(process.execPath, '../FFBoxService'));
					await fs.access('./LICENSE', fs.constants.R_OK).then((result) => {
						licensePath = './LICENSE'; // 通过终端直接执行
					}).catch(() => {});
					await fs.access(path.join(process.cwd(), 'LICENSE'), fs.constants.R_OK).then((result) => {
						licensePath = path.join(process.cwd(), 'LICENSE'); // 无沙箱双击执行、通过终端直接执行
					}).catch(() => {});	
					await fs.access(path.join(process.execPath, '../LICENSE'), fs.constants.R_OK).then((result) => {
						licensePath = path.join(process.execPath, '../LICENSE'); // AppImage 双击执行（/tmp 目录）、deb 安装后双击执行（/opt/FFBox/）
					});
				}		
				fs.readFile(licensePath, { encoding: 'utf-8' }).then((data) => {
					const cipherText = CryptoJS.SHA1(data);
					if (['c10a2191115c97595e0f0bbb4a127547c9ebb59e', '4e994ccf17287387cf8bf155ad40f30ad5ca5f38'].includes(cipherText.toString())) {
						// 两个校验码，适配 LF 换行符和 CRLF 换行符
						resolve(data);
					} else {
						resolve(undefined);
					}
				}).catch(() => {
					resolve(undefined);
				});
			});
		});

		// 半透明窗体
		ipcMain.on('setBlurBehindWindow', (event, on: boolean) => {
			switch (getOs()) {
				case 'MacOS':
					this.mainWindow.setVibrancy(on ? 'window' : 'window');
					break;
				case 'Windows':
					// this.mainWindow.setBackgroundMaterial(on ? 'mica' : 'none');
					// this.mainWindow.setDarkTheme();
					// this.mainWindow.setMicaEffect();
					mica.setBlur(this.mainWindow, on);					
					break;
			}
		});

		// 原 electron-store 功能
		ipcMain.handle('localConfig', (event, type: 'get' | 'set' | 'delete', key: string, value?: string) => {
			if (type === 'get') {
				return localConfig.get(key);
			} else if (type === 'set') {
				return localConfig.set(key, value);
			} else {
				return localConfig.delete(key);
			}
		});
	}
}

new ElectronApp();
