import { VNodeRef } from 'vue';
import { defineStore } from 'pinia';
import CryptoJS from 'crypto-js';
import { Notification, NotificationLevel, OutputParams, TaskStatus, TransferStatus, WorkingStatus } from '@common/types';
import { version } from '@common/constants'; 
import { Server } from '@renderer/types';
import { defaultParams } from "@common/defaultParams";
import { ServiceBridge, ServiceBridgeStatus } from '@renderer/bridges/serviceBridge'
import { getInitialUITask, randomString, replaceOutputParams } from '@common/utils';
import path from '@common/path';
import { handleCmdUpdate, handleFFmpegVersion, handleProgressUpdate, handleTasklistUpdate, handleNotificationUpdate, handleTaskUpdate, handleWorkingStatusUpdate } from './eventsHandler';
import nodeBridge from '@renderer/bridges/nodeBridge';
import { dashboardTimer } from '@renderer/common/dashboardCalc';
import Popup from '@renderer/components/Popup/Popup';

const { trimExt } = path;

interface StoreState {
	// 界面类
	showMenuCenter: 0 | 1 | 2; // 0：关闭　1：开启菜单栏　2：全开
	showInfoCenter: boolean;
	paraSelected: number,
	draggerPos: number,
	taskViewSettings: {
		showParams: boolean,
		showDashboard: boolean,
		showCmd: boolean,
		cmdDisplay: 'input' | 'output',
		paramsVisibility: {
			duration: 'all' | 'input' | 'none',
			format: 'all' | 'input' | 'none',
			smpte: 'all' | 'input' | 'none',
			video: 'all' | 'input' | 'none',
			audio: 'all' | 'input' | 'none',
		},
	},
	frontendSettings: {
		colorTheme: string,
		useIEC: boolean,
	},
	showGlobalParams: boolean,
	unreadNotificationCount: number,
	componentRefs: { [key: string]: VNodeRef | Element },
	// 非界面类
	notifications: Notification[],
	servers: Server[];
	currentServerId: string;
	selectedTask: Set<number>,
	globalParams: OutputParams;
	presetName: string | undefined;
	availablePresets: string[];
	downloadMap: Map<string, { serverId: string, taskId: number }>;
	functionLevel: number;
}

