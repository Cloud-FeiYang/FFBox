import { computed, defineComponent, onMounted, onUnmounted, ref } from "vue";
import { TaskStatus, TransferStatus } from "@common/types";
import { UITask } from "@renderer/types";
import { useAppStore } from "@renderer/stores/appStore";
import RadioList, { Props as RadioListProps } from '@renderer/containers/MainFrame/MainArea/ParaBox/components/RadioList.vue';
import Msgbox from "../Msgbox/Msgbox";
import { calcDashboard, getOutputDuration } from "@renderer/common/dashboardCalc";
import style from './ProgressInfo.tsx.module.less';

type ChartType = 'progress' | 'size' | 'bitrate' | 'speed' | 'transferProgress' | 'transferSpeed';

/**
 * |  属性名  |    横轴    |      纵轴      |  斜率  |纵轴满时横轴值|  中文名  |
 * | progress |  转码耗时  |时间或帧数百分比|  速度  | 预估剩余时间 |   进度   |
 * |   size   | 时间或帧数 |    输出大小    |  码率  | 预估输出大小 |  数据量  |
 * |  bitrate | 时间或帧数 |    输出大小    |    -   |       -      | 码率分布 |
 * |   speed  | 时间或帧数 |      速度      |    -   |       -      | 速度分布 |
 * | tranProg |  传输耗时  | 文件尺寸百分比 |    -   |       -      | 传输进度 |
 * | tranSped |  文件尺寸  |      速度      |    -   |       -      |传输速度分布|
 */
export function showProgressInfo(task: UITask, taskId: number, type: ChartType) {
	Msgbox({
		container: document.body,
		title: task.fileBaseName,
		content: <Comp taskId={taskId} type={type} />,
		buttons: [
			{ text: '关闭', role: 'cancel' },
		]
	});
}

