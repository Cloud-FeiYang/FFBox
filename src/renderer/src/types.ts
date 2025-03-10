import { Task, TransferStatus, SingleProgressLog, WorkingStatus, Notification } from '@common/types';
import { ServiceBridge } from '@renderer/bridges/serviceBridge'

export interface UITask extends Task {
	dashboard: {
		progress: number;
		bitrate: number;
		speed: number;
		time: number;
		frame: number;
		size: number;	// kB
		transferred: number;
		transferSpeed: number;
	};
	dashboard_smooth: {
		progress: number;
		bitrate: number;
		speed: number;
		time: number;
		frame: number;
		size: number;	// kB
		transferred: number;	// B
		transferSpeed: number;	// Bps
	};
	dashboardTimer: number;
	transferStatus: TransferStatus;
	transferProgressLog: {
		transferred: SingleProgressLog;	// B
		total: number;					// B
		lastStarted: number; 	// s
		elapsed: number;		// s　暂停才更新一次，因此记录的并不是实时的任务时间
		lastPaused: number;		// s　既用于暂停后恢复时计算速度，也用于统计任务耗时
	};
}

export interface ServerData {
	id: string;			// 仅供前端一次性使用
	name: string;		// 默认为空
	nickName?: string;	// 暂不支持
	tasks: UITask[];
	notifications: Notification[];
	ffmpegVersion: string;
	version?: string;
	os?: 'Windows' | 'Linux' | 'MacOS' | 'unknown';
	isSandboxed?: boolean;
	machineId?: string;
	workingStatus: WorkingStatus;
	progress: number;	// 由每个任务更新时计算出来
	overallProgressTimerID: any;
}

export interface Server {
	data: ServerData;
	entity: ServiceBridge;
}
