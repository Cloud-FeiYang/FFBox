import type { FFmpeg } from '@backend/FFmpegInvoke';

export interface FFBoxServiceInterface {
	initFFmpeg(): void;
	emitFFmpegVersion(): void;
	taskAdd(taskName: string, outputParams?: OutputParams): Promise<number>;
	mergeUploaded(id: number, hashs: Array<string>): void;
	taskDelete(id: number): void;
	taskStart(id: number): void;
	taskPause(id: number): void;
	taskResume(id: number): void;
	taskReset(id: number): void;
	queueStart(): void;
	queuePause(): void;
	deleteNotification(taskId: number, index: number): void;
	setParameter(ids: Array<number>, param: OutputParams): void;
	activate(activationCode: string): boolean | void;
	trailLimit_stopTranscoding(id: number, byFrontend?: boolean): void;
}

export interface FFBoxServiceEventParam {
	ffmpegVersion: { content: string };
	workingStatusUpdate: { value: 'start' | 'stop' | 'pause' };	// 此处不使用 WorkingStatus 的原因是：任务列表与任务状态是通过两个消息传送的，到达顺序不可保证，因此需要由后端告知工作状态停止是暂停还是停止，否则前端无法判断
	tasklistUpdate: { content: number[] };
	taskUpdate: { taskId: number; task: Task };
	cmdUpdate: { taskId: number; content: string; append: boolean };	// 由 append 确定是增量还是全量更新
	progressUpdate: { taskId: number; time: number; status?: FFmpegProgress };	// 增量更新（status 未定义则为清空）
	notificationUpdate: { notificationId: number; notification?: Notification };	// 增量（notification 未定义则为删除）
}

export type FFBoxServiceEvent = {
	[K in keyof FFBoxServiceEventParam]: (arg: FFBoxServiceEventParam[K]) => void;
};

export type FFBoxServiceEventApi = {
	event: keyof FFBoxServiceEventParam;
	payload: FFBoxServiceEventParam[keyof FFBoxServiceEventParam];
};

export interface FFBoxServiceFunctionApi {
	function: keyof FFBoxServiceInterface;
	args: Parameters<FFBoxServiceInterface[keyof FFBoxServiceInterface]>;	// 数组形式，按顺序传入参数
}

export interface OutputParams {
	input: OutputParams_input;
	video: OutputParams_video;
	audio: OutputParams_audio;
	output: OutputParams_output;
	extra: OutputParams_extra;
}

export type OutputParams_input = {
	mode: 'standalone';
	// 暂定 begin end 仅支持在独立模式下切割时长
	begin?: string;
	end?: string;
} & {
	files: Array<InputFile>;
	hwaccel: string;
	custom?: string;
};

export type OutputParams_video = {
	vcodec: string;
	vencoder: string;
	resolution: string;
	framerate: string;
	ratecontrol: string;
	ratevalue: number | string;
	detail: Record<string, any>;
	custom?: string;
}

export type OutputParams_audio = {
	acodec: string;
	aencoder: string;
	ratecontrol: string;
	ratevalue: number | string;
	vol: number;
	detail: Record<string, any>;
	custom?: string;
};

export type OutputParams_output = {
	format: string;
	moveflags: boolean;
	filename: string;
	begin?: string;
	end?: string;
	custom?: string;
};

export type OutputParams_extra = {
	presetName?: string;
}

export interface InputFile {
	filePath?: string;		// 本地模式下直接是文件全路径，网络模式下 merge 之后获得的文件名填充到此处
}

export enum TaskStatus {
	deleted = 'deleted',
	initializing = 'initializing',
	idle = 'idle',
	idle_queued = 'idle_queued',
	running = 'running',
	paused = 'paused',
	paused_queued = 'paused_queued',
	stopping = 'stopping',
	finishing = 'finishing',
	finished = 'finished',
	error = 'error',
}

export enum TransferStatus {
	normal = 'normal',
	uploading = 'uploading',
	downloading = 'downloading',
}

export interface FFmpegProgress {
	frame: number;
	fps: number;
	q: number;
	size: number;		// kB
	time: number;		// 秒
	bitrate: number;	// kbps
	speed: number;
}

export enum NotificationLevel {
	info = 0,
	ok = 1,
	warning = 2,
	error = 3,
}

export interface Notification {
	time: number;
	taskId: number;
	content: string;
	level: NotificationLevel;
}

export type SingleProgressLog = Array<[number, number]>;

/**
 * 文件路径处理规则：
 * 添加任务时调用 mainVue 的 addTask，传入 baseName，并且把输入添加到 input.files 中。但此项中的 filePath 属性，本地任务直接添加绝对路径，远程任务则留空
 * FFBoxService 收到指令后直接加入到任务列表。然后，本地任务直接 gen 一个 paraArray，远程任务需要马上 gen 一个 outputFile，然后才 gen paraArray
 * 远程任务上传完成后调用 mergeUploaded，然后把刚才留空的路径用 hash 补上。
 * 此时，任务均具有 fileBaseName 属性。对于本地任务，input.files 具有绝对路径，outputFile 暂时留空；对于远程任务，input.files 具有绝对路径（但文件名是 hash），outputFile 具有绝对路径（但文件名是 hash.[ext]）
 * 任务开始时，本地任务根据输出参数 gen 一个 outputFile（不参与到 paraArray 中，只是为了后续打开文件），远程任务直接使用之前计算的 outputFile 对 paraArray 进行 override
 * 任务结束后，双击任务时，本地任务直接打开 outputFile 的文件，远程任务则弹出文件保存窗口，然后通过 IPC 触发 webContents.downloadURL，继而触发 will-download 事件
 */
export interface Task {
	fileBaseName: string;
	before: {
		format: string;
		duration: number;
		vcodec: string;
		acodec: string;
		vresolution: string;
		vframerate: number;
		vbitrate: number;
		abitrate: number;
	};
	after: OutputParams;
	paraArray: Array<string>;
	status: TaskStatus;
	progressLog: {
		time: SingleProgressLog;
		frame: SingleProgressLog;
		size: SingleProgressLog;
		// 涉及到的时间单位均为 s
		lastStarted: number;
		elapsed: number;		// 暂停才更新一次，因此记录的并不是实时的任务时间
		lastPaused: number;		// 既用于暂停后恢复时计算速度，也用于统计任务耗时
	};
	cmdData: string;
	errorInfo: Array<string>;
	// notifications: Array<Notification>;
	outputFile: string;		// 对于本地任务，表示生成文件的绝对路径；对于远程任务，则为 basename（自动生成的字符串） + ext，在 taskAdd 和调节参数之后生成文件名。
}

export interface ServiceTask extends Task {
	ffmpeg: FFmpeg | null;
	// TODO
	// ffmpeg: any | null;
	remoteTask: boolean;	// 本地/远程任务对于 service 来说，对输出文件名的处理方式不同；对于 UI 来说，只需要判断 IP 是否为 localhost 即决定是下载还是直接打开了
}

export enum WorkingStatus {
	idle = 'idle',
	running = 'running',
}

export interface NormalApiWrapper<T> {
	status: number;
	message: string;
	data: T;
}

export interface FFBoxVersion {
	version: string;
	buildNumber: number;
}