interface P {
	taskId: number;
	type: ChartType;
}
const Comp = defineComponent((props: P) => {
	const appStore = useAppStore();
	const server = appStore.currentServer;
	const task = server.data.tasks[props.taskId];

	const canvasRef = ref<HTMLCanvasElement>();

	const type = ref<typeof props.type>(props.type);
	const totalTime_smooth = ref(10);	// 预计转码总耗时
	const totalSize_smooth = ref(1000);	// 以字节为单位的预计输出大小
	const totalTransferTime_smooth = ref(10);	// 预计传输总耗时
	const refreshTimer = ref(0);
	const resizeListener = ref<EventListener>();

	const outputDuration = computed(() => getOutputDuration(task));
	const isDark = computed(() => appStore.frontendSettings.colorTheme === 'themeDark');
	const selectionList = computed(() => {
		const disableNormalChart = task.progressLog.time.length <= 1;
		const disableTransferChart = task.transferProgressLog.transferred.length <= 1;
		return [
			{ value: 'progress', caption: '进度', disabled: disableNormalChart },
			{ value: 'size', caption: '数据量', disabled: disableNormalChart },
			{ value: 'bitrate', caption: '码率分布', disabled: disableNormalChart },
			{ value: 'speed', caption: '速度分布', disabled: disableNormalChart },
			...(appStore.currentServer.entity.ip !== 'localhost' ? [
				{ value: 'transferProgress', caption: '传输进度', disabled: disableTransferChart },
				{ value: 'transferSpeed', caption: '传输速度分布', disabled: disableTransferChart },
			] : []),
		] as RadioListProps['list']
	});
	/** [转码时间, 媒体时间, 尺寸] */
	const dedupProgressLogSize = computed(() => {
		const progressLog = task.progressLog;
		if (!progressLog.size.length) {
			return [];
		}
		const ret: [number, number, number][] = [[progressLog.size[0][0], progressLog.time[0][1], progressLog.size[0][1]]];
		let lastSize = progressLog.size[0][1];
		for (let i = 1; i < progressLog.size.length; i++) {
			if (progressLog.size[i][1] !== lastSize) {
				lastSize = progressLog.size[i][1];
				ret.push([progressLog.size[i][0], progressLog.time[i][1], lastSize]);
			}
		}
		return ret;
	});
	/**
	 * y 为 dedupProgressLogSize[][2] 两点之间的 diff，x 为 dedupProgressLogSize[][1] 两点的中间值
	 * 单位为 kb/s
	 */
	const bitrateGraphData = computed(() => {
		const data: [number, number][] = [];
		const logSize = dedupProgressLogSize.value;
		let maxYDiff = 0;
		for (let i = 1; i < logSize.length; i++) {
			const xDiff = logSize[i][1] - logSize[i - 1][1] || Infinity;	// 两记录点之间的媒体时间差（特殊情况下可能为 0，此时数据不准确，故使 y = 0）
			const yDiff = (logSize[i][2] - logSize[i - 1][2]) / xDiff;
			maxYDiff = yDiff > maxYDiff ? yDiff : maxYDiff;
			const xMid = (logSize[i][1] + logSize[i - 1][1]) / 2;
			data.push([xMid, yDiff * 8]);
		}
		return { data, maxY: maxYDiff * 8 };
	});
	/** y 为 / progressLog.time[][0] 两点之间的 diff（转码这么多花费了多少实际时间，倒数就是速度），x 为 progressLog.time[][1] 两点的中间值 */
	const speedGraphData = computed(() => {
		const data: [number, number][] = [];
		const logTime = task.progressLog.time;
		let maxYDiff = 0;
		for (let i = 1; i < logTime.length; i++) {
			const xDiff = logTime[i][1] - logTime[i - 1][1];	// 两记录点之间的媒体时间差
			const yDiff = xDiff / (logTime[i][0] - logTime[i - 1][0]);
			maxYDiff = yDiff > maxYDiff ? yDiff : maxYDiff;
			const xMid = (logTime[i][1] + logTime[i - 1][1]) / 2;
			data.push([xMid, yDiff]);
		}
		return { data, maxY: maxYDiff };
	});
	/** y 为 / transferProgressLog.transferred[][0] 两点之间的 diff（传输这么多花费了多少实际时间，倒数就是速度），x 为 progressLog.transferred[][1] 两点的中间值 */
	const transferSpeedGraphData = computed(() => {
		const data: [number, number][] = [];
		const logTransferred = task.transferProgressLog.transferred;
		let maxYDiff = 0;
		for (let i = 1; i < logTransferred.length; i++) {
			const xDiff = logTransferred[i][1] - logTransferred[i - 1][1];	// 两记录点之间的数据量差
			const yDiff = xDiff / (logTransferred[i][0] - logTransferred[i - 1][0]);
			maxYDiff = yDiff > maxYDiff ? yDiff : maxYDiff;
			const xMid = (logTransferred[i][1] + logTransferred[i - 1][1]) / 2;
			data.push([xMid, yDiff]);
		}
		return { data, maxY: maxYDiff };
	});

	// #region 字符串 filter

	const graphSizeFilter = (kB: number) => {
		const B = kB * 1000;
		if (window.frontendSettings.useIEC) {
			if (B >= 10 * 1024 ** 3) {
				return (B / 1024 ** 3).toFixed(1) + ' GiB';
			} else if (B >= 1024 ** 3) {
				return (B / 1024 ** 3).toFixed(2) + ' GiB';
			} else if (B >= 100 * 1024 ** 2) {
				return (B / 1024 ** 2).toFixed(0) + ' MiB';
			} else if (B >= 10 * 1024 ** 2) {
				return (B / 1024 ** 2).toFixed(1) + ' MiB';
			} else {
				return (B / 1024 ** 2).toFixed(2) + ' MiB';
			}
		} else {
			if (B >= 10 * 1000 ** 3) {
				return (B / 1000 ** 3).toFixed(1) + ' GB';
			} else if (B >= 1000 ** 3) {
				return (B / 1000 ** 3).toFixed(2) + ' GB';
			} else if (B >= 100 * 1000 ** 2) {
				return (B / 1000 ** 2).toFixed(0) + ' MB';
			} else if (B >= 10 * 1000 ** 2) {
				return (B / 1000 ** 2).toFixed(1) + ' MB';
			} else {
				return (B / 1000 ** 2).toFixed(2) + ' MB';
			}
		}
	};
	const beforeBitrateFilter = (kbps: number) => {
		if (isNaN(kbps)) {
			return '读取中';
		} else {
			const bps = kbps * 1000;
			if (window.frontendSettings.useIEC) {
				if (bps >= 10 * 1024 ** 2) {
					return (bps / 1024 ** 2).toFixed(1) + ' Mibps';
				} else {
					return (bps / 1024).toFixed(0) + ' kibps';
				}
			} else {
				if (bps >= 10 * 1000 ** 2) {
					return (bps / 1000 ** 2).toFixed(1) + ' Mbps';
				} else {
					return (bps / 1000).toFixed(0) + ' kbps';
				}
			}
		}
	};
	const transferrateFilter = (Bps: number) => {
		if (window.frontendSettings.useIEC) {
			if (Bps >= 10 * 1024 ** 2) {
				return (Bps / 1024 ** 2).toFixed(1) + ' MiBps';
			} else {
				return (Bps / 1024).toFixed(0) + ' kiBps';
			}
		} else {
			if (Bps >= 10 * 1000 ** 2) {
				return (Bps / 1000 ** 2).toFixed(1) + ' MBps';
			} else {
				return (Bps / 1000).toFixed(0) + ' kBps';
			}
		}
	}
	const timeFilter = (value: number, withDecimal = true) => {
		let left = value;
		let hour = Math.floor(left / 3600); left -= hour * 3600;
		let minute = Math.floor(left / 60); left -= minute * 60;
		let second = left;
		if (hour) {
			return `${hour}:${minute.toString().padStart(2, '0')}:${second.toFixed(0).toString().padStart(2, '0')}`;
		} else if (minute) {
			return `${minute}:${withDecimal ? second.toFixed(1).padStart(4, '0') : second.toFixed(0).padStart(2, '0')}`;
		} else {
			return withDecimal ? second.toFixed(2) : `${second.toFixed(0)} s`;
		}
	};

	// #endregion

	const getLastSpeedBitrate = () => {
		const progressLog = task.progressLog;
		const { K: frameK, B: frameB, currentValue: currentFrame } = calcDashboard(progressLog.frame.slice(-5), 0);
		const { K: timeK, B: timeB, currentValue: currentTime } = calcDashboard(progressLog.time.slice(-5), 0);
		const { K: sizeK, B: sizeB, currentValue: currentSize } = calcDashboard(dedupProgressLogSize.value.slice(-5).map((value) => [value[1], value[2]]), 0);
		const afterFramerate = task.after.video.framerate === '不改变' ? task.before.vframerate : +task.after.video.framerate;
		return {
			speed: frameK / afterFramerate || timeK,	// 媒体时间相对真实时间。如果可以读出帧速，或者输出的是视频，用帧速算 speed 更准确；否则用时间算 speed
			bitrate: sizeK * 8,	// 尺寸变化相对媒体时间
		}
	};
	const getLastTransferBitrate = () => {
		const { K: transferredK, B: transferredB, currentValue: currentTransferred } = calcDashboard(task.transferProgressLog.transferred.slice(-5), 0);
		return {
			transferBitrate: transferredK,	// 传输尺寸变化相对真实时间
		}
	};
	/** 最大时间/尺寸的计算方法是：现在已经累积的转码时长/输出尺寸 + 根据最新速度和剩余任务时长算出的预计增量 */
	const getEstimatedMaxTimeSize = () => {
		const lastSpeedBitrate = getLastSpeedBitrate();
		const { progressLog } = task;
		const elapsedTime = progressLog.elapsed + (task.status === TaskStatus.TASK_RUNNING ? new Date().getTime() / 1000 - progressLog.lastStarted : 0);
		// 任务最新进度的时间和大小
		const currentTime = progressLog.time.length > 0 ? progressLog.time[progressLog.time.length - 1][1] : 0;
		const currentSize = progressLog.size.length > 0 ? progressLog.size[progressLog.size.length - 1][1] : 0;
		return {
			time: elapsedTime + (outputDuration.value - currentTime) / lastSpeedBitrate.speed,
			size: currentSize + (outputDuration.value - currentTime) * lastSpeedBitrate.bitrate * 0.125,	// size 的单位是 kB，bitrate 的单位是 kbps
		};
	};
	const getEstimatedMaxTransferTime = () => {
		const lastTransferBitrate = getLastTransferBitrate();
		const { transferProgressLog } = task;
		const elapsedTransferTime = transferProgressLog.elapsed + (new Date().getTime() / 1000 - transferProgressLog.lastStarted);
		const currentTransferred = transferProgressLog.transferred.length > 0 ? transferProgressLog.transferred[transferProgressLog.transferred.length - 1][1] : 0;
		return {
			transferTime: elapsedTransferTime + (transferProgressLog.total - currentTransferred) / lastTransferBitrate.transferBitrate,
		};
	}

	// 获取刻度线间隔
	const getScaleUnit = (total: number, viewWidth: number, isClockUnit = false, threshold = 100, min = 1) => {
		if (total <= 0) {
			return min;
		}
		let currentScale = min;
		let step = 0;
		while (viewWidth / (total / currentScale) < threshold) {	// 如果按当前 scale 分割后产出的刻度线间隔不足阈值，那么降低密度
			if (isClockUnit) {
				currentScale *= [2, 2.5, 2, 1.5, 2, 2][step % 6];	// 1 2 5 10 15 30 60
			} else {
				currentScale *= [2, 2.5, 2][step % 3];	// 1 2 5 10
			}
			step++;
		}
		return currentScale;
	};

	const render = () => {
		// 更新横纵轴端点
		if (task.transferStatus === TransferStatus.normal && task.progressLog.frame.length >= 5 && task.progressLog.size.length >= 2) {
			const latestMaxTimeSize = getEstimatedMaxTimeSize();
			totalTime_smooth.value = totalTime_smooth.value * 0.92 + latestMaxTimeSize.time * 0.08;
			totalSize_smooth.value = totalSize_smooth.value * 0.92 + latestMaxTimeSize.size * 0.08;
		}
		if (task.transferStatus !== TransferStatus.normal && task.transferProgressLog.transferred.length >= 5) {
			const latestMaxTransferTime = getEstimatedMaxTransferTime();
			totalTransferTime_smooth.value = totalTransferTime_smooth.value * 0.92 + latestMaxTransferTime.transferTime * 0.08;
		}
		
		// 绘画准备
		const canvasWidth = canvasRef.value.width / window.devicePixelRatio;
		const canvasHeight = canvasRef.value.height / window.devicePixelRatio;
		const horizontalMax = [totalTime_smooth.value, outputDuration.value, outputDuration.value, outputDuration.value, totalTransferTime_smooth.value, task.transferProgressLog.total][
			['progress', 'size', 'bitrate', 'speed', 'transferProgress', 'transferSpeed'].indexOf(type.value)
		];
		const horizontalUnit = getScaleUnit(horizontalMax, canvasWidth, type.value !== 'transferSpeed', 80);
		const verticalMax = [100, totalSize_smooth.value, bitrateGraphData.value.maxY, speedGraphData.value.maxY, 100, transferSpeedGraphData.value.maxY][
			['progress', 'size', 'bitrate', 'speed', 'transferProgress', 'transferSpeed'].indexOf(type.value)
		];
		const verticalUnit = getScaleUnit(verticalMax, canvasHeight, false, 50, type.value === 'speed' ? 0.1 : 1);

		const context = canvasRef.value.getContext('2d');
		context.clearRect(0, 0, canvasWidth, canvasHeight);

		// 横坐标和刻度线
		context.strokeStyle = '#77777777'; // 线颜色
		context.lineWidth = 1;
		context.textAlign = 'center';
		context.textBaseline = 'top';
		context.fillStyle = isDark.value ? '#eee' : '#333'; // 字体颜色
		context.font = '16px 华文中宋 black';
		for (let value = 0; value < horizontalMax; value += horizontalUnit) {
			const x = (value / horizontalMax) * (canvasWidth - 100) + 100;
			context.beginPath();
			context.moveTo(x, 0);
			context.lineTo(x, canvasHeight - 30);
			context.stroke();
			context.fillText(type.value === 'transferSpeed' ? graphSizeFilter(value / 1000) : timeFilter(value, false), x, canvasHeight - 30 + 8);
		}

		// 纵坐标
		context.textAlign = 'right';
		context.textBaseline = 'middle';
		context.fillStyle = isDark.value ? '#eee' : '#333'; // 字体颜色
		context.font = '16px 华文中宋 black';
		for (let value = 0; value < verticalMax; value += verticalUnit) {
			const y = (1 - value / verticalMax) * (canvasHeight - 30);
			const displayText = [value + '%', graphSizeFilter(value), beforeBitrateFilter(value), value.toFixed(1) + '×', value + '%', transferrateFilter(value)][
				['progress', 'size', 'bitrate', 'speed', 'transferProgress', 'transferSpeed'].indexOf(type.value)
			];
			context.fillText(displayText, 100 - 8, y);
		}

		// 点
		context.lineWidth = 1.5;
		if (type.value === 'progress') {
			context.fillStyle = '#4499EE33';
			context.strokeStyle = '#4499EE';
			context.beginPath();
			for (let i = 0; i < task.progressLog.time.length; i++) {
				const elem = task.progressLog.time[i];
				const x = (elem[0] / horizontalMax) * (canvasWidth - 100) + 100;
				const y = (1 - elem[1] / outputDuration.value) * (canvasHeight - 30);
				context.lineTo(x, y);
			}
			context.stroke();
			const lastX = task.progressLog.time[task.progressLog.time.length - 1][0] / horizontalMax * (canvasWidth - 100) + 100;
			context.lineTo(lastX, canvasHeight - 30);
			context.lineTo(100, canvasHeight - 30);
			context.fill();
		} else if (type.value === 'size') {
			context.fillStyle = '#9955EE33';
			context.strokeStyle = '#9955EE';
			context.beginPath();
			const logSize = dedupProgressLogSize.value;
			for (let i = 0; i < logSize.length; i++) {
				const elem = logSize[i];
				const x = (elem[1] / horizontalMax) * (canvasWidth - 100) + 100;
				const y = (1 - elem[2] / verticalMax) * (canvasHeight - 30);
				context.lineTo(x, y);
			}
			context.stroke();
			const lastX = logSize[logSize.length - 1][1] / horizontalMax * (canvasWidth - 100) + 100;
			context.lineTo(lastX, canvasHeight - 30);
			context.lineTo(100, canvasHeight - 30);
			context.fill();
		} else if (type.value === 'bitrate') {
			context.fillStyle = '#66BB3333';
			context.strokeStyle = '#66BB33';
			context.beginPath();
			const data = bitrateGraphData.value.data;
			for (let i = 0; i < data.length; i++) {
				const elem = data[i];
				const x = (elem[0] / horizontalMax) * (canvasWidth - 100) + 100;
				const y = (1 - elem[1] / verticalMax) * (canvasHeight - 30);
				context.lineTo(x, y);
			}
			context.stroke();
			const lastX = data[data.length - 1][0] / horizontalMax * (canvasWidth - 100) + 100;
			const firstX = data[0][0] / horizontalMax * (canvasWidth - 100) + 100;
			context.lineTo(lastX, canvasHeight - 30);
			context.lineTo(firstX, canvasHeight - 30);
			context.fill();
		} else if (type.value === 'speed') {
			context.fillStyle = '#DD884433';
			context.strokeStyle = '#DD8844';
			context.beginPath();
			const data = speedGraphData.value.data;
			for (let i = 0; i < data.length; i++) {
				const elem = data[i];
				const x = (elem[0] / horizontalMax) * (canvasWidth - 100) + 100;
				const y = (1 - elem[1] / verticalMax) * (canvasHeight - 30);
				if (i === 0) {
					context.moveTo(x, y);
				} else {
					context.lineTo(x, y);
				}
				context.lineTo(x, y);
			}
			context.stroke();
			const lastX = data[data.length - 1][0] / horizontalMax * (canvasWidth - 100) + 100;
			const firstX = data[0][0] / horizontalMax * (canvasWidth - 100) + 100;
			context.lineTo(lastX, canvasHeight - 30);
			context.lineTo(firstX, canvasHeight - 30);
			context.fill();
		} else if (type.value === 'transferProgress') {
			context.fillStyle = '#4499EE33';
			context.strokeStyle = '#4499EE';
			context.beginPath();
			for (let i = 0; i < task.transferProgressLog.transferred.length; i++) {
				const elem = task.transferProgressLog.transferred[i];
				const x = (elem[0] / horizontalMax) * (canvasWidth - 100) + 100;
				const y = (1 - elem[1] / task.transferProgressLog.total) * (canvasHeight - 30);
				context.lineTo(x, y);
			}
			context.stroke();
			const lastX = task.transferProgressLog.transferred[task.transferProgressLog.transferred.length - 1][0] / horizontalMax * (canvasWidth - 100) + 100;
			context.lineTo(lastX, canvasHeight - 30);
			context.lineTo(100, canvasHeight - 30);
			context.fill();
		} else if (type.value === 'transferSpeed') {
			context.fillStyle = '#DD884433';
			context.strokeStyle = '#DD8844';
			context.beginPath();
			const data = transferSpeedGraphData.value.data;
			for (let i = 0; i < data.length; i++) {
				const elem = data[i];
				const x = (elem[0] / horizontalMax) * (canvasWidth - 100) + 100;
				const y = (1 - elem[1] / verticalMax) * (canvasHeight - 30);
				if (i === 0) {
					context.moveTo(x, y);
				} else {
					context.lineTo(x, y);
				}
				context.lineTo(x, y);
			}
			context.stroke();
			const lastX = data[data.length - 1][0] / horizontalMax * (canvasWidth - 100) + 100;
			const firstX = data[0][0] / horizontalMax * (canvasWidth - 100) + 100;
			context.lineTo(lastX, canvasHeight - 30);
			context.lineTo(firstX, canvasHeight - 30);
			context.fill();
		}
	};

	onMounted(() => {
		// 如果打开弹窗时已经有足够数据，那么马上算一下预计转码耗时，否则保持 10s、1000B 的初始大小
		if (task.progressLog.frame.length >= 5 && task.progressLog.size.length >= 2) {
			const latestMaxTimeSize = getEstimatedMaxTimeSize();
			totalTime_smooth.value = latestMaxTimeSize.time;
			totalSize_smooth.value = latestMaxTimeSize.size;
		}
		if (task.transferProgressLog.transferred.length >= 5) {
			const latestMaxTransferTime = getEstimatedMaxTransferTime();
			totalTransferTime_smooth.value = latestMaxTransferTime.transferTime;
		}

		// 窗口大小变化监听
		resizeListener.value = () => {
			const bounding = canvasRef.value.parentElement.getBoundingClientRect();
			canvasRef.value.width = bounding.width * window.devicePixelRatio;
			canvasRef.value.height = bounding.height * window.devicePixelRatio;
			canvasRef.value.getContext('2d').scale(window.devicePixelRatio, window.devicePixelRatio);
		};
		window.addEventListener('resize', resizeListener.value);
		resizeListener.value(null);

		// 刷新
		refreshTimer.value = setInterval(render, 50) as any;
	});

	onUnmounted(() => {
		clearInterval(refreshTimer.value);
		window.removeEventListener('resize', resizeListener.value);
	});

	return () => (
		<div class={style.container}>
			{/* {task.dashboard_smooth.progress}<br />
			{totalTime_smooth.value}<br />
			{task.progressLog.elapsed}__{task.progressLog.lastPaused}__{task.progressLog.lastStarted}__<br /> */}
			<div class={style.canvasContainer}>
				<canvas ref={canvasRef} />
			</div>
			<RadioList class={style.radioList} list={selectionList.value} value={type.value} onChange={(value: any) => type.value = value} />
		</div>
	);
}, { props: ['taskId', 'type'] });