// useStore 可以是 useUser、useCart 之类的任何东西
// 第一个参数是应用程序中 store 的唯一 id
export const useAppStore = defineStore('app', {
	// other options...
	// 推荐使用 完整类型推断的箭头函数
	state: (): StoreState => {
		return {
			// 所有这些属性都将自动推断其类型
			// 界面类
			showMenuCenter: 0,
			showInfoCenter: false,
			paraSelected: 1,
			draggerPos: 0.57,
			taskViewSettings: {
				showParams: true,
				showDashboard: true,
				showCmd: true,
				cmdDisplay: 'input',
				paramsVisibility: {
					duration: 'none',
					format: 'none',
					smpte: 'none',
					video: 'none',
					audio: 'none',
				},
			},
			frontendSettings: {
				colorTheme: 'themeLight',
				useIEC: false,
			},
			showGlobalParams: true,
			unreadNotificationCount: 0,
			componentRefs: {},
			// 非界面类
			notifications: [],
			servers: [],
			currentServerId: undefined,
			selectedTask: new Set(),
			globalParams: JSON.parse(JSON.stringify(defaultParams)),
			presetName: '',
			availablePresets: [],
			downloadMap: new Map(),
			functionLevel: 20,
		};
	},
	getters: {
		currentServer: (state) => {
			return state.servers.find((server) => server.data.id === state.currentServerId);
		},
		localServer: (state) => {
			return state.servers.length && state.servers[0].entity.ip === 'localhost' ? state.servers[0] : undefined;
		},
	},
	actions: {
		// #region 纯 UI
		// #endregion 纯 UI
		// #region 任务处理
		/**
		 * 添加一系列任务。仅支持本地文件和远程路径，本地文件夹需展开后再传入，未知路径传入无效
		 */
		addTasks (inputList: string[] | FileList) {
			async function checkAndUploadFile(filename: string, fileInfo: { size: number, file: Buffer | Blob }, id: number) {
				const { file } = fileInfo;
				let buffer: Buffer | ArrayBuffer;
				if (file instanceof Blob) {
					const reader = new FileReader();
					reader.readAsArrayBuffer(file);
					buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
						reader.addEventListener('loadend', () => {
							resolve(reader.result as ArrayBuffer);
						})
					});
				} else {
					buffer = file;
				}
				console.log(filename, '开始计算文件校验码');
				const wordArray = CryptoJS.lib.WordArray.create(buffer as any);
				let hash = CryptoJS.SHA1(wordArray).toString();
				console.log(filename, '校验码：' + hash);		

				fetch(`http://${server.entity.ip}:${server.entity.port}/upload/check/`, {
					method: 'post',
					body: JSON.stringify({
						hashs: [hash]
					}),
					headers: new Headers({
						'Content-Type': 'application/json'
					}),
				}).then((response) => {
					response.text().then((text) => {
						let content = JSON.parse(text) as number[];
						if (content[0] % 2) {
							console.log(filename, '已缓存');
							server.entity.mergeUploaded(id, [hash]);
						} else {
							console.log(filename, '未缓存');
							uploadFile(id, hash, filename, buffer);
						}
					})
				});
			}
			function uploadFile(id: number, hash: string, filename: string, buffer: Buffer | ArrayBuffer) {
				const currentServer = 这.currentServer.data;
				const task = currentServer.tasks[id];
				task.transferStatus = TransferStatus.uploading;
				task.transferProgressLog.total = buffer instanceof ArrayBuffer ? buffer.byteLength : buffer.length;
				const lastStarted = new Date().getTime() / 1000;
				task.transferProgressLog.lastStarted = lastStarted;
				const form = new FormData();
				form.append('name', hash);
				// form.append('file', file);
				const file_blob = new Blob([buffer]);
				form.append('file', file_blob, hash);
				const xhr = new XMLHttpRequest;
				xhr.upload.addEventListener('progress', (event) => {
					// let progress = event.loaded / event.total;
					const transferred = task.transferProgressLog.transferred;
					transferred.push([new Date().getTime() / 1000 - lastStarted, event.loaded]);
				}, false);
				xhr.onreadystatechange = function (e) {
					if (xhr.readyState !== 0) {
						if (xhr.status >= 400 && xhr.status < 500) {
							Popup({
								message: `【${filename}】网络请求故障，上传失败`,
								level: NotificationLevel.error,
							})
						} else if (xhr.status >= 500 && xhr.status < 600) {
							Popup({
								message: `【${filename}】服务器故障，上传失败`,
								level: NotificationLevel.error,
							})
						}
					}
				}
				xhr.onload = function () {
					console.log(filename, `发送完成`);
					server.entity.mergeUploaded(id, [hash]);
					task.transferStatus = TransferStatus.normal;
					clearInterval(task.dashboardTimer);
					task.dashboardTimer = NaN;
				}
				xhr.open('post', `http://${server.entity.ip}:${server.entity.port}/upload/file/`, true);
				// xhr.setRequestHeader('Content-Type', 'multipart/form-data');
				xhr.send(form);
				task.dashboardTimer = setInterval(dashboardTimer, 50, task) as any;
			}
			const 这 = useAppStore();
			const server = 这.currentServer;
			const isRemoteService = server.entity.ip !== 'localhost';
			const newlyAddedTaskIds: Promise<number>[] = [];
			let dropDelayCount = 0;
			for (const input of inputList) {
				setTimeout(async () => {	// v2.4 版本开始完全可以不要延时，但是太生硬，所以加个动画
					const filename = typeof input === 'string' ? path.parse(input).name : input.name;
					const fileType = typeof input === 'string' ? (await nodeBridge.getPathsCategorized(input)).lineResults?.[0] : 'lf';
					const needUpload = fileType === 'lf' && isRemoteService;	// 网页版必定是 remoteService；如果拖入的是文件而不是字符串那么必定是 lf（以后再支持文件夹拖入）
					// console.log('添加任务', input, fileType);
					let fileInfo: { size: number, file: Buffer | Blob };
					if (needUpload) {
						const limitedFileSizeMB = isRemoteService ? (这.functionLevel >= 60 ? 192 : 127) : Infinity;
						// 超过约 200MB 的文件在进行 CryptoJS.SHA1 时会导致页面崩溃
						fileInfo = typeof input === 'string' ? await nodeBridge.getLocalFile(input, limitedFileSizeMB * 1000 * 1000) : { file: input, size: input.size };
						if (fileInfo.size > limitedFileSizeMB * 1000 * 1000) {
							Popup({
								message: `${filename} 文件大小超过 ${limitedFileSizeMB} MB，暂不支持上传操作`,
								level: 2,
							});
							return;
						}
					}
					let promise: Promise<number> = 这.addTask(trimExt(filename), needUpload ? '' : (typeof input === 'string' ? input : input.path));	// 网页版拖入文件必定上传，electron 版拖入文件则直接以路径输入
					if (needUpload) {
						promise.then((id) => {
							checkAndUploadFile(filename, fileInfo, id);
						});
					}
					newlyAddedTaskIds.push(promise);
					if (newlyAddedTaskIds.length === inputList.length) {
						Promise.all(newlyAddedTaskIds).then((ids) => {
							这.selectedTask = new Set(ids);
							// addTask 函数已经把当前的 globalParams 传了过去，因此后端在处理完成之后参数设置就与前端一样，无需 applySelectedTask
							// 在进行到这个步骤的时候，还没有收到 taskUpdate，因此不能 applySelectedTask，否则会导致参数为空
							// 这.applySelectedTask();
						})
					}
				}, dropDelayCount);
				// console.log(dropDelayCount)
				dropDelayCount += 33.33;
			}
		},
		/**
		 * 添加任务
		 * path 将自动添加到 params 中去
		 * @param path 输入文件（仅支持 1 个）的路径。若为远程任务则留空
		 */
		addTask(baseName: string, path?: string): Promise<number> {
			const 这 = useAppStore();
			const currentBridge = 这.currentServer?.entity;
			if (!currentBridge) {
				return;
			}
			const params: OutputParams = JSON.parse(JSON.stringify(这.globalParams));
			params.input.files.push({
				filePath: path ? path.replace(/\\/g, '/') : undefined,
			});
			const result = currentBridge.taskAdd(baseName, params);
			return result;
		},
		/**
		 * 获取 service 的 taskList 更新到本地
		 */
		updateTaskList(server: Server) {
			const 这 = useAppStore();
			fetch(`http://${server.entity.ip}:${server.entity.port}/task`, {
				method: 'get',
			}).then((response) => {
				response.text().then((text) => {
					let content = JSON.parse(text) as number[];
					handleTasklistUpdate(server, content);
					这.recalcChangedParams();
				});
			});
		},
		/**
		 * 获取 service 的 task 更新到本地
		 */
		updateTask(server: Server, taskId: number) {
			const 这 = useAppStore();
			fetch(`http://${server.entity.ip}:${server.entity.port}/task/${taskId}`, {
				method: 'get',
			}).then((response) => {
				response.text().then((text) => {
					let content = JSON.parse(text);
					handleTaskUpdate(server, taskId, content);
					这.recalcChangedParams();
				});
			});
		},
		/**
		 * 修改已选任务项后调用
		 * 函数将使用已选择的任务项替换 globalParameters
		 */
		applySelectedTask() {
			const 这 = useAppStore();
			if (这.selectedTask.size > 0) {
				for (const id of 这.selectedTask) {
					这.globalParams = replaceOutputParams(这.currentServer.data.tasks[id].after, 这.globalParams);
				}
			}
		},
		startNpause () {
			const 这 = useAppStore();
			if (这.currentServer.entity.status !== ServiceBridgeStatus.Connected) {
				return;
			}
			const data = 这.currentServer.data;
			const entity = 这.currentServer.entity;
			if (data.workingStatus === WorkingStatus.idle) {		// 开始任务
				entity.queueStart();
			} else {
				entity.queuePause();
			}
		},
		// #endregion 任务处理
		// #region 参数处理
		/**
		 * 修改 globalParams 后需调用此函数
		 * 函数将修改后的全局参数应用到当前选择的任务项，然后保存到本地磁盘
		 * 对于用户操作，将预设参数置为未保存
		 */
		applyParameters(isUserInteraction = true) {
			const 这 = useAppStore();
			// 更改到一些不匹配的值后会导致 getFFmpegParaArray 出错，但是修正代码就在后面，因此仅需忽略它，让它继续运行下去，不要急着更新
			// let currentServer = state.servers[state.currentServerName];
			// let currentBridge = state.serviceBridges[state.currentServerName];
			const entity = 这.currentServer?.entity;
			const data = 这.currentServer?.data;
			if (data) {
				if (isUserInteraction) {
					这.globalParams.extra.presetName = '';
				}
				这.globalParams
				// 收集需要批量更新的输出参数，交给 service。同时本地替换一次 task.after
				let needToUpdateIds: number[] = [];
				for (const id of 这.selectedTask) {
					let task = data.tasks[id];
					task.after = replaceOutputParams(这.globalParams, task.after);
					needToUpdateIds.push(id);
				}
				if (needToUpdateIds.length) {
					// paraArray 由 service 算出后回填本地
					// 更新方式是 taskUpdate
					// 注意回填本地时也会产生一次 task.after 更新
					entity.setParameter(needToUpdateIds, 这.globalParams);
				}
			}

			// 存盘
			clearTimeout((window as any).saveAllParaTimer);
			(window as any).saveAllParaTimer = setTimeout(() => {
				nodeBridge.localStorage.set('input', 这.globalParams.input);
				nodeBridge.localStorage.set('video', 这.globalParams.video);
				nodeBridge.localStorage.set('audio', 这.globalParams.audio);
				nodeBridge.localStorage.set('output', 这.globalParams.output);
				console.log('参数已保存');
			}, 700);

			// 变更预设参数
			if (isUserInteraction) {
				这.presetName = '';
			}
		},
		/**
		 * 检查有多少参数是非“不重新编码”的，以此更改界面显示形式（paramsVisibility）
		 * 在服务器初次加载和修改参数时调用
		 */
		recalcChangedParams() {
			const 这 = useAppStore();
			const paramsVisibility = {
				duration: 0,
				format: 0,
				smpte: 0,
				video: 0,
				audio: 0,
			};
			for (const [index, task] of Object.entries(这.currentServer?.data.tasks) || []) {
				if (index === '-1') {
					continue;
				}
				const after = task.after;
				if (after.input.begin || after.input.end || after.output.begin || after.output.end) {
					paramsVisibility.duration = Math.max(paramsVisibility.duration, 2);
				} else {
					paramsVisibility.duration = Math.max(paramsVisibility.duration, 1);
				}
				if (after.output.format === '无' || after.output.format === task.before.format) {
					paramsVisibility.format = Math.max(paramsVisibility.format, 1);
				} else {
					paramsVisibility.format = Math.max(paramsVisibility.format, 2);
				}
				if (after.video.vcodec !== '禁用视频') {
					if (after.video.vcodec !== '不重新编码') {
						paramsVisibility.video = Math.max(paramsVisibility.video, 2);
						if (after.video.resolution !== '不改变' || task.after.video.framerate !== '不改变') {
							paramsVisibility.smpte = Math.max(paramsVisibility.smpte, 2);
						} else {
							paramsVisibility.smpte = Math.max(paramsVisibility.smpte, 1);
						}
					} else {
						paramsVisibility.video = Math.max(paramsVisibility.video, 1);
					}
				}
				if (after.audio.acodec !== '禁用音频') {
					if (after.audio.acodec !== '不重新编码') {
						paramsVisibility.audio = Math.max(paramsVisibility.audio, 2);
					} else {
						paramsVisibility.audio = Math.max(paramsVisibility.audio, 1);
					}
				}
			}
			这.taskViewSettings.paramsVisibility = {
				duration: (['none', 'input', 'all'] as any)[paramsVisibility.duration],
				format: (['none', 'input', 'all'] as any)[paramsVisibility.format],
				smpte: (['none', 'input', 'all'] as any)[paramsVisibility.smpte],
				video: (['none', 'input', 'all'] as any)[paramsVisibility.video],
				audio: (['none', 'input', 'all'] as any)[paramsVisibility.audio],
			};
			// console.log('recalcChangedParams', 这.taskViewSettings.paramsVisibility);
		},
		/**
		 * 按名称载入预设并更新配置（含所选任务配置）
		 */
		loadPreset(name: string) {
			const 这 = useAppStore();
			if (name === '默认配置') {
				return new Promise((resolve) => {
					这.globalParams = JSON.parse(JSON.stringify(defaultParams));
					这.presetName = name;
					这.applyParameters(false);
					resolve(undefined);
				})
			} else {
				return nodeBridge.localStorage.get(`presets.${name}`).then((params) => {
					if (params) {
						这.globalParams.input = params.input;
						这.globalParams.video = params.video;
						这.globalParams.audio = params.audio;
						这.globalParams.output = params.output;
						这.globalParams.extra.presetName = name;
					}
					这.presetName = name;
					这.applyParameters(false);
				});
			}
		},
		savePreset(name: string) {
			const 这 = useAppStore();
			return nodeBridge.localStorage.set(`presets.${name}`, 这.globalParams).then(() => {
				这.presetName = name;
				这.loadPresetList();
			});
		},
		editPreset(oldName: string, newName: string) {
			const 这 = useAppStore();
			async function f() {
				const oldPreset = await nodeBridge.localStorage.get(`presets.${oldName}`);
				nodeBridge.localStorage.set(`presets.${newName}`, oldPreset);
				if (newName !== oldName) {
					nodeBridge.localStorage.delete(`presets.${oldName}`);
				}
				这.presetName = newName;
				这.loadPresetList();
			}
			return f();
		},
		deletePreset(name: string) {
			const 这 = useAppStore();
			return nodeBridge.localStorage.delete(`presets.${name}`).then(() => {
				这.presetName = '';
				这.loadPresetList();
			});
		},
		/**
		 * 通过 electronStore.get('presets') 得到的 key 更新当前可用的预设菜单
		 */
		loadPresetList() {
			const 这 = useAppStore();
			nodeBridge.localStorage.get('presets').then((presets) => {
				try {
					这.availablePresets = Object.keys(presets);
				} catch (error) {
					nodeBridge.localStorage.set('presets', {});
				}
			});
		},
		// #endregion 参数处理
		// #region 通知处理
		/**
		 * 获取 service 的 notifications 更新到本地
		 */
		updateNotifications(server: Server) {
			const 这 = useAppStore();
			fetch(`http://${server.entity.ip}:${server.entity.port}/notification`, {
				method: 'get',
			}).then((response) => {
				response.text().then((text) => {
					let content = JSON.parse(text);
					server.data.notifications = content;
				});
			});
		},
		pushMsg(message: string, level: NotificationLevel) {
			const 这 = useAppStore();
			Popup({ message, level });
			这.notifications.push({
				time: new Date().getTime(),
				taskId: -1,
				content: message,
				level,
			})
		},
		setUnreadNotifationCount(clear = false) {
			const 这 = useAppStore();
			这.unreadNotificationCount = clear ? 0 : 这.unreadNotificationCount + 1;
		},
		// #endregion 通知处理
		// #region 服务器处理
		/**
		 * 获取 service 的版本和属性更新到本地
		 */
		updateServerProperties(server: Server) {
			const 这 = useAppStore();
			Promise.all([
				fetch(`http://${server.entity.ip}:${server.entity.port}/version`, { method: 'get' }),
				fetch(`http://${server.entity.ip}:${server.entity.port}/properties`, { method: 'get' }),
			]).then(([versionResponse, propertiesResponse]) => {
				versionResponse.text().then((text) => {
					server.data.version = text;
					if (['3.0', '4.0', '4.1', '4.2'].includes(text)) {
						Popup({ message: `服务器版本 ${text} 与客户端版本 ${version} 不兼容，请更换服务器或客户端`, level: NotificationLevel.warning });
					} else if (text !== version) {
						Popup({ message: `服务器版本 ${text} 与客户端版本不匹配，可能会导致部分操作异常，请谨慎操作`, level: NotificationLevel.warning });
					}
				});
				propertiesResponse.json().then((obj) => {
					server.data.os = obj.os;
					server.data.isSandboxed = obj.isSandboxed;
					server.data.machineId = obj.machineId;

					// 自动激活前端
					if (server.entity.ip === 'localhost') {
						nodeBridge.localConfig.get('userInfo.activationCode').then((value) => {
							const result = 这.activate(value, true);
							console.log('激活结果', result);
						});					
					}
				});
			});
		},
		/**
		 * 添加服务器标签页
		 */
		addServer() {
			const 这 = useAppStore();
			const id = randomString(6);
			这.servers.push({
				data: {
					id: id,
					name: '未连接',
					tasks: [],
					notifications: [],
					ffmpegVersion: '',
					version: '',
					workingStatus: WorkingStatus.idle,
					progress: 0,
					overallProgressTimerID: NaN,
				},
				entity: new ServiceBridge(),
			});
			这.currentServerId = id;
			return id;
		},
		/**
		 * 关闭服务器标签页
		 * TODO 暂未实现上传下载中断逻辑
		 */
		removeServer(serverId: string) {
			const 这 = useAppStore();
			const index = 这.servers.findIndex((server) => server.data.id === serverId);
			if (index > -1) {
				这.servers.splice(index, 1);
			}
			if (这.currentServerId === serverId) {
				这.currentServerId = 这.servers[index - 1].data.id;
			}
		},
		/**
		 * 初始化服务器连接并挂载事件监听
		 */
		initializeServer(serverId: string, ip: string, port: number, retryCount = 0) {
			const 这 = useAppStore();
			const server = 这.servers.find((server) => server.data.id === serverId) as Server;
			const entity = server.entity;
			if (!ip) {
				return;
			}
			const _port = port ?? 33269;
			console.log('初始化服务器连接', server.data);
			entity.connect(ip, _port);

			entity.on('connected', () => {
				server.data.name = ip === 'localhost' ? '本地服务器' : ip;
				console.log(`成功连接到服务器 ${server.entity.ip}`);
				这.pushMsg(`成功连接到服务器 ${server.data.name}`, NotificationLevel.ok);

				entity.on('ffmpegVersion', (data) => {
					handleFFmpegVersion(server, data.content);
				});
				entity.on('workingStatusUpdate', (data) => {
					handleWorkingStatusUpdate(server, data.value);
				});
				entity.on('tasklistUpdate', (data) => {
					handleTasklistUpdate(server, data.content);
					这.recalcChangedParams();
				});
				entity.on('taskUpdate', (data) => {
					handleTaskUpdate(server, data.taskId, data.task);
					这.recalcChangedParams();
				});
				entity.on('cmdUpdate', (data) => {
					handleCmdUpdate(server, data.taskId, data.content);
				});
				entity.on('progressUpdate', (data) => {
					handleProgressUpdate(server, data.taskId, data.time, data.status, 这.functionLevel);
				});
				entity.on('notificationUpdate', (data) => {
					handleNotificationUpdate(server, data.notificationId, data.notification);
				});

				这.updateServerProperties(server);
				// 这.updateGlobalTask(server);
				这.updateTask(server, -1);
				这.updateTaskList(server);
				// entity.updateTaskList();
				这.updateNotifications(server);
			});
			const destroy = () => {
				for (const eventName of ['connected', 'disconnected', 'error', 'ffmpegVersion', 'workingStatusUpdate', 'tasklistUpdate', 'taskUpdate', 'cmdUpdate', 'progressUpdate', 'taskNotification'] as any[]) {
					entity.removeAllListeners(eventName);
				}
			}
			entity.on('disconnected', () => {
				console.log(`已断开服务器 ${server.entity.ip} 的连接`);
				destroy();
				这.pushMsg(`已断开服务器 ${server.data.name} 的连接`, NotificationLevel.warning);
			});
			entity.on('error', () => {
				if (!retryCount) {
					console.log(`服务器 ${server.entity.ip} 连接出错，建议检查网络连接或防火墙`);
					这.pushMsg(`服务器 ${server.data.name} 连接出错，建议检查网络连接或防火墙`, NotificationLevel.error);
				} else {
					console.log(`服务器 ${server.entity.ip} 连接失败，剩余重试次数 ${retryCount}`);
					setTimeout(() => {
						这.initializeServer(serverId, ip, port, retryCount - 1);
					}, 150);
				}
				destroy();
			});
		},
		/**
		 * 重新连接已掉线或未成功连接的服务器
		 */
		reConnectServer(serverId: string) {
			const 这 = useAppStore();
			const server = 这.servers.find((server) => server.data.id === serverId) as Server;
			这.initializeServer(serverId, server.entity.ip, server.entity.port);
		},
		// #endregion 服务器处理
		// #region 其他
		activate(userInput: string, frontendOnly = false): number | false {
			const 这 = useAppStore();
			if (nodeBridge.env === 'electron') {
				/**
				 * 客户端和管理端均使用机器码 + 固定码共 32 位作为 key
				 * 管理端使用这个 key 对 functionLevel 加密，得到的加密字符串由用户输入到 userInput 中去
				 * 客户端将 userInput 使用 key 解密，如果 userInput 不是瞎编的，那么就能解出正确的 functionLevel
				 */
				const machineId = 这.localServer?.data.machineId ?? '';
				const fixedCode = 'd324c697ebfc42b7';
				const key = machineId + fixedCode;
				const decrypted = CryptoJS.AES.decrypt(userInput, key)
				const decryptedString = CryptoJS.enc.Utf8.stringify(decrypted);
				if (parseInt(decryptedString).toString() === decryptedString) {
					这.functionLevel = parseInt(decryptedString);
					if (!frontendOnly) {
						这.currentServer.entity.activate(userInput);
					}
					nodeBridge.localConfig.set('userInfo.activationCode', userInput);
					return parseInt(decryptedString);
				} else {
					return false;
				}
			}
		},
		/**
		 * 修改前端设置后调用
		 * 函数将修改后的全局参数应用到当前选择的任务项，然后保存到本地磁盘
		 * 对于用户操作，进行存盘
		 */
		applyFrontendSettings(isUserInteraction: boolean) {
			const 这 = useAppStore();

			if (isUserInteraction) {
				// 存盘
				clearTimeout((window as any).saveAllParaTimer);
				(window as any).saveAllParaTimer = setTimeout(() => {
					nodeBridge.localStorage.set('frontendSettings', 这.frontendSettings);
					console.log('设置已保存');
				}, 700);
			}

			document.body.className = 这.frontendSettings.colorTheme;
			if (这.frontendSettings.colorTheme === 'themeAcrylic') {
				nodeBridge.setBlurBehindWindow(true);
			} else {
				nodeBridge.setBlurBehindWindow(false);
			}
			// document.body.setAttribute('data-color_theme', 这.frontendSettings.colorTheme);

			window.frontendSettings.useIEC = 这.frontendSettings.useIEC;
		},
		
		// #endregion 其他
	},
});
